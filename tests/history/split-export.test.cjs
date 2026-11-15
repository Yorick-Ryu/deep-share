const { test } = require('node:test');
const assert = require('node:assert/strict');
const H = require('../../scripts/history/core.js');
const { conversation, zip, zipEntries } = require('./fixtures.cjs');

function session(id = 'split') {
    return { id, title: '新版导出示例', inserted_at: '2026-11-15T00:00:00Z', updated_at: '2026-11-15T01:00:00Z', current_message_id: 3,
        messages: [
            { id: 0, parent_id: null, role: 'USER', fragments: [{ type: 'FILE', files: [{ file_name: '说明.pdf', export_path: 'split_files/document.pdf' }] }] },
            { id: 1, parent_id: 0, role: 'ASSISTANT', inserted_at: '2026-11-15T00:00:01Z', fragments: [{ type: 'RESPONSE', content: '旧回答' }] },
            { id: 2, parent_id: 0, role: 'ASSISTANT', inserted_at: '2026-11-15T00:00:02Z', fragments: [{ type: 'THINK', content: '思考' }, { type: 'RESPONSE', content: '新回答 $x^2$' }] },
            { id: 3, parent_id: 2, role: 'ASSISTANT', inserted_at: '2026-11-15T00:00:03Z', fragments: [{ type: 'TEMPLATE_RESPONSE', content: '请稍后重试。' }] }
        ] };
}

test('v3 ZIP imports session JSONs and ignores index, user metadata and attachment files', async () => {
    for (const method of [0, 8]) {
        const data = zipEntries([
            { name: 'export/manifest.json', text: '{"export_format_version":3}' },
            { name: 'export/user.json', text: '{not conversation data}' },
            { name: 'export/chat_session_index.json', text: '[{"id":"split"},{"id":"second"}]' },
            { name: 'export/chat_sessions/split_files/attachment.json', text: 'not a session' },
            { name: 'export/chat_sessions/split_files/conversations.json', text: 'an attachment, not the legacy archive' },
            { name: 'export/chat_sessions/split.json', text: '\uFEFF' + JSON.stringify(session()), method },
            { name: 'export/chat_sessions/second.json', text: JSON.stringify(session('second')), method }
        ]);
        const text = await H.unzipConversations(data);
        const parsed = await H.parseConversationsAsync(text);
        assert.equal(parsed.length, 2);
        assert.equal(parsed[0].messages.length, 4);
        assert.deepEqual(H.branchMessageIds(parsed[0]), ['0', '2', '3']);
        assert.equal(parsed[0].branches.length, 2);
        assert.deepEqual(H.branchMessageIds(parsed[0], parsed[0].branches[1]), ['0', '1']);
        assert.deepEqual(H.selectedMessages(parsed[0]).map(m => m.role), ['user', 'assistant', 'assistant']);
        const md = H.markdown(parsed, { thinking: true });
        assert.match(md, /说明.pdf/); assert.match(md, /思考/); assert.match(md, /新回答 \$x\^2\$/); assert.match(md, /请稍后重试/);
        assert.doesNotMatch(md, /旧回答|export_path|not a session/);
    }
});

test('a single extracted session JSON preserves parent relationships regardless of array order', () => {
    const raw = session(); raw.messages.reverse();
    const [parsed] = H.parseConversations(JSON.stringify(raw));
    assert.deepEqual(H.selectedMessages(parsed).map(m => m.id), ['0', '2', '3']);
    assert.deepEqual(H.selectedMessages(parsed)[0].files, ['说明.pdf']);
});

test('split export rejects duplicate message IDs, missing parents, cycles and a bad last session', async () => {
    const duplicate = session(); duplicate.messages.push({ ...duplicate.messages[0] });
    assert.throws(() => H.parseConversations(JSON.stringify(duplicate)), /重复消息/);
    const orphan = session(); orphan.messages[0].parent_id = 999;
    assert.throws(() => H.parseConversations(JSON.stringify(orphan)), /不完整/);
    const cycle = session(); cycle.messages[0].parent_id = 3;
    assert.throws(() => H.parseConversations(JSON.stringify(cycle)), /循环/);
    const invalid = session(); invalid.messages[0] = null;
    assert.throws(() => H.parseConversations(JSON.stringify(invalid)), /格式不支持/);
    const data = zipEntries([
        { name: 'chat_sessions/first.json', text: JSON.stringify(session()) },
        { name: 'chat_sessions/bad.json', text: '{"id":"bad"}' }
    ]);
    await assert.rejects(H.parseConversationsAsync(await H.unzipConversations(data)), /格式不支持/);
});

test('ZIP checks every session CRC and limits their aggregate expanded size', async () => {
    const data = zipEntries([
        { name: 'chat_sessions/first.json', text: JSON.stringify(session()) },
        { name: 'chat_sessions/second.json', text: JSON.stringify(session('second')) }
    ]);
    data[data.lastIndexOf(Buffer.from('新回答'))] ^= 1;
    await assert.rejects(H.unzipConversations(data), /校验失败/);
    const oversized = zipEntries([
        { name: 'chat_sessions/a.json', text: '{}', declaredSize: H.MAX_BYTES / 2 },
        { name: 'chat_sessions/b.json', text: '{}', declaredSize: H.MAX_BYTES / 2 }
    ]);
    await assert.rejects(H.unzipConversations(oversized), /超过/);
    await assert.rejects(H.unzipConversations(zipEntries([{ name: 'user.json', text: '{}' }])), /未找到/);
});

test('old ZIP and mapping imports remain compatible when the archive also contains split sessions', async () => {
    const old = JSON.stringify([conversation()]);
    assert.equal(await H.unzipConversations(zip(old, 8)), old);
    const mixed = zipEntries([
        { name: 'chat_sessions/split.json', text: JSON.stringify(session()) },
        { name: 'conversations.json', text: old }
    ]);
    assert.deepEqual(H.parseConversations(await H.unzipConversations(mixed)), H.parseConversations(old));
});
