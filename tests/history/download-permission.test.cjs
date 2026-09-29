const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// Run the real content script against a minimal official-export row. The
// download button dispatches click again, as HTMLElement.click() does in Chrome.
function page({ enabled = false, pending = null } = {}) {
    const events = {}, calls = [], messages = [];
    let resolvePermission, rejectPermission, downloads = 0;
    const dispatch = (target, isTrusted = true) => {
        const event = { target, isTrusted, prevented: false,
            preventDefault() { this.prevented = true; }, stopImmediatePropagation() {} };
        events.click(event);
        if (!event.prevented && target === download) downloads++;
        return event;
    };
    const download = {
        textContent: '下载', isConnected: true, disabled: false,
        getClientRects: () => [1], getAttribute: () => null, closest: () => null,
        contains: target => target === download,
        click: () => dispatch(download, false)
    };
    const row = { textContent: '导出所有历史对话 下载', querySelectorAll: () => [download] };
    const heading = { textContent: '导出所有历史对话', childElementCount: 0, parentElement: row, getClientRects: () => [1] };
    const context = {
        URL, DeepShareHistory: require('../../scripts/history/core.js'), navigator: { userActivation: { isActive: false } },
        document: { documentElement: {}, querySelectorAll: selector => selector === 'div,span,p,h3' ? [heading] : [] },
        window: { addEventListener: (type, listener) => { events[type] = listener; }, showToastNotification() {} },
        MutationObserver: class { observe() {} }, matchMedia: () => ({ addEventListener() {} }),
        chrome: {
            runtime: { sendMessage: message => {
                const { action } = message; messages.push(JSON.parse(JSON.stringify(message)));
                calls.push(action);
                if (action === 'history:capture:arm') return Promise.resolve({ ok: true });
                if (action === 'history:capture:status') return Promise.resolve({ ok: true, enabled, pending });
                if (action === 'history:capture:authorize') return new Promise(resolve => { resolvePermission = resolve; });
                if (action === 'history:capture:request') return new Promise((resolve, reject) => { resolvePermission = resolve; rejectPermission = reject; });
                throw Error(action);
            } },
            storage: { local: { get: async () => ({}) }, onChanged: { addListener() {} } }
        }
    };
    vm.runInNewContext(fs.readFileSync('scripts/history/content.js', 'utf8'), context);
    return { dispatch, download, calls, messages, source: (source, origin = 'https://chat.deepseek.com', sameWindow = true) => events.message({ source: sameWindow ? context.window : {}, origin, data: { type: 'deepshare:history-export-source', source } }), downloads: () => downloads,
        resolve: enabled => resolvePermission({ ok: true, enabled, granted: enabled }), reject: () => rejectPermission(Error('request failed')) };
}
const tick = () => new Promise(resolve => setImmediate(resolve));

for (const granted of [true, false]) test(`official download waits for authorization and resumes exactly once (${granted ? 'allowed' : 'denied'})`, async () => {
    const h = page(); await tick();
    assert.equal(h.calls.includes('history:capture:request'), false);
    assert.equal(h.dispatch(h.download).prevented, true);
    assert.equal(h.calls.at(-1), 'history:capture:request');
    assert.equal(h.downloads(), 0);
    h.dispatch(h.download); // Double clicks while the permission prompt is open.
    assert.equal(h.calls.filter(c => c === 'history:capture:request').length, 1);
    h.resolve(granted); await tick();
    assert.equal(h.downloads(), 1);
});
test('permission API errors still allow the official download', async () => {
    const h = page(); await tick(); h.dispatch(h.download);
    h.reject(); await tick(); assert.equal(h.downloads(), 1);
});
test('authorized downloads register the official click without another permission request', async () => {
    const h = page({ enabled: true }); await tick();
    assert.equal(h.dispatch(h.download).prevented, true);
    await tick();
    assert.equal(h.calls.includes('history:capture:arm'), true);
    assert.equal(h.downloads(), 1);
    assert.equal(h.calls.includes('history:capture:request'), false);
});
test('unrelated clicks and programmatic clicks cannot trigger permission prompts', async () => {
    const h = page(); await tick();
    h.dispatch({}); h.dispatch(h.download, false);
    assert.equal(h.calls.includes('history:capture:request'), false);
});
test('leaving the export row while awaiting authorization does not trigger a download', async () => {
    const h = page(); await tick(); h.dispatch(h.download);
    h.download.isConnected = false; h.resolve(true); await tick();
    assert.equal(h.downloads(), 0);
});

