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
function zipEntries(entries) {
    const locals = [], centrals = [];
    let offset = 0;
    for (const { name: path, text = '', method = 0, declaredSize } of entries) {
        const data = Buffer.from(text), name = Buffer.from(path);
        const compressed = method === 8 ? require('node:zlib').deflateRawSync(data) : data;
        const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50); local.writeUInt16LE(method, 8);
        local.writeUInt16LE(name.length, 26);
        const central = Buffer.alloc(46); central.writeUInt32LE(0x02014b50); central.writeUInt16LE(method, 10);
        central.writeUInt32LE(H.crc32(data), 16); central.writeUInt32LE(compressed.length, 20); central.writeUInt32LE(declaredSize ?? data.length, 24); central.writeUInt16LE(name.length, 28);
        central.writeUInt32LE(offset, 42);
        locals.push(local, name, compressed); centrals.push(central, name);
        offset += local.length + name.length + compressed.length;
    }
    const directory = Buffer.concat(centrals), end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
    end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
    return Buffer.concat([...locals, directory, end]);
}
function zip(text, method = 0) { return zipEntries([{ name: 'conversations.json', text, method }]); }
module.exports = { conversation, zip, zipEntries };
