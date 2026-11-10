const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const H = require('../../scripts/history/core.js');
const { conversation, zip } = require('./fixtures.cjs');
const url = 'https://exports.deepseek.com/download?signature=not-persisted';
const sender = (id = 2) => ({ id: 'extension-id', tab: { id }, frameId: 0, url: 'https://chat.deepseek.com/' });
const tick = () => new Promise(resolve => setImmediate(resolve));
function harness({ failFetch = false, failStore = false, downloadsGranted = true, hostGranted = true,
    exposeDownloads = true, acceptPermission = true, session = {}, local = {}, invalidZip = false, beforeFetch } = {}) {
    const listeners = {}, calls = [], records = new Map(), permissionRequests = [], debugEntries = [];
    const origins = new Set(hostGranted ? [new URL(url).origin + '/*'] : []);
    let hasDownloads = downloadsGranted, archive = { conversations: ['previous'] };
    const event = key => ({ addListener: f => { listeners[key] = f; }, removeListener: f => { if (listeners[key] === f) delete listeners[key]; } });
    const storage = data => ({ set: async value => Object.assign(data, JSON.parse(JSON.stringify(value))), get: async key => ({ [key]: data[key] }) });
    const downloads = { onCreated: event('created'), onChanged: event('changed'), search: async ({ id }) => records.has(id) ? [records.get(id)] : [] };
    const context = {
        DeepShareHistory: { ...H, createDiagnostics: () => Object.assign((...entry) => debugEntries.push(entry), { runId: 'test-worker' }) }, AbortSignal, URL, TextEncoder, setTimeout, clearTimeout, setInterval, clearInterval, crypto: require('node:crypto').webcrypto,
        DeepShareHistoryStore: {
            read: async () => archive,
            write: async value => { if (failStore) throw Error('quota'); archive = value; }, clear: async () => { archive = null; }
        },
        fetch: async (value, options) => {
            calls.push({ url: value, options });
            if (value.startsWith('chrome-extension://extension-id/_locales/')) {
                return new Response(fs.readFileSync(value.replace('chrome-extension://extension-id/', ''), 'utf8'));
            }
            if (beforeFetch) await beforeFetch();
            if (failFetch) throw Error('offline');
            return new Response(invalidZip ? 'not an archive' : zip(JSON.stringify([conversation()]), 8));
        },
        chrome: {
            downloads: exposeDownloads ? downloads : undefined,
            permissions: {
                contains: async value => (!value.permissions?.includes('downloads') || hasDownloads) && (value.origins || []).every(origin => origins.has(origin)),
                request: value => {
                    permissionRequests.push(JSON.parse(JSON.stringify(value)));
                    if (acceptPermission) {
                        if (value.permissions?.includes('downloads')) { hasDownloads = true; context.chrome.downloads = downloads; }
                        for (const origin of value.origins || []) origins.add(origin);
                        listeners.added();
                    }
                    return Promise.resolve(acceptPermission);
                },
                remove: async value => {
                    if (value.permissions?.includes('downloads')) { hasDownloads = false; context.chrome.downloads = undefined; }
                    for (const origin of value.origins || []) origins.delete(origin);
                    listeners.removed(); return true;
                },
                onAdded: event('added'), onRemoved: event('removed')
            },
            storage: { local: storage(local), session: storage(session) },
            runtime: { id: 'extension-id', getURL: path => 'chrome-extension://extension-id/' + path, getManifest: () => ({ host_permissions: ['https://chat.deepseek.com/*'] }), onMessage: event('message') }
        }
    };
    vm.runInNewContext(fs.readFileSync('scripts/history/permissions.js', 'utf8'), context);
    vm.runInNewContext(fs.readFileSync('scripts/history/background.js', 'utf8'), context);
    const message = (action, from = sender()) => new Promise(resolve => listeners.message(typeof action === 'string' ? { action } : action, from, resolve));
    const item = (overrides = {}) => ({ id: 1, url, referrer: 'https://chat.deepseek.com/', startTime: new Date().toISOString(), state: 'complete', incognito: false, ...overrides });
    const download = async overrides => {
        const value = item(overrides); records.set(value.id, value);
        await listeners.changed?.({ id: value.id, state: { current: value.state } }); return value;
    };
    const settle = async () => { for (let i = 0; i < 60 && !['ready', 'error'].includes(local.deepShareHistoryStatus?.state); i++) await new Promise(resolve => setTimeout(resolve, 5)); };
    return { context, listeners, local, session, calls, records, permissionRequests, debugEntries, message, item, download, settle,
        arm: from => message('history:capture:arm', from), archive: () => archive, origins };
}
test('correlates official export click, validates archive and deduplicates events without persisting signed URLs', async () => {
    const h = harness(); await h.arm(); const value = await h.download();
    assert.equal(h.archive().conversations.length, 1);
    await h.download(value);
    assert.equal(h.calls.length, 1);
    assert.equal(h.calls[0].options.redirect, 'error');
    assert.equal(h.calls[0].options.credentials, 'omit');
    assert.doesNotMatch(JSON.stringify([h.local, h.session]), /signature/);
    assert.equal((await readArchive(h)).conversations.length, 1);
});
for (const mode of ['failFetch', 'failStore', 'invalidZip']) test(`${mode} preserves the previous archive`, async () => {
    const h = harness({ [mode]: true }); await h.arm(); await h.download();
    assert.equal(h.local.deepShareHistoryStatus.state, 'error');
    assert.deepEqual(h.archive().conversations, ['previous']);
});
async function startImport(h, text) {
    const begin = await h.message({ action: 'history:import:start', length: text.length });
    assert.equal(begin.ok, true);
    for (let offset = 0; offset < text.length; offset += 262144) {
        assert.equal((await h.message({ action: 'history:import:chunk', id: begin.id, offset, chunk: text.slice(offset, offset + 262144) })).ok, true);
    }
    return begin.id;
}
function readArchive(h, from = sender()) {
    return H.readArchive(async (action, payload) => {
        const result = await h.message({ action, ...payload }, from);
        if (!result.ok) throw new Error(result.error);
        return result;
    });
}
test('local import assembles bounded chunks and preserves the official conversation data', async () => {
    const h = harness({ downloadsGranted: false, hostGranted: false, exposeDownloads: false }), c = conversation('local');
    c.mapping.question.message.fragments[0].content = '中文😀'.repeat(100000);
    const id = await startImport(h, JSON.stringify([c]));
    assert.deepEqual(h.archive().conversations, ['previous']);
    const result = await h.message({ action: 'history:import:finish', id });
    assert.equal(result.ok, true); assert.equal(result.count, 1);
    assert.equal(h.archive().conversations[0].title, '示例 local');
    assert.equal(H.selectedMessages(h.archive().conversations[0])[0].content, c.mapping.question.message.fragments[0].content);
    assert.equal(h.calls.length, 0);
});
test('invalid and interrupted local imports leave the old library untouched', async () => {
    const h = harness();
    let id = await startImport(h, '{invalid json');
    assert.equal((await h.message({ action: 'history:import:finish', id })).ok, false);
    ({ id } = await h.message({ action: 'history:import:start', length: 10 }));
    assert.equal((await h.message({ action: 'history:import:finish', id })).ok, false);
    ({ id } = await h.message({ action: 'history:import:start', length: 10 }));
    await h.message({ action: 'history:import:cancel', id });
    assert.equal((await h.message({ action: 'history:import:finish', id })).ok, false);
    for (const length of [64 * 1024 * 1024 + 1, 256 * 1024 * 1024]) {
        const begin = await h.message({ action: 'history:import:start', length });
        assert.equal(begin.ok, true);
        await h.message({ action: 'history:import:cancel', id: begin.id });
    }
    assert.equal((await h.message({ action: 'history:import:start', length: 256 * 1024 * 1024 + 1 })).ok, false);
    assert.equal((await h.message({ action: 'history:import:start', length: H.MAX_BYTES + 1 })).ok, false);
    assert.deepEqual(h.archive().conversations, ['previous']);
});
test('local import validates owner, ordering and storage failures', async () => {
    const h = harness({ failStore: true }), text = JSON.stringify([conversation()]);
    const id = await startImport(h, text);
    const other = { id: 'extension-id', tab: { id: 3 }, url: 'https://chat.deepseek.com/' };
    assert.equal((await h.message({ action: 'history:import:finish', id }, other)).ok, false);
    assert.equal((await h.message({ action: 'history:import:finish', id })).ok, false);
    const next = await h.message({ action: 'history:import:start', length: text.length });
    assert.equal((await h.message({ action: 'history:import:chunk', id: next.id, offset: 1, chunk: text })).ok, false);
    assert.deepEqual(h.archive().conversations, ['previous']);
});


