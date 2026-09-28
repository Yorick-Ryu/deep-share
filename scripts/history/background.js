(() => {
    const H = DeepShareHistory, store = DeepShareHistoryStore;
    let queue = Promise.resolve();
    const scheduled = new Set();
    const imports = new Map();
    // Transfer JSON in bounded chunks so large local exports do not exceed
    // Chrome's per-message limit. Unfinished transfers never touch the archive.
    function importMessage(message, sender) {
        const now = Date.now();
        for (const [key, value] of imports) if (value.expires < now) imports.delete(key);
        const owner = `${sender.tab.id}:${sender.documentId || sender.frameId || 0}`;
        if (message.action === 'history:import:start') {
            if (!Number.isInteger(message.length) || message.length < 1 || message.length > H.MAX_BYTES) throw new Error('对话数据超过 64 MB 或为空。');
            const id = crypto.randomUUID();
            imports.set(owner, { id, expected: message.length, length: 0, chunks: [], expires: now + 120000 });
            return { ok: true, id };
        }
        const pending = imports.get(owner);
        if (!pending || pending.id !== message.id) throw new Error('导入已过期，请重新选择文件。');
        if (message.action === 'history:import:cancel') {
            imports.delete(owner); return { ok: true };
        }
        if (message.action === 'history:import:chunk') {
            const chunk = message.chunk;
            const total = [...imports.values()].reduce((sum, value) => sum + value.length, 0);
            if (typeof chunk !== 'string' || !chunk.length || chunk.length > 262144 || message.offset !== pending.length || pending.length + chunk.length > pending.expected || total + chunk.length > H.MAX_BYTES) {
                imports.delete(owner); throw new Error('导入数据不完整或过大，请重新选择文件。');
            }
            pending.chunks.push(chunk); pending.length += chunk.length; pending.expires = now + 120000;
            return { ok: true };
        }
        if (message.action !== 'history:import:finish') throw new Error('未知导入操作。');
        imports.delete(owner);
        if (pending.length !== pending.expected) throw new Error('导入数据不完整，原历史库未改动。');
        const text = pending.chunks.join('');
        if (new TextEncoder().encode(text).length > H.MAX_BYTES) throw new Error('对话数据超过 64 MB。');
        queue = queue.catch(() => {}).then(async () => {
            const conversations = H.parseConversations(text);
            await store.write({ conversations, savedAt: new Date().toISOString() });
            await status({ state: 'ready', count: conversations.length });
            return { ok: true, count: conversations.length };
        });
        return queue;
    }
    const status = value => chrome.storage.local.set({ deepShareHistoryStatus: { ...value, updatedAt: new Date().toISOString() } });
    async function capture(item) {
        const url = [item.finalUrl, item.url].find(H.isExportURL);
        if (!url || scheduled.has(item.id)) return;
        // Only the official export bucket is read. Signed links are never persisted or logged.
        scheduled.add(item.id);
        queue = queue.catch(() => {}).then(async () => {
            const completedKey = `deepShareHistoryDownload`;
            if ((await chrome.storage.local.get(completedKey))[completedKey] === item.id) return;
            await status({ state: 'loading', message: '正在保存刚导出的历史对话…' });
            try {
                const response = await fetch(url, { credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(25000) });
                if (!response.ok) throw new Error('导出链接已失效或无法下载，请回到数据管理重新导出并下载。');
                if (Number(response.headers.get('content-length')) > H.MAX_BYTES) throw new Error('导出包超过 64 MB。');
                const text = await H.unzipConversations(await H.readLimited(response.body));
                const conversations = H.parseConversations(text);
                const savedAt = new Date().toISOString();
                await store.write({ conversations, savedAt });
                await chrome.storage.local.set({ [completedKey]: item.id });
                await status({ state: 'ready', count: conversations.length, message: `已保存 ${conversations.length} 个历史对话，请点击“下载”同步对话。` });
            } catch (error) {
                await status({ state: 'error', message: `保存失败，已有对话库仍保留。${error.message}` });
            }
        });
        await queue;
    }
    chrome.downloads.onCreated.addListener(item => { capture(item).catch(() => {}); });
    chrome.downloads.onChanged.addListener(async delta => {
        if (delta.state?.current !== 'complete' && !delta.finalUrl) return;
        try {
            const [item] = await chrome.downloads.search({ id: delta.id });
            if (item) await capture(item);
        } catch { /* Unrelated or removed download. */ }
    });
    chrome.runtime.onMessage.addListener((message, sender, respond) => {
        if (!message?.action?.startsWith('history:')) return false;
        if (sender.id !== chrome.runtime.id || !sender.tab || !sender.url?.startsWith('https://chat.deepseek.com/')) {
            respond({ ok: false, error: '仅允许在 DeepSeek 页面访问历史库。' }); return false;
        }
        (async () => {
            if (message.action.startsWith('history:import:')) return importMessage(message, sender);
            if (message.action === 'history:read') {
                const archive = await store.read();
                return { ok: true, archive: archive || null };
            }
            if (message.action === 'history:clear') {
                // Serialize with captures, so a pending download cannot repopulate a cleared library.
                queue = queue.catch(() => {}).then(() => store.clear());
                await queue;
                await status({ state: 'empty', message: '本地历史库已清除。请从系统设置导出并下载以重新建立。' });
                return { ok: true };
            }
            throw new Error('未知历史对话操作。');
        })().then(respond, error => respond({ ok: false, error: error.message }));
        return true;
    });
})();
