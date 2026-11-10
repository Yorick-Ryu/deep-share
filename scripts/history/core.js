/* Shared by the MV3 worker, content script and offline tests. No network or DOM. */
(() => {
    const t = (source, values = []) => globalThis.DeepShareHistoryI18n?.t(source, values) ?? source.replace(/\$(\d+)/g, (_, n) => String(values[Number(n) - 1] ?? ''));
    const MAX_BYTES = 256 * 1024 * 1024;
    // Even JSON-escaped control characters stay far below Chrome's 64 MiB limit.
    const TRANSFER_CHUNK_SIZE = 262144;
    function createDiagnostics(scope, api = globalThis.chrome) {
        const runId = globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
        const manifest = api?.runtime?.getManifest?.() || {};
        const fields = ['requestId', 'action', 'offset', 'chunkChars', 'totalChars', 'bytes', 'count', 'durationMs', 'format', 'stage', 'workerRunId'];
        function log(event, details = {}, error) {
            // Routine transport/progress details are visible only with Verbose
            // enabled. Keep one normal import summary and actionable failures.
            const level = ['request.waiting', 'archive.transfer.expired', 'diagnostics.cleanup.failed'].includes(event) ? 'warn'
                : ['archive.load.failed', 'import.failed'].includes(event) ? 'debug'
                : error ? 'error' : event === 'import.saved' ? 'info' : 'debug';
            // Never log payload objects, file names, titles, bodies, URLs or keys.
            const entry = { time: new Date().toISOString(), scope, runId, level, build: 'history-compact-20261110.1',
                version: manifest.version_name || manifest.version || 'unknown',
                browser: globalThis.navigator?.userAgent?.match(/(?:Chrome|Edg)\/[\d.]+/g)?.join(' ') || 'unknown', event };
            for (const field of fields) {
                const value = details[field];
                if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string' && value.length <= 100) entry[field] = value;
            }
            if (error) {
                const message = String(error.message || '');
                entry.errorCode = /message channel closed|port closed/i.test(message) ? 'CHANNEL_CLOSED'
                    : /64\s*MiB|maximum allowed size/i.test(message) ? 'MESSAGE_TOO_LARGE'
                    : /context invalidated/i.test(message) ? 'CONTEXT_INVALIDATED'
                    : /receiving end does not exist|establish connection/i.test(message) ? 'NO_RECEIVER'
                    : /Invalid string length/i.test(message) ? 'STRING_TOO_LARGE'
                    : /quota/i.test(message + error.name) ? 'STORAGE_QUOTA'
                    : /过期/.test(message) ? 'TRANSFER_EXPIRED' : 'OPERATION_FAILED';
                entry.errorName = ['Error', 'RangeError', 'TypeError', 'SyntaxError', 'DOMException', 'QuotaExceededError', 'AbortError'].includes(error.name) ? error.name : 'Error';
                entry.frames = String(error.stack || '').split('\n').slice(1).join('\n')
                    .match(/(?:scripts\/history\/[a-z-]+\.js|background\.js):\d+:\d+/g)?.slice(0, 5) || [];
            }
            try { console[level]('[DeepShare History]', JSON.stringify(entry)); } catch { /* Diagnostics cannot break history. */ }
        }
        log.runId = runId;
        return log;
    }
    async function readArchive(request, isCurrent = () => true) {
        let id, complete = false;
        try {
            const first = await request('history:read');
            id = first.id;
            if (typeof id !== 'string' || !Number.isInteger(first.length) || first.length < 1) throw new Error('历史库读取数据无效，请重试。');
            const chunks = [];
            let offset = 0, response = first;
            while (true) {
                if (!isCurrent()) return null;
                const chunk = response.chunk;
                if (typeof chunk !== 'string' || !chunk.length || chunk.length > TRANSFER_CHUNK_SIZE || offset + chunk.length > first.length) throw new Error('历史库读取不完整，请重试。');
                chunks.push(chunk); offset += chunk.length;
                if (offset === first.length) break;
                response = await request('history:read:chunk', { id, offset });
            }
            complete = true;
            return JSON.parse(chunks.join(''));
        } finally {
            if (id && !complete) await request('history:read:cancel', { id }).catch(() => {});
        }
    }
    const str = value => typeof value === 'string' ? value : '';
    // Exact labels observed in DeepSeek's settings; never match a generic
    // download elsewhere on the page or an adjacent destructive action.
    const nativeLabels = {
        heading: ['导出所有历史对话', '匯出所有歷史對話', 'Export data', 'Export history', 'Export chat history', 'Export all history', 'Export all chat history', 'Daten exportieren', 'Exporter les données', 'Exportar datos', 'Exportar dados', 'データをエクスポート'],
        download: ['下载', '下載', 'Download', 'Herunterladen', 'Télécharger', 'Descargar', 'Baixar', 'Descarregar', 'ダウンロード'],
        export: ['导出', '匯出', 'Export', 'Exportieren', 'Exporter', 'Exportar', 'エクスポート'],
        reexport: ['重新导出', '重新匯出', 'Re-export', 'Re-exporting', 'Export again', 'Erneut exportieren', 'Réexporter', 'Reexportar', '再エクスポート'],
        delete: ['删除所有对话', '刪除所有對話', 'Delete all chats', 'Alle Chats löschen', 'Supprimer tous les dialogues', 'Eliminar todos los chats', 'Excluir todas as conversas', 'Eliminar todas as conversas', 'すべてのチャットを削除']
    };
    const normalizeLabel = text => String(text || '').normalize('NFKC').replace(/\s+/g, ' ').trim().toLocaleLowerCase();
    function nativeLabel(kind, text, contains = false) {
        const value = normalizeLabel(text);
        return (nativeLabels[kind] || []).some(label => contains ? value.includes(normalizeLabel(label)) : value === normalizeLabel(label));
    }
    function isExportURL(value) {
        try {
            const url = new URL(value);
            // URL shape only: provenance must be established from a download
            // started by the official export UI before this URL may be read.
            const host = url.hostname;
            return url.protocol === 'https:' && !url.username && !url.password &&
                (!url.port || url.port === '443') && host.includes('.') &&
                host.length <= 253 && host.split('.').every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label)) &&
                !/^[\d.]+$/.test(host) &&
                !/(^|\.)(localhost|local|internal|test|invalid)$/.test(host);
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
                if (size > limit) throw new Error('导出包超过 256 MB，暂无法处理。');
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
        if (bytes.length > MAX_BYTES) throw new Error('导出包超过 256 MB，暂无法处理。');
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
            if (size > MAX_BYTES || compressed > MAX_BYTES) throw new Error('对话数据超过 256 MB。');
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
        let role = 'assistant';
        const contents = [], thoughts = [], files = [];
        for (const fragment of message.fragments) {
            if (fragment.type === 'REQUEST') role = 'user';
            if (fragment.type === 'REQUEST' || fragment.type === 'RESPONSE') {
                if (str(fragment.content)) contents.push(fragment.content);
            } else if (fragment.type === 'THINK') {
                if (str(fragment.content)) thoughts.push(fragment.content);
            } else if (fragment.type === 'FILE' && Array.isArray(fragment.files)) {
                for (const file of fragment.files) if (str(file.file_name)) files.push(file.file_name);
            }
        }
        const content = contents.join('\n\n'), thinking = thoughts.join('\n\n');
        if (!content && !thinking && !files.length) return null;
        return { id, role: files.length && !content && !thinking ? 'user' : role, content, thinking, files, date: str(message.inserted_at) };
    }
    function* parseConversationSteps(text) {
        let data;
        try { data = JSON.parse(text.replace(/^\uFEFF/, '')); } catch { throw new Error('对话 JSON 无法读取，请重新导出。'); }
        if (!Array.isArray(data) || !data.length) throw new Error('导出包里没有对话。');
        const seen = new Set();
        const conversations = [];
        let work = 0;
        for (let index = 0; index < data.length; index++) {
            const raw = data[index];
            if (!raw || !raw.mapping || typeof raw.mapping !== 'object' || Array.isArray(raw.mapping)) throw new Error(`第 ${index + 1} 个对话格式不支持，原对话库未改动。`);
            const id = str(raw.id) || `conversation-${index}`;
            if (seen.has(id)) throw new Error('导出包中有重复对话 ID，原对话库未改动。');
            seen.add(id);
            const nodes = [], nodeMap = new Map(), parents = new Set(), messages = [];
            for (const [id, n] of Object.entries(raw.mapping)) {
                const node = { id, parent: n.parent == null ? null : String(n.parent), message: normalizeMessage(n.message, id), order: nodes.length };
                nodes.push(node); nodeMap.set(id, node);
                if (node.parent !== null) parents.add(node.parent);
                if (node.message) messages.push(node.message);
                if (++work % 1024 === 0) yield;
            }
            // Store each parent edge once instead of duplicating an entire
            // root-to-leaf path for every branch (which can grow quadratically).
            const messageParents = Object.create(null), nearest = new Map();
            for (const node of nodes) {
                let current = node;
                const path = [], visiting = new Set();
                while (current && !nearest.has(current.id)) {
                    if (visiting.has(current.id)) throw new Error('对话分支存在循环。');
                    visiting.add(current.id); path.push(current);
                    if (current.parent !== null && !nodeMap.has(current.parent)) throw new Error('对话分支不完整。');
                    current = nodeMap.get(current.parent);
                    if (++work % 1024 === 0) yield;
                }
                let parentMessage = current ? nearest.get(current.id) : null;
                while (path.length) {
                    const part = path.pop();
                    if (part.message) { messageParents[part.id] = parentMessage; parentMessage = part.id; }
                    nearest.set(part.id, parentMessage);
                    if (++work % 1024 === 0) yield;
                }
            }
            const branches = [];
            for (const leaf of nodes) {
                const messageId = nearest.get(leaf.id);
                if (!parents.has(leaf.id) && messageId !== null) branches.push({ id: leaf.id, messageId, date: leaf.message?.date || '' });
            }
            if (!branches.length) throw new Error(`第 ${index + 1} 个对话没有可识别的消息。`);
            branches.sort((a, b) => b.date.localeCompare(a.date) || nodeMap.get(b.id).order - nodeMap.get(a.id).order);
            conversations.push({ id, title: str(raw.title) || '未命名对话', date: str(raw.updated_at) || str(raw.inserted_at), messages, branches, messageParents });
            yield;
        }
        return conversations.sort((a, b) => b.date.localeCompare(a.date));
    }
    function parseConversations(text) {
        const steps = parseConversationSteps(text);
        let step;
        do { step = steps.next(); } while (!step.done);
        return step.value;
    }
    async function parseConversationsAsync(text, yieldControl = () => new Promise(resolve => setTimeout(resolve, 0))) {
        const steps = parseConversationSteps(text);
        let sliceStart = Date.now();
        while (true) {
            const step = steps.next();
            if (step.done) return step.value;
            if (Date.now() - sliceStart >= 8) {
                await yieldControl();
                sliceStart = Date.now();
            }
        }
    }
    function branchMessageIds(conversation, branch = conversation.branches[0]) {
        if (Array.isArray(branch.messageIds)) return branch.messageIds; // Existing archives.
        const ids = [], visited = new Set();
        let id = branch.messageId;
        while (id != null) {
            if (visited.has(id)) throw new Error('对话分支存在循环。');
            visited.add(id); ids.push(id);
            if (!Object.hasOwn(conversation.messageParents || {}, id)) throw new Error('对话分支不完整。');
            id = conversation.messageParents[id];
        }
        return ids.reverse();
    }
    function selectedMessages(conversation) {
        const byId = new Map(conversation.messages.map(m => [m.id, m]));
        return branchMessageIds(conversation).map(id => byId.get(id));
    }
    async function compactArchiveAsync(archive) {
        if (!archive?.conversations) return archive;
        const conversations = [];
        let work = 0, sliceStart = Date.now();
        for (const conversation of archive.conversations) {
            if (!conversation?.branches?.some(branch => Array.isArray(branch.messageIds))) {
                conversations.push(conversation); continue;
            }
            const messageParents = Object.create(null), branches = [];
            for (const branch of conversation.branches) {
                let parent = null;
                for (const id of branchMessageIds(conversation, branch)) {
                    if (Object.hasOwn(messageParents, id) && messageParents[id] !== parent) throw new Error('对话分支不完整。');
                    messageParents[id] = parent; parent = id;
                    if (++work % 1024 === 0 && Date.now() - sliceStart >= 8) {
                        await new Promise(resolve => setTimeout(resolve, 0)); sliceStart = Date.now();
                    }
                }
                branches.push({ id: branch.id, messageId: parent, date: branch.date });
            }
            conversations.push({ ...conversation, branches, messageParents });
        }
        return { ...archive, conversations };
    }
    function dateGroup(value, now = new Date()) {
        const date = new Date(value);
        if (!Number.isFinite(date.getTime())) return t("更早");
        const day = d => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
        const days = Math.round((day(now) - day(date)) / 86400000);
        if (days === 0) return t("今天");
        if (days === 1) return t("昨天");
        if (days > 1 && days < 7) return t("7 天内");
        if (days >= 7 && days < 30) return t("30 天内");
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }
    function markdown(conversations, { thinking = false } = {}) {
        const lines = [];
        for (const c of conversations) {
            lines.push(`# ${c.title.replace(/[\r\n]+/g, ' ')}`, '', t("更新时间：$1", [c.date || t("未知")]), '');
            for (const m of selectedMessages(c)) {
                lines.push(`## ${m.role === 'user' ? t("用户") : 'DeepSeek'}`, '');
                if (thinking && m.thinking) lines.push('### ' + t('思考内容'), '', m.thinking, '', '### ' + t('正文'), '');
                if (m.content) lines.push(m.content, '');
                if (m.files.length) lines.push(t('附件（需另行上传原文件）：$1', [m.files.map(f => f.replace(/[\r\n]/g, ' ')).join(', ')]), '');
            }
            lines.push('---', '');
        }
        return lines.join('\n');
    }
    function filename(conversations) {
        let title = str(conversations[0]?.title).replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^[. ]+|[. ]+$/g, '');
        if (!title) title = t("历史对话");
        // Stay below common 255-byte filename limits, including Chinese titles.
        let shortened = '';
        for (const char of title) {
            if (new TextEncoder().encode(shortened + char).length > 180) break;
            shortened += char;
        }
        title = shortened.replace(/[. ]+$/g, '');
        if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(title)) title = '_' + title;
        return `${title}${conversations.length > 1 ? t("等多个对话") : ''}.md`;
    }
    globalThis.DeepShareHistory = { translate: t, nativeLabel, MAX_BYTES, TRANSFER_CHUNK_SIZE, createDiagnostics, readArchive, compactArchiveAsync, branchMessageIds, isExportURL, readLimited, unzipConversations, parseConversations, parseConversationsAsync, selectedMessages, dateGroup, markdown, filename, crc32 };
    if (typeof module !== 'undefined') module.exports = globalThis.DeepShareHistory;
})();