test('ungranted downloads API does not break reading or clearing the library', async () => {
    const h = harness({ downloadsGranted: false, hostGranted: false, exposeDownloads: false });
    assert.equal((await h.message('history:capture:status')).enabled, false);
    assert.deepEqual((await readArchive(h)).conversations, ['previous']);
    assert.equal(h.listeners.created, undefined);
    await h.message('history:clear'); assert.equal(h.archive(), null);
});
test('downloads permission request is synchronous and does not request every website', async () => {
    const h = harness({ downloadsGranted: false, hostGranted: false, exposeDownloads: false });
    const response = h.message('history:capture:request');
    assert.deepEqual(h.permissionRequests, [{ permissions: ['downloads'] }]);
    assert.equal((await response).enabled, true);
    assert.equal(typeof h.listeners.created, 'function');
});
test('new extensionless download domain is discovered, then only its exact origin is requested', async () => {
    const h = harness({ hostGranted: false }); await h.arm();
    const value = await h.download({ finalUrl: 'https://new-cdn.deepseek.com/export/123?token=private' });
    assert.equal(h.calls.length, 0);
    const pending = (await h.message('history:capture:status')).pending;
    assert.equal(pending.origin, 'https://new-cdn.deepseek.com');
    const response = h.message({ action: 'history:capture:authorize', ...pending });
    assert.deepEqual(h.permissionRequests[0], { origins: ['https://new-cdn.deepseek.com/*'] });
    assert.equal((await response).granted, true); await h.settle();
    assert.equal(h.calls[0].url, value.finalUrl);
    assert.equal(h.archive().conversations.length, 1);
    assert.doesNotMatch(JSON.stringify([h.local, h.session]), /token=|signature/);
});
test('refusal keeps the candidate retryable and preserves manual import', async () => {
    const h = harness({ hostGranted: false, acceptPermission: false }); await h.arm(); await h.download();
    const pending = (await h.message('history:capture:status')).pending;
    assert.equal((await h.message({ action: 'history:capture:authorize', ...pending })).granted, false);
    assert.equal(h.calls.length, 0); assert.deepEqual(h.archive().conversations, ['previous']);
    assert.equal((await h.message('history:capture:status')).pending.id, 1);
    const id = await startImport(h, JSON.stringify([conversation()]));
    assert.equal((await h.message({ action: 'history:import:finish', id })).ok, true);
});
test('unrelated downloads are ignored even if they use a previously authorized domain', async () => {
    const h = harness(); await h.download(); assert.equal(h.calls.length, 0);
    await h.arm();
    for (const overrides of [{ referrer: '' }, { referrer: 'https://other.example.com/' }, { referrer: 'https://chat.deepseek.com.evil.com/' }, { byExtensionId: 'other' }, { incognito: true }, { startTime: new Date(Date.now() - 60000).toISOString() }]) {
        await h.download(overrides);
    }
    assert.equal(h.calls.length, 0);
    await h.download(); assert.equal(h.calls.length, 1);
});
test('ambiguous simultaneous export clicks do not select an arbitrary tab', async () => {
    const h = harness(); await h.arm(sender(2)); await h.arm(sender(3)); await h.download();
    assert.equal(h.calls.length, 0);
    assert.equal((await h.message('history:capture:status')).pending, null);
});
test('final redirect destination is authorized, never the original host as a fallback', async () => {
    const h = harness(); await h.arm();
    await h.download({ finalUrl: 'https://another-cdn.deepseek.com/file' });
    assert.equal(h.calls.length, 0);
    assert.equal((await h.message('history:capture:status')).pending.origin, 'https://another-cdn.deepseek.com');
});
test('unsafe final URLs and interrupted downloads never read remote data', async () => {
    for (const overrides of [{ finalUrl: 'http://exports.deepseek.com/file' }, { finalUrl: 'https://127.0.0.1/file' }, { finalUrl: 'blob:https://chat.deepseek.com/uuid' }, { state: 'interrupted' }]) {
        const h = harness(); await h.arm(); await h.download(overrides);
        assert.equal(h.calls.length, 0); assert.deepEqual(h.archive().conversations, ['previous']);
    }
});
test('permission messages cannot substitute a domain, download, tab, frame or untrusted sender', async () => {
    const h = harness({ hostGranted: false }); await h.arm(); await h.download();
    const pending = (await h.message('history:capture:status')).pending;
    const action = { action: 'history:capture:authorize', ...pending };
    for (const [message, from] of [
        [{ ...action, origin: 'https://evil.com' }, sender()],
        [{ ...action, id: 999 }, sender()], [action, sender(3)],
        [action, { ...sender(), frameId: 1 }], [action, { ...sender(), url: 'https://evil.com' }]
    ]) assert.equal((await h.message(message, from)).ok, false);
    assert.equal(h.permissionRequests.length, 0);
});
test('pending downloads survive service-worker restart without storing signed URLs', async () => {
    const h = harness({ hostGranted: false }); await h.arm(); const value = await h.download();
    const restarted = harness({ hostGranted: false, session: h.session, local: h.local });
    restarted.records.set(1, value);
    const pending = (await restarted.message('history:capture:status')).pending;
    assert.equal(pending.id, 1);
    await restarted.message({ action: 'history:capture:authorize', ...pending }); await restarted.settle();
    assert.equal(restarted.archive().conversations.length, 1);
});
test('download association survives completion after worker restart', async () => {
    const h = harness({ hostGranted: false }); await h.arm(); const value = h.item({ state: 'in_progress' });
    h.records.set(1, value); h.listeners.created(value); await tick(); await tick();
    const restarted = harness({ hostGranted: false, session: h.session });
    await restarted.download({ ...value, state: 'complete' });
    assert.equal((await restarted.message('history:capture:status')).pending.id, 1);
});
test('a changed destination after authorization needs new consent before fetching', async () => {
    const h = harness({ hostGranted: false }); await h.arm(); const value = await h.download();
    const pending = (await h.message('history:capture:status')).pending;
    h.records.set(1, { ...value, finalUrl: 'https://third.deepseek.com/new-location' });
    await h.message({ action: 'history:capture:authorize', ...pending }); await tick(); await tick();
    assert.equal(h.calls.length, 0);
    assert.equal((await h.message('history:capture:status')).pending.origin, 'https://third.deepseek.com');
});
test('revoking capture cancels pending work and leaves the archive intact', async () => {
    const h = harness({ hostGranted: false }); await h.arm(); await h.download();
    await h.message('history:capture:revoke');
    assert.equal((await h.message('history:capture:status')).pending, null);
    assert.equal(h.listeners.created, undefined);
    assert.deepEqual(h.archive().conversations, ['previous']);
});
test('new host declaration remains optional; required permissions stay unchanged', () => {
    const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
    assert.deepEqual(manifest.permissions, ['activeTab', 'storage', 'scripting']);
    assert.deepEqual(manifest.optional_permissions, ['downloads']);
    assert.deepEqual(manifest.optional_host_permissions, ['https://*/*']);
    assert.equal(manifest.host_permissions.includes('https://*/*'), false);
});

