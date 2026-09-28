const H = require('../../scripts/history/core.js');
const conversation = (id = 'one') => ({
    id, title: `示例 ${id}`, inserted_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-28T00:00:00Z',
    mapping: {
        root: { parent: null, message: null },
        question: { parent: 'root', message: { inserted_at: '2026-09-01T00:00:00Z', fragments: [
            { type: 'REQUEST', content: '请保留公式 $x^2$ 和代码。' },
            { type: 'FILE', files: [{ file_name: '说明.pdf' }] }
        ] } },
        old: { parent: 'question', message: { inserted_at: '2026-09-01T00:00:01Z', fragments: [{ type: 'RESPONSE', content: '旧回答' }] } },
        latest: { parent: 'question', message: { inserted_at: '2026-09-01T00:00:02Z', fragments: [
            { type: 'THINK', content: '思考示例' }, { type: 'RESPONSE', content: '```js\nconst x = 2;\n```\n\n新回答' }
        ] } }
    }
});
function zip(text, method = 0) {
    const data = Buffer.from(text), name = Buffer.from('conversations.json');
    const compressed = method === 8 ? require('node:zlib').deflateRawSync(data) : data;
    const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50); local.writeUInt16LE(method, 8);
    local.writeUInt16LE(name.length, 26);
    const central = Buffer.alloc(46); central.writeUInt32LE(0x02014b50); central.writeUInt16LE(method, 10);
    central.writeUInt32LE(H.crc32(data), 16); central.writeUInt32LE(compressed.length, 20); central.writeUInt32LE(data.length, 24); central.writeUInt16LE(name.length, 28);
    const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50); end.writeUInt16LE(1, 8); end.writeUInt16LE(1, 10);
    end.writeUInt32LE(central.length + name.length, 12); end.writeUInt32LE(local.length + name.length + compressed.length, 16);
    return Buffer.concat([local, name, compressed, central, name, end]);
}
module.exports = { conversation, zip };