for (const granted of [true, false]) test(`next official download retries source permission synchronously (${granted ? 'allowed' : 'denied'})`, async () => {
    const h = page({ enabled: true, pending: { id: 9, origin: 'https://exports.deepseek.com' } }); await tick();
    h.dispatch(h.download);
    assert.equal(h.calls.at(-1), 'history:capture:authorize');
    assert.equal(h.downloads(), 0);
    h.dispatch(h.download);
    assert.equal(h.calls.filter(c => c === 'history:capture:authorize').length, 1);
    h.resolve(granted); await tick();
    assert.equal(h.calls.at(-1), 'history:capture:arm');
    assert.equal(h.downloads(), 1);
    if (!granted) {
        h.dispatch(h.download);
        assert.equal(h.calls.filter(c => c === 'history:capture:authorize').length, 2);
        h.resolve(false); await tick();
        assert.equal(h.downloads(), 2);
    }
});
test('a refused downloads permission is requested again on the next official click', async () => {
    const h = page(); await tick();
    h.dispatch(h.download); h.resolve(false); await tick();
    h.dispatch(h.download);
    assert.equal(h.calls.filter(c => c === 'history:capture:request').length, 2);
    h.resolve(true); await tick();
    assert.equal(h.downloads(), 2);
});

for (const enabled of [false, true]) test(`official response hint is included synchronously in a single request (downloads enabled: ${enabled})`, async () => {
    const h = page({ enabled }); await tick();
    h.source({ origin: 'https://new-cdn.deepseek.com', expiresAt: Date.now() + 60000 });
    assert.equal(h.calls.includes('history:capture:request'), false);
    h.dispatch(h.download);
    assert.deepEqual(h.messages.at(-1), { action: 'history:capture:request', origin: 'https://new-cdn.deepseek.com' });
    assert.equal(h.downloads(), 0);
    h.resolve(true); await tick();
    assert.equal(h.downloads(), 1);
});
test('expired, wildcard and foreign source hints fall back to downloads-only permission', async () => {
    for (const [source, origin, sameWindow] of [
        [{ origin: 'https://new-cdn.deepseek.com', expiresAt: Date.now() - 1 }],
        [{ origin: 'https://*.example.com', expiresAt: Date.now() + 60000 }],
        [{ origin: 'https://new-cdn.deepseek.com', expiresAt: Date.now() + 60000 }, 'https://evil.example.com'],
        [{ origin: 'https://new-cdn.deepseek.com', expiresAt: Date.now() + 60000 }, undefined, false]
    ]) {
        const h = page(); await tick(); h.source(source, origin, sameWindow); h.dispatch(h.download);
        assert.deepEqual(h.messages.at(-1), { action: 'history:capture:request' });
        h.resolve(false); await tick(); assert.equal(h.downloads(), 1);
    }
});
test('refusing the combined request preserves the source for the next download retry', async () => {
    const h = page(); await tick();
    h.source({ origin: 'https://new-cdn.deepseek.com', expiresAt: Date.now() + 60000 });
    for (let attempt = 0; attempt < 2; attempt++) {
        h.dispatch(h.download);
        assert.deepEqual(h.messages.at(-1), { action: 'history:capture:request', origin: 'https://new-cdn.deepseek.com' });
        h.resolve(false); await tick();
    }
    assert.equal(h.downloads(), 2);
    assert.equal(h.calls.includes('history:capture:arm'), false);
});
