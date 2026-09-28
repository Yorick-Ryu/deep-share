const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const H = require('../../scripts/history/core.js');
const { conversation, zip } = require('./fixtures.cjs');
const url = 'https://deepseek-chat-history-exports-prod.obs.cn-east-3.myhuaweicloud.com/test.zip?signature=not-persisted';
function harness({ failFetch = false, failStore = false } = {}) {
    const listeners = {}, local = {}, calls = [];
    let archive = { conversations: ['previous'] };
    const context = {
        DeepShareHistory: H, AbortSignal, URL, TextEncoder, crypto: require('node:crypto').webcrypto,
        DeepShareHistoryStore: {
            read: async () => archive,
            write: async value => { if (failStore) throw Error('quota'); archive = value; },
            clear: async () => { archive = null; }
        },
        fetch: async value => { calls.push(value); if (failFetch) throw Error('offline'); return new Response(zip(JSON.stringify([conversation()]), 8)); },
        chrome: {
            downloads: { onCreated: { addListener: f => listeners.created = f }, onChanged: { addListener: f => listeners.changed = f }, search: async () => [{ id: 1, url }] },
            storage: { local: { set: async value => Object.assign(local, value), get: async key => ({ [key]: local[key] }) } },
            runtime: { id: 'extension-id', onMessage: { addListener: f => listeners.message = f } }
        }
    };
    vm.runInNewContext(fs.readFileSync('scripts/history/background.js', 'utf8'), context);
    const message = (action, sender = { id: 'extension-id', tab: { id: 2 }, url: 'https://chat.deepseek.com/' }) => new Promise(resolve => listeners.message(typeof action === 'string' ? { action } : action, sender, resolve));
    const settle = async () => { for (let i = 0; i < 30 && !['ready', 'error'].includes(local.deepShareHistoryStatus?.state); i++) await new Promise(resolve => setTimeout(resolve, 5)); };
    return { listeners, local, calls, message, settle, archive: () => archive };
}
test('captures official download once, saves archive and never persists signed URL', async () => {
    const h = harness();
    h.listeners.created({ id: 1, url }); await h.settle();
    assert.equal(h.archive().conversations.length, 1); assert.equal(h.local.deepShareHistoryStatus.state, 'ready');
    h.listeners.created({ id: 1, url }); await h.listeners.changed({ id: 1, state: { current: 'complete' } });
    assert.equal(h.calls.length, 1); assert.doesNotMatch(JSON.stringify(h.local), /signature/);
    assert.equal((await h.message('history:read')).archive.conversations.length, 1);
    await h.message('history:clear'); assert.equal(h.archive(), null);
});
test('unrelated downloads and untrusted senders cannot access the library', async () => {
    const h = harness(); h.listeners.created({ id: 2, url: 'https://example.com/file.zip' });
    assert.equal(h.calls.length, 0);
    assert.equal((await h.message('history:read', { id: 'extension-id', tab: { id: 2 }, url: 'https://example.com/' })).ok, false);
});
for (const mode of ['failFetch', 'failStore']) test(`${mode} preserves previous archive and reports failure`, async () => {
    const h = harness({ [mode]: true }); h.listeners.created({ id: 1, url }); await h.settle();
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
test('local import assembles bounded chunks and preserves the official conversation data', async () => {
    const h = harness(), c = conversation('local');
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