for (const acceptPermission of [true, false]) test(`combined permission asks once for downloads and an exact origin (${acceptPermission ? 'allowed' : 'denied'})`, async () => {
    const h = harness({ downloadsGranted: false, hostGranted: false, exposeDownloads: false, acceptPermission });
    const response = h.message({ action: 'history:capture:request', origin: 'https://new-cdn.deepseek.com' });
    assert.deepEqual(h.permissionRequests, [{ permissions: ['downloads'], origins: ['https://new-cdn.deepseek.com/*'] }]);
    assert.equal((await response).enabled, acceptPermission);
    assert.equal(h.calls.length, 0); // A page-world hint cannot authorize an archive read.
    assert.deepEqual(h.archive().conversations, ['previous']);
    if (acceptPermission) {
        await h.arm(); await h.download({ finalUrl: 'https://new-cdn.deepseek.com/data?signature=private' });
        assert.equal(h.calls.length, 1);
        assert.equal((await h.message('history:capture:status')).pending, null);
        assert.equal(h.permissionRequests.length, 1);
    }
});
test('combined request rejects wildcard origins, paths, credentials and untrusted senders', async () => {
    const h = harness();
    for (const origin of ['https://*.example.com', 'https://example.com/path', 'https://example.com?secret=x', 'https://user:pass@example.com', 'http://example.com', 'https://127.0.0.1', '<all_urls>']) {
        assert.equal((await h.message({ action: 'history:capture:request', origin })).ok, false);
    }
    assert.equal((await h.message({ action: 'history:capture:request', origin: 'https://example.com' }, { ...sender(), url: 'https://evil.example.com' })).ok, false);
    assert.equal(h.permissionRequests.length, 0);
});
test('refusing a new origin keeps an already-granted downloads permission enabled', async () => {
    const h = harness({ acceptPermission: false, hostGranted: false });
    const response = await h.message({ action: 'history:capture:request', origin: 'https://new-cdn.deepseek.com' });
    assert.equal(response.enabled, true); assert.equal(response.granted, false);
    assert.equal(h.calls.length, 0);
});

