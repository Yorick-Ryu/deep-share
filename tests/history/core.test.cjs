const { test } = require('node:test');
const assert = require('node:assert/strict');
const H = require('../../scripts/history/core.js');
const { conversation, zip } = require('./fixtures.cjs');
test('accepts public HTTPS URL shapes without pinning a domain or ZIP suffix', () => {
    assert.equal(H.isExportURL('https://new-cdn.deepseek.com/export?id=123'), true);
    assert.equal(H.isExportURL('https://exports.deepseek.com/folder/file.zip?signature=secret'), true);
    for (const url of ['http://exports.deepseek.com/file.zip', 'file:///history.zip', 'https://127.0.0.1/history.zip', 'https://localhost/history.zip', 'https://a.local/history.zip', 'https://[::1]/history.zip', 'https://user:pass@example.com/file.zip', 'https://example.com:8443/file.zip', 'https://*.example.com/file.zip', 'https://-cdn.example.com/file.zip']) assert.equal(H.isExportURL(url), false);
});
test('reads stored and deflated ZIP with CRC verification', async () => {
    const text = JSON.stringify([conversation()]);
    for (const method of [0, 8]) assert.equal(await H.unzipConversations(zip(text, method)), text);
    const bad = zip(text); bad[50] ^= 1;
    await assert.rejects(H.unzipConversations(bad), /校验失败/);
    await assert.rejects(H.unzipConversations(zip(text).subarray(0, 40)), /ZIP/);
    await assert.rejects(H.unzipConversations(new Uint8Array()), /ZIP/);
});
test('retains all branches and follows parents, not mapping order', () => {
    const raw = conversation(); raw.mapping = Object.fromEntries(Object.entries(raw.mapping).reverse());
    const [c] = H.parseConversations(JSON.stringify([raw]));
    assert.equal(c.branches.length, 2);
    assert.deepEqual(H.selectedMessages(c).map(m => m.id), ['question', 'latest']);
    assert.deepEqual(H.selectedMessages(c, 'old').map(m => m.id), ['question', 'latest']);
});
test('Markdown keeps code and math, always exports latest branch, excludes thinking by default', () => {
    const [c] = H.parseConversations(JSON.stringify([conversation()]));
    const md = H.markdown([c]);
    assert.match(md, /\$x\^2\$/); assert.match(md, /```js\nconst x = 2;\n```/);
    assert.match(md, /说明.pdf/); assert.doesNotMatch(md, /思考示例|旧回答/);
    assert.match(H.markdown([c], { thinking: true }), /思考示例/);
    // Legacy branch preferences must not bring an old answer back.
    const latest = H.markdown([c], { branches: { one: 'old' } });
    assert.match(latest, /新回答/); assert.doesNotMatch(latest, /旧回答|所选分支/);
});
test('rejects unsupported, duplicate, orphaned and cyclic data without partial imports', () => {
    for (const text of ['not json', '{}', '[]', '[{}]', JSON.stringify([conversation(), conversation()])]) assert.throws(() => H.parseConversations(text));
    const orphan = conversation(); orphan.mapping.question.parent = 'missing';
    assert.throws(() => H.parseConversations(JSON.stringify([orphan])), /不完整/);
    const cycle = conversation(); cycle.mapping.question.parent = 'latest';
    assert.throws(() => H.parseConversations(JSON.stringify([cycle])), /循环/);
});
test('stream reader aborts oversized inputs', async () => {
    await assert.rejects(H.readLimited(new Blob(['12345']).stream(), 4), /超过/);
});
test('sidebar groups dates by local calendar days and falls back to month', () => {
    const now = new Date(2026, 8, 28, 12);
    assert.equal(H.dateGroup(new Date(2026, 8, 28, 0, 1).toISOString(), now), '今天');
    assert.equal(H.dateGroup(new Date(2026, 8, 27, 23, 59).toISOString(), now), '昨天');
    assert.equal(H.dateGroup(new Date(2026, 8, 24).toISOString(), now), '7 天内');
    assert.equal(H.dateGroup(new Date(2026, 8, 15).toISOString(), now), '30 天内');
    assert.equal(H.dateGroup(new Date(2026, 7, 1).toISOString(), now), '2026-08');
    assert.equal(H.dateGroup('', now), '更早');
});
test('attachment filenames use conversation titles and stay filesystem-safe', () => {
    assert.equal(H.filename([{ title: '项目技术方案' }]), '项目技术方案.md');
    assert.equal(H.filename([{ title: '项目技术方案' }, { title: '代码示例' }]), '项目技术方案等多个对话.md');
    assert.equal(H.filename([{ title: '  方案 / 比较: A?  ' }]), '方案 比较 A.md');
    assert.equal(H.filename([{ title: '...' }]), '历史对话.md');
    assert.equal(H.filename([{ title: 'CON' }]), '_CON.md');
    const long = H.filename([{ title: '😀长标题'.repeat(100) }, { title: '第二个' }]);
    assert.ok(Buffer.byteLength(long) < 255);
    assert.ok(!long.includes('\ufffd'));
    assert.ok(long.endsWith('等多个对话.md'));
});

