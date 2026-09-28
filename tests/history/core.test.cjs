const { test } = require('node:test');
const assert = require('node:assert/strict');
const H = require('../../scripts/history/core.js');
const { conversation, zip } = require('./fixtures.cjs');
test('accepts only HTTPS official export files', () => {
    assert.equal(H.isExportURL('https://deepseek-chat-history-exports-prod.obs.cn-east-3.myhuaweicloud.com/id.zip?signature=secret'), true);
    for (const url of ['https://evil.example/id.zip', 'https://deepseek-chat-history-exports-prod.obs.cn-east-3.myhuaweicloud.com.evil.test/id.zip', 'http://deepseek-chat-history-exports-prod.obs.cn-east-3.myhuaweicloud.com/id.zip', 'file:///history.zip']) assert.equal(H.isExportURL(url), false);
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