test('locale catalogs are private, allowlisted and contain only history messages', async () => {
    const h = harness();
    const result = await h.message({ action: 'history:locale', locale: 'de' });
    assert.equal(result.ok, true);
    assert.equal(result.messages.historyTitle.message, 'Chatverlauf importieren');
    assert.equal(result.messages.extensionName, undefined);
    for (const locale of ['../../manifest', 'en/../../secret', 'xx']) {
        assert.equal((await h.message({ action: 'history:locale', locale })).ok, false);
    }
    assert.equal(h.calls.length, 1);
    assert.equal(h.permissionRequests.length, 0);
    assert.equal((await h.message({ action: 'history:locale', locale: 'en' }, { ...sender(), url: 'https://evil.example/' })).ok, false);
});

test('reads archives above 64 MiB through bounded replies without losing text', async () => {
    const h = harness();
    const text = 'X'.repeat(64 * 1024 * 1024) + '中文😀\n"\\';
    h.archive().conversations = [{ id: 'large', content: text }];
    let replies = 0;
    const archive = await H.readArchive(async (action, payload) => {
        const response = await h.message({ action, ...payload });
        assert.equal(response.ok, true);
        assert.ok(Buffer.byteLength(JSON.stringify(response)) < 2 * 1024 * 1024);
        replies++;
        return response;
    });
    assert.ok(replies > 256);
    assert.equal(archive.conversations[0].content, text);
});

