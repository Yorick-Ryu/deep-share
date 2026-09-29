/* Shared by the MV3 worker, content script and offline tests. No network or DOM. */
(() => {
    const MAX_BYTES = 64 * 1024 * 1024;
    const EXPORT_HOST = 'deepseek-chat-history-exports-prod.obs.cn-east-3.myhuaweicloud.com';
    const str = value => typeof value === 'string' ? value : '';
    function isExportURL(value) {
        try {
            const url = new URL(value);
            return url.protocol === 'https:' && url.hostname === EXPORT_HOST && /\.zip$/i.test(url.pathname) && !url.username && !url.password;
        } catch { return false; }
    }
    async function readLimited(stream, limit = MAX_BYTES) {
        const reader = stream.getReader();
        const chunks = [];
        let size = 0;
        try {
            for (;;) {
                const { value, done } = await reader.read();
                if (done) break;
                size += value.length;
                if (size > limit) throw new Error('导出包超过 64 MB，暂无法处理。');
                chunks.push(value);
            }
        } catch (error) { await reader.cancel().catch(() => {}); throw error; }
        const result = new Uint8Array(size);
        let offset = 0;
        for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
        return result;
    }
    function crc32(bytes) {
        let crc = 0xffffffff;
        for (const byte of bytes) {
            crc ^= byte;
            for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
        }
        return (crc ^ 0xffffffff) >>> 0;
    }
    async function unzipConversations(input) {
        const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
        if (bytes.length > MAX_BYTES) throw new Error('导出包超过 64 MB，暂无法处理。');
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        const u16 = n => view.getUint16(n, true), u32 = n => view.getUint32(n, true);
        let end = bytes.length - 22;
        for (; end >= Math.max(0, bytes.length - 65557); end--) {
            if (u32(end) === 0x06054b50 && end + 22 + u16(end + 20) === bytes.length) break;
        }
        if (end < 0 || end < bytes.length - 65557) throw new Error('导出包不是完整的 ZIP 文件，请重新下载。');
        if (u16(end + 4) || u16(end + 6) || u16(end + 8) !== u16(end + 10)) throw new Error('不支持分卷 ZIP。');
        let offset = u32(end + 16);
        const count = u16(end + 10);
        for (let i = 0; i < count; i++) {
            if (offset + 46 > end || u32(offset) !== 0x02014b50) throw new Error('ZIP 目录损坏。');
            const flags = u16(offset + 8), method = u16(offset + 10), crc = u32(offset + 16);
            const compressed = u32(offset + 20), size = u32(offset + 24);
            const nameLength = u16(offset + 28), extra = u16(offset + 30), comment = u16(offset + 32);
            const local = u32(offset + 42);
            if (offset + 46 + nameLength + extra + comment > end) throw new Error('ZIP 目录损坏。');
            const name = new TextDecoder().decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
            offset += 46 + nameLength + extra + comment;
            if (!/(^|\/)conversations\.json$/i.test(name)) continue;
            if (flags & 1) throw new Error('不支持加密的导出包。');
            if (size > MAX_BYTES || compressed > MAX_BYTES) throw new Error('对话数据超过 64 MB。');
            if (local + 30 > bytes.length || u32(local) !== 0x04034b50) throw new Error('ZIP 内容损坏。');
            const start = local + 30 + u16(local + 26) + u16(local + 28);
            if (start + compressed > bytes.length) throw new Error('ZIP 内容不完整。');
            let data = bytes.subarray(start, start + compressed);
            if (method === 8) data = await readLimited(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw')), size);
            else if (method !== 0) throw new Error('不支持该 ZIP 压缩方式。');
            if (data.length !== size || crc32(data) !== crc) throw new Error('导出包校验失败，请重新下载。');
            return new TextDecoder('utf-8', { fatal: true }).decode(data);
        }
        throw new Error('导出包中未找到 conversations.json。');
    }
    function normalizeMessage(message, id) {
        if (!message || !Array.isArray(message.fragments)) return null;
        const fragments = message.fragments;
        const role = fragments.some(f => f.type === 'REQUEST') ? 'user' : 'assistant';
        const content = fragments.filter(f => ['REQUEST', 'RESPONSE'].includes(f.type)).map(f => str(f.content)).filter(Boolean).join('\n\n');
        const thinking = fragments.filter(f => f.type === 'THINK').map(f => str(f.content)).filter(Boolean).join('\n\n');
        const files = fragments.flatMap(f => f.type === 'FILE' && Array.isArray(f.files) ? f.files.map(file => str(file.file_name)).filter(Boolean) : []);
        if (!content && !thinking && !files.length) return null;
        return { id, role: files.length && !content && !thinking ? 'user' : role, content, thinking, files, date: str(message.inserted_at) };
    }
    function parseConversations(text) {
        let data;
        try { data = JSON.parse(text.replace(/^\uFEFF/, '')); } catch { throw new Error('对话 JSON 无法读取，请重新导出。'); }
        if (!Array.isArray(data) || !data.length) throw new Error('导出包里没有对话。');
        const seen = new Set();
        return data.map((raw, index) => {
            if (!raw || !raw.mapping || typeof raw.mapping !== 'object' || Array.isArray(raw.mapping)) throw new Error(`第 ${index + 1} 个对话格式不支持，原对话库未改动。`);
            const id = str(raw.id) || `conversation-${index}`;
            if (seen.has(id)) throw new Error('导出包中有重复对话 ID，原对话库未改动。');
            seen.add(id);
            const nodes = Object.entries(raw.mapping).map(([id, n]) => ({ id, parent: n.parent == null ? null : String(n.parent), message: normalizeMessage(n.message, id) }));
            const nodeMap = new Map(nodes.map(n => [n.id, n]));
            const parents = new Set(nodes.map(n => n.parent).filter(n => n !== null));
            const leaves = nodes.filter(n => !parents.has(n.id));
            const branches = leaves.map(leaf => {
                let current = leaf;
                const visited = new Set(), ids = [];
                while (current) {
                    if (visited.has(current.id)) throw new Error('对话分支存在循环。');
                    visited.add(current.id);
                    if (current.message) ids.push(current.id);
                    if (current.parent !== null && !nodeMap.has(current.parent)) throw new Error('对话分支不完整。');
                    current = nodeMap.get(current.parent);
                }
                return { id: leaf.id, messageIds: ids.reverse(), date: leaf.message?.date || '' };
            }).filter(b => b.messageIds.length);
            if (!branches.length) throw new Error(`第 ${index + 1} 个对话没有可识别的消息。`);
            // No current_node in the official export: choose the most recently written leaf.
            branches.sort((a, b) => b.date.localeCompare(a.date) || nodes.findIndex(n => n.id === b.id) - nodes.findIndex(n => n.id === a.id));
            const messages = nodes.filter(n => n.message).map(n => n.message);
            const reached = new Set(branches.flatMap(b => b.messageIds));
            if (messages.some(m => !reached.has(m.id))) throw new Error('存在无法读取的对话分支。');
            return { id, title: str(raw.title) || '未命名对话', date: str(raw.updated_at) || str(raw.inserted_at), messages, branches };
        }).sort((a, b) => b.date.localeCompare(a.date));
    }
    function selectedMessages(conversation) {
        const branch = conversation.branches[0];
        const byId = new Map(conversation.messages.map(m => [m.id, m]));
        return branch.messageIds.map(id => byId.get(id));
    }
    function dateGroup(value, now = new Date()) {
        const date = new Date(value);
        if (!Number.isFinite(date.getTime())) return '更早';
        const day = d => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
        const days = Math.round((day(now) - day(date)) / 86400000);
        if (days === 0) return '今天';
        if (days === 1) return '昨天';
        if (days > 1 && days < 7) return '7 天内';
        if (days >= 7 && days < 30) return '30 天内';
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }
    function markdown(conversations, { thinking = false } = {}) {
        const lines = [];
        for (const c of conversations) {
            lines.push(`# ${c.title.replace(/[\r\n]+/g, ' ')}`, '', `更新时间：${c.date || '未知'}`, '');
            for (const m of selectedMessages(c)) {
                lines.push(`## ${m.role === 'user' ? '用户' : 'DeepSeek'}`, '');
                if (thinking && m.thinking) lines.push('### 思考内容', '', m.thinking, '', '### 正文', '');
                if (m.content) lines.push(m.content, '');
                if (m.files.length) lines.push(`附件（需另行上传原文件）：${m.files.map(f => f.replace(/[\r\n]/g, ' ')).join('、')}`, '');
            }
            lines.push('---', '');
        }
        return lines.join('\n');
    }
    function filename(conversations) {
        let title = str(conversations[0]?.title).replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^[. ]+|[. ]+$/g, '');
        if (!title) title = '历史对话';
        // Stay below common 255-byte filename limits, including Chinese titles.
        let shortened = '';
        for (const char of title) {
            if (new TextEncoder().encode(shortened + char).length > 180) break;
            shortened += char;
        }
        title = shortened.replace(/[. ]+$/g, '');
        if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(title)) title = '_' + title;
        return `${title}${conversations.length > 1 ? '等多个对话' : ''}.md`;
    }
    globalThis.DeepShareHistory = { MAX_BYTES, isExportURL, readLimited, unzipConversations, parseConversations, selectedMessages, dateGroup, markdown, filename, crc32 };
    if (typeof module !== 'undefined') module.exports = globalThis.DeepShareHistory;
})();