test('async parsing preserves branches, tie ordering, thinking and files', async () => {
    const c = conversation('async');
    c.mapping.old.message.inserted_at = c.mapping.latest.message.inserted_at;
    const text = JSON.stringify([c, conversation('second')]);
    const actual = await H.parseConversationsAsync(text);
    assert.deepEqual(actual, H.parseConversations(text));
    assert.equal(actual[0].branches[0].id, 'latest');
    assert.match(H.markdown(actual, { thinking: true }), /思考示例|说明.pdf/);
});
test('many equal-date branches retain reverse insertion order without node scans in sort', () => {
    const mapping = { root: { parent: null, message: null } };
    for (let i = 0; i < 12000; i++) mapping['leaf-' + i] = { parent: 'root', message: {
        inserted_at: '2026-11-10T00:00:00Z', fragments: [{ type: 'RESPONSE', content: `answer ${i}` }]
    } };
    const [c] = H.parseConversations(JSON.stringify([{ id: 'wide', mapping }]));
    assert.equal(c.branches.length, 12000);
    assert.equal(c.messages.length, 12000);
    assert.equal(c.branches[0].id, 'leaf-11999');
    assert.equal(c.branches.at(-1).id, 'leaf-0');
    assert.equal(H.selectedMessages(c)[0].content, 'answer 11999');
});
test('async parser yields during one large conversation and propagates invalid data', async () => {
    const mapping = { root: { parent: null, message: null } };
    for (let i = 0; i < 16000; i++) mapping['node-' + i] = { parent: i ? `node-${i - 1}` : 'root', message: {
        fragments: [{ type: i % 2 ? 'RESPONSE' : 'REQUEST', content: `text ${i}` }]
    } };
    let yields = 0;
    const result = await H.parseConversationsAsync(JSON.stringify([{ id: 'long', mapping }]), async () => { yields++; });
    assert.ok(yields > 0);
    assert.equal(H.branchMessageIds(result[0]).length, 16000);
    assert.equal(H.selectedMessages(result[0]).at(-1).content, 'text 15999');
    await assert.rejects(H.parseConversationsAsync('{invalid'), /JSON/);
    const orphan = conversation('orphan'); orphan.mapping.question.parent = 'missing';
    await assert.rejects(H.parseConversationsAsync(JSON.stringify([orphan])), /不完整/);
});

test('shared-prefix histories stay compact while preserving every branch path', async () => {
    const fs = require('node:fs'), vm = require('node:vm');
    const { execFileSync } = require('node:child_process');
    const context = { module: { exports: {} } };
    vm.runInNewContext(execFileSync('git', ['show', 'v1.9.6:scripts/history/core.js'], { encoding: 'utf8' }), context);
    const old = context.module.exports;
    const c = conversation('shared'), text = JSON.stringify([c]);
    const previous = old.parseConversations(text), current = H.parseConversations(text);
    for (let i = 0; i < previous[0].branches.length; i++) {
        assert.deepEqual(H.branchMessageIds(current[0], current[0].branches[i]), Array.from(previous[0].branches[i].messageIds));
        assert.equal(current[0].branches[i].id, previous[0].branches[i].id);
    }
    assert.deepEqual(JSON.parse(JSON.stringify(current[0].messages)), JSON.parse(JSON.stringify(previous[0].messages)));
    assert.equal(H.markdown(current, { thinking: true }), old.markdown(previous, { thinking: true }));
    const migrated = await H.compactArchiveAsync({ savedAt: 'unchanged', conversations: previous });
    assert.equal(migrated.savedAt, 'unchanged');
    assert.equal(H.markdown(migrated.conversations, { thinking: true }), old.markdown(previous, { thinking: true }));
    assert.deepEqual(JSON.parse(JSON.stringify(migrated.conversations)), JSON.parse(JSON.stringify(current)));
    // The old snapshot remains intact when another import happens concurrently.
    assert.ok(Array.isArray(previous[0].branches[0].messageIds));
});

test('long shared history is stored once instead of being multiplied by branch count', async () => {
    const mapping = { root: { parent: null, message: null } }, depth = 1000, leaves = 3000;
    const key = i => `shared-node-${String(i).padStart(25, '0')}`;
    for (let i = 0; i < depth; i++) mapping[key(i)] = { parent: i ? key(i - 1) : 'root', message: { fragments: [{ type: 'REQUEST', content: 'shared' }] } };
    for (let i = 0; i < leaves; i++) mapping[`leaf-${i}`] = { parent: key(depth - 1), message: { fragments: [{ type: 'RESPONSE', content: `answer ${i}` }] } };
    const input = JSON.stringify([{ id: 'shared', mapping }]);
    const [c] = await H.parseConversationsAsync(input);
    assert.equal(c.branches.length, leaves);
    assert.equal(Object.keys(c.messageParents).length, depth + leaves);
    assert.equal(H.branchMessageIds(c).length, depth + 1);
    assert.equal(H.selectedMessages(c).at(-1).content, `answer ${leaves - 1}`);
    assert.ok(Buffer.byteLength(JSON.stringify(c)) < Buffer.byteLength(input) * 2);
    assert.deepEqual(H.branchMessageIds(c, c.branches.at(-1)).slice(0, depth), Array.from({ length: depth }, (_, i) => key(i)));
});

test('compact histories preserve branches ending with empty nodes and reject disconnected cycles', () => {
    const c = conversation('empty-leaf');
    c.mapping.empty = { parent: 'latest', message: null };
    const [result] = H.parseConversations(JSON.stringify([c]));
    const leaf = result.branches.find(b => b.id === 'empty');
    assert.deepEqual(H.branchMessageIds(result, leaf), ['question', 'latest']);
    c.mapping.a = { parent: 'b', message: null }; c.mapping.b = { parent: 'a', message: null };
    assert.throws(() => H.parseConversations(JSON.stringify([c])), /循环/);
});