test('read snapshots survive clearing, are document-owned and release after completion', async () => {
    const h = harness();
    h.archive().conversations = ['中文😀\n"\\'.repeat(100000)];
    const expected = JSON.stringify(h.archive());
    const first = await h.message('history:read', { ...sender(), documentId: 'one' });
    assert.equal(first.ok, true);
    const chunk = { action: 'history:read:chunk', id: first.id, offset: first.chunk.length };
    for (const from of [sender(3), { ...sender(), documentId: 'two' }]) {
        assert.equal((await h.message(chunk, from)).ok, false);
    }
    assert.equal((await h.message({ ...chunk, offset: 1 }, { ...sender(), documentId: 'one' })).ok, false);
    await h.message('history:clear');
    let initial = true;
    const actual = await H.readArchive(async (action, payload) => {
        if (initial) { initial = false; return first; }
        return h.message({ action, ...payload }, { ...sender(), documentId: 'one' });
    });
    assert.equal(JSON.stringify(actual), expected);
    assert.equal((await h.message(chunk, { ...sender(), documentId: 'one' })).ok, false);
    assert.equal(await readArchive(h), null);
});

test('closed readers cancel transfers; failed chunk reads preserve the original error', async () => {
    const h = harness();
    h.archive().conversations = ['X'.repeat(600000)];
    let first;
    const request = async (action, payload) => {
        const result = await h.message({ action, ...payload });
        if (action === 'history:read') first = result;
        if (!result.ok) throw Error(result.error);
        return result;
    };
    assert.equal(await H.readArchive(request, () => false), null);
    assert.equal((await h.message({ action: 'history:read:chunk', id: first.id, offset: first.chunk.length })).ok, false);
    await assert.rejects(H.readArchive(async (action, payload) => {
        if (action === 'history:read:chunk') throw Error('worker disconnected');
        return request(action, payload);
    }), /worker disconnected/);
    assert.equal((await h.message({ action: 'history:read:chunk', id: first.id, offset: first.chunk.length })).ok, false);
});

test('bounds concurrent snapshots and permits retry after cancellation', async () => {
    const h = harness(); h.archive().conversations = ['X'.repeat(600000)];
    const readers = [];
    for (let i = 1; i <= 4; i++) readers.push(await h.message('history:read', sender(i)));
    assert.equal((await h.message('history:read', sender(5))).ok, false);
    await h.message({ action: 'history:read:cancel', id: readers[0].id }, sender(1));
    assert.equal((await h.message('history:read', sender(5))).ok, true);
    for (let i = 2; i <= 5; i++) {
        const read = await h.message('history:read', sender(i));
        await h.message({ action: 'history:read:cancel', id: read.id }, sender(i));
    }
});

test('response serialization failures are diagnosed and answered with a small fallback', async () => {
    const h = harness();
    let attempts = 0;
    const response = await new Promise(resolve => h.listeners.message({ action: 'history:read', debugRequestId: 'trace-123' }, sender(), value => {
        if (++attempts === 1) throw new TypeError('Message exceeded maximum allowed size of 64MiB.');
        resolve(value);
    }));
    assert.equal(response.ok, false);
    assert.equal(attempts, 2);
    const failure = h.debugEntries.find(([event]) => event === 'message.reply.failed');
    assert.equal(failure[1].requestId, 'trace-123');
    assert.equal(failure[1].action, 'history:read');
    assert.match(failure[2].message, /64MiB/);
});

test('only active imports keep the worker alive and always stop after success or failure', async () => {
    for (const fail of [false, true]) {
        const h = harness(); let callback, cleared = 0, probes = 0, finishWrite;
        h.context.setInterval = (fn, ms) => { assert.equal(ms, 20000); callback = fn; return 7; };
        h.context.clearInterval = id => { assert.equal(id, 7); cleared++; };
        h.context.chrome.runtime.getPlatformInfo = async () => { probes++; return {}; };
        h.context.DeepShareHistoryStore.write = () => new Promise((resolve, reject) => {
            finishWrite = () => fail ? reject(Error('quota')) : resolve();
        });
        const id = await startImport(h, JSON.stringify([conversation('active')]));
        assert.equal(callback, undefined);
        const pending = h.message({ action: 'history:import:finish', id });
        while (!finishWrite) await tick();
        await callback(); assert.equal(probes, 1);
        assert.equal(cleared, 0);
        finishWrite(); assert.equal((await pending).ok, !fail);
        assert.equal(cleared, 1);
    }
});

test('reading a legacy shared-path archive compacts it before serialization without modifying storage', async () => {
    const h = harness(), shared = Array.from({ length: 1000 }, (_, i) => 'message-' + i);
    const c = { id: 'legacy', messages: shared.map(id => ({ id, content: 'test' })), branches: Array.from({ length: 100 }, (_, i) => ({ id: 'leaf-' + i, date: '', messageIds: shared })) };
    h.archive().conversations = [c];
    const before = JSON.stringify(h.archive()).length;
    const result = await readArchive(h);
    assert.equal(result.conversations[0].branches.length, 100);
    assert.deepEqual(H.branchMessageIds(result.conversations[0]), shared);
    assert.ok(JSON.stringify(result).length < before / 10);
    assert.ok(Array.isArray(h.archive().conversations[0].branches[0].messageIds));
});
