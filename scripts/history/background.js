(() => {
    const H = DeepShareHistory, store = DeepShareHistoryStore;
    const debug = H.createDiagnostics('worker', chrome);
    // Remove only the diagnostic caches written by the previous test build.
    chrome.storage.local.remove?.(['deepShareHistoryDebug:page', 'deepShareHistoryDebug:worker'])
        ?.catch(error => debug('diagnostics.cleanup.failed', {}, error));
    debug('worker.ready');
    const capturePermissions = DeepShareHistoryPermissions;
    const canCapture = () => chrome.permissions.contains(capturePermissions);
    const sourceIsDeepSeek = value => { try { return new URL(value).origin === 'https://chat.deepseek.com'; } catch { return false; } };
    const flowKey = 'deepShareHistoryDownloadFlows';
    let flows = { intents: {}, pending: {} }, flowsLoaded = false, writes = Promise.resolve();
    const flowsReady = chrome.storage.session.get(flowKey).then(data => {
        if (data[flowKey]) flows = data[flowKey];
        pruneFlows(); flowsLoaded = true;
    });
    function pruneFlows() {
        for (const group of [flows.intents, flows.pending]) {
            for (const [key, value] of Object.entries(group)) if (value.expires <= Date.now()) delete group[key];
        }
    }
    function saveFlows() {
        pruneFlows();
        const snapshot = JSON.parse(JSON.stringify(flows));
        writes = writes.catch(() => {}).then(() => chrome.storage.session.set({ [flowKey]: snapshot }));
        return writes;
    }
    const notifyCapture = () => chrome.storage.local.set({ deepShareHistoryCaptureRevision: crypto.randomUUID() });
    const hostPermission = origin => ({ origins: [`${origin}/*`] });
    function candidateFor(tabId) { pruneFlows(); return flows.pending[tabId]; }
    async function armDownload(sender) {
        await flowsReady;
        if (!await canCapture()) return;
        pruneFlows();
        if (Object.keys(flows.intents).length >= 16) throw Error('待处理的导出过多，请稍后重试。');
        const now = Date.now();
        flows.intents[sender.tab.id] = { tabId: sender.tab.id, incognito: !!sender.tab.incognito, started: now, expires: now + 30000 };
        delete flows.pending[sender.tab.id];
        await saveFlows(); await notifyCapture();
    }
    async function rememberOrigin(origin) {
        const key = 'deepShareHistoryGrantedOrigins';
        const data = await chrome.storage.local.get(key);
        await chrome.storage.local.set({ [key]: [...new Set([...(data[key] || []), `${origin}/*`])] });
    }
    let queue = Promise.resolve();
    const scheduled = new Set();
    const imports = new Map();
    const reads = new Map();
    const readerOwner = sender => `${sender.tab.id}:${sender.documentId || sender.frameId || 0}`;
    function releaseRead(owner) {
        const pending = reads.get(owner);
        if (pending) clearTimeout(pending.timer);
        reads.delete(owner);
    }
    function readChunk(pending, owner, offset) {
        if (!Number.isInteger(offset) || offset !== pending.offset) throw new Error('历史库读取位置无效，请重试。');
        const chunk = pending.text.slice(offset, offset + H.TRANSFER_CHUNK_SIZE);
        pending.offset += chunk.length;
        if (pending.offset === pending.text.length) {
            debug('archive.transfer.done', { totalChars: pending.text.length });
            releaseRead(owner);
        }
        return { ok: true, chunk };
    }
    async function readMessage(message, sender) {
        const owner = readerOwner(sender);
        if (message.action === 'history:read') {
            releaseRead(owner);
            // One immutable snapshot per reader: never mix archives if an import
            // or clear finishes between chunks. Bound concurrent retained snapshots.
            if (reads.size >= 4) throw new Error('历史库读取繁忙，请稍后重试。');
            const pending = { id: crypto.randomUUID(), text: '', offset: 0 };
            reads.set(owner, pending);
            pending.timer = setTimeout(() => {
                if (reads.get(owner) === pending) {
                    debug('archive.transfer.expired', { offset: pending.offset, totalChars: pending.text.length });
                    releaseRead(owner);
                }
            }, 120000);
            pending.timer?.unref?.();
            try {
                const started = Date.now();
                debug('archive.storage.read.start');
                const archive = await store.read();
                debug('archive.storage.read.done', { count: archive?.conversations?.length || 0, durationMs: Date.now() - started });
                pending.text = JSON.stringify(archive || null);
                debug('archive.snapshot.ready', { totalChars: pending.text.length, durationMs: Date.now() - started });
                if (reads.get(owner) !== pending) throw new Error('历史库读取已过期，请重试。');
                return { ...readChunk(pending, owner, 0), id: pending.id, length: pending.text.length };
            } catch (error) {
                if (reads.get(owner) === pending) releaseRead(owner);
                throw error;
            }
        }
        const pending = reads.get(owner);
        if (!pending || pending.id !== message.id) throw new Error('历史库读取已过期，请重试。');
        if (message.action === 'history:read:cancel') {
            debug('archive.transfer.cancelled', { offset: pending.offset, totalChars: pending.text.length });
            releaseRead(owner); return { ok: true };
        }
        return readChunk(pending, owner, message.offset);
    }
    // Transfer JSON in bounded chunks so large local exports do not exceed
    // Chrome's per-message limit. Unfinished transfers never touch the archive.
    function importMessage(message, sender) {
        const now = Date.now();
        for (const [key, value] of imports) if (value.expires < now) imports.delete(key);
        const owner = `${sender.tab.id}:${sender.documentId || sender.frameId || 0}`;
        if (message.action === 'history:import:start') {
            if (!Number.isInteger(message.length) || message.length < 1 || message.length > H.MAX_BYTES) throw new Error('对话数据超过 256 MB 或为空。');
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
        if (new TextEncoder().encode(text).length > H.MAX_BYTES) throw new Error('对话数据超过 256 MB。');
        queue = queue.catch(() => {}).then(async () => {
            const started = Date.now();
            debug('import.parse.start', { totalChars: text.length });
            const conversations = H.parseConversations(text);
            debug('import.parse.done', { count: conversations.length, durationMs: Date.now() - started });
            debug('import.storage.write.start', { count: conversations.length });
            await store.write({ conversations, savedAt: new Date().toISOString() });
            debug('import.storage.write.done', { count: conversations.length, durationMs: Date.now() - started });
            await status({ state: 'ready', count: conversations.length });
            return { ok: true, count: conversations.length };
        });
        return queue;
    }
    const status = value => chrome.storage.local.set({ deepShareHistoryStatus: { ...value, updatedAt: new Date().toISOString() } });
    async function capture(item) {
        await flowsReady;
        if (!await canCapture() || !Number.isInteger(item.id) || item.byExtensionId || !sourceIsDeepSeek(item.referrer)) return;
        pruneFlows();
        const started = Date.parse(item.startTime);
        if (!Number.isFinite(started)) return;
        let candidate = Object.values(flows.pending).find(value => value.id === item.id);
        if (!candidate) {
            // Referrer alone is insufficient: require one recent official export
            // click in the same browsing mode. Ambiguous simultaneous clicks fail closed.
            const matches = Object.values(flows.intents).filter(value =>
                started >= value.started && started <= value.expires && value.incognito === !!item.incognito);
            if (matches.length !== 1) return;
            const intent = matches[0];
            candidate = { id: item.id, tabId: intent.tabId, incognito: intent.incognito,
                started, expires: Date.now() + 10 * 60000, state: 'downloading' };
            delete flows.intents[intent.tabId];
            flows.pending[intent.tabId] = candidate;
            await saveFlows();
        }
        if (candidate.started !== started || candidate.incognito !== !!item.incognito) return;
        if (item.state === 'interrupted') {
            delete flows.pending[candidate.tabId]; await saveFlows();
            await status({ state: 'error', message: '官方下载未完成，请重新下载或手动导入文件。已有历史库保留。' });
            await notifyCapture(); return;
        }
        // Wait for the browser to resolve all redirects. Never follow a new
        // redirect while fetching the archive with extension privileges.
        if (item.state !== 'complete') return;
        const url = item.finalUrl || item.url;
        if (!H.isExportURL(url)) {
            delete flows.pending[candidate.tabId]; await saveFlows();
            await status({ state: 'error', message: '此下载地址无法安全读取，请在历史库中手动导入已下载的 ZIP 文件。' });
            await notifyCapture(); return;
        }
        const origin = new URL(url).origin;
        candidate.origin = origin;
        if (!await chrome.permissions.contains(hostPermission(origin))) {
            candidate.state = 'permission';
            await saveFlows(); await notifyCapture(); return;
        }
        if (scheduled.has(item.id)) return;
        scheduled.add(item.id);
        candidate.state = 'reading'; await saveFlows(); await notifyCapture();
        queue = queue.catch(() => {}).then(async () => {
            const stillAllowed = async () => candidateFor(candidate.tabId) === candidate &&
                await canCapture() && await chrome.permissions.contains(hostPermission(origin));
            try {
                if (!await stillAllowed()) return;
                await status({ state: 'loading', message: '正在保存刚下载的历史对话…' });
                const response = await fetch(url, { credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(25000) });
                if (!response.ok) throw new Error('导出链接已失效或无法读取，请重新导出并下载。');
                if (Number(response.headers.get('content-length')) > H.MAX_BYTES) throw new Error('导出包超过 256 MB。');
                const text = await H.unzipConversations(await H.readLimited(response.body));
                const conversations = H.parseConversations(text);
                if (!await stillAllowed()) return;
                await store.write({ conversations, savedAt: new Date().toISOString() });
                await rememberOrigin(origin);
                await status({ state: 'ready', count: conversations.length, message: `已保存 ${conversations.length} 个历史对话，更新对话时请先重新导出，再手动下载。` });
            } catch (error) {
                await status({ state: 'error', message: `保存失败，已有对话库仍保留。${error.message}` });
            } finally {
                if (flows.pending[candidate.tabId] === candidate) delete flows.pending[candidate.tabId];
                scheduled.delete(item.id);
                await saveFlows(); await notifyCapture();
            }
        });
        await queue;
    }
    const onCreated = item => { capture(item).catch(() => {}); };
    const onChanged = async delta => {
        if (!delta.state && !delta.finalUrl) return;
        try {
            if (!await canCapture()) return;
            const [item] = await chrome.downloads.search({ id: delta.id });
            if (item) await capture(item);
        } catch { /* Unrelated or removed download. */ }
    };
    let downloads;
    function registerDownloads() {
        if (downloads || !chrome.downloads?.onCreated) return;
        downloads = chrome.downloads;
        downloads.onCreated.addListener(onCreated);
        downloads.onChanged.addListener(onChanged);
    }
    let permissionRevision = 0;
    async function syncPermissionState() {
        const revision = ++permissionRevision;
        const enabled = await canCapture();
        if (revision !== permissionRevision) return;
        if (enabled) registerDownloads();
        else if (downloads) {
            downloads.onCreated.removeListener(onCreated);
            downloads.onChanged.removeListener(onChanged);
            downloads = null;
            scheduled.clear();
        }
        if (!enabled) {
            await flowsReady;
            if (revision !== permissionRevision) return;
            flows.intents = {}; flows.pending = {};
            await saveFlows();
        }
        await chrome.storage.local.set({ deepShareHistoryCaptureEnabled: enabled });
        await notifyCapture();
    }
    // Register available events synchronously so downloads can wake the worker.
    // Every event still checks both permissions before reading a download.
    registerDownloads();
    const permissionsChanged = () => { syncPermissionState().catch(() => {}); };
    chrome.permissions.onAdded.addListener(permissionsChanged);
    chrome.permissions.onRemoved.addListener(permissionsChanged);
    permissionsChanged();
    chrome.runtime.onMessage.addListener((message, sender, respond) => {
        if (!message?.action?.startsWith('history:')) return false;
        if (sender.id !== chrome.runtime.id || !sender.tab || !sourceIsDeepSeek(sender.url) || (sender.frameId || 0) !== 0) {
            respond({ ok: false, error: '仅允许在 DeepSeek 页面访问历史库。' }); return false;
        }
        const started = Date.now();
        const requestId = typeof message.debugRequestId === 'string' && /^[a-z0-9-]{1,80}$/i.test(message.debugRequestId) ? message.debugRequestId : 'legacy';
        const details = { requestId, action: message.action, offset: message.offset, chunkChars: message.chunk?.length, totalChars: message.length };
        const sampled = !message.action.endsWith(':chunk') || message.offset % (32 * H.TRANSFER_CHUNK_SIZE) === 0;
        if (sampled) debug('message.received', details);
        const reply = value => {
            try {
                respond({ ...value, debugWorkerRunId: debug.runId });
                if (sampled) debug('message.reply.sent', { ...details, durationMs: Date.now() - started, chunkChars: value.chunk?.length, count: value.count });
            } catch (error) {
                debug('message.reply.failed', { ...details, durationMs: Date.now() - started }, error);
                // A response serialization error must not become an unhandled
                // rejection and leave the caller waiting until its channel closes.
                try { respond({ ok: false, error: '扩展回复发送失败，请刷新页面再试。', debugWorkerRunId: debug.runId }); }
                catch (fallbackError) { debug('message.reply.fallback.failed', details, fallbackError); }
            }
        };
        if (message.action === 'history:capture:authorize') {
            // Validate against browser-observed metadata before requesting access.
            // A cold worker can restore state, but must require a fresh click to
            // preserve Chrome's user gesture instead of silently broadening scope.
            const pending = flowsLoaded && candidateFor(sender.tab.id);
            if (!pending || pending.state !== 'permission' || pending.id !== message.id || pending.origin !== message.origin) {
                flowsReady.then(notifyCapture).catch(() => {});
                reply({ ok: false, error: '下载授权信息已更新，请再点击一次“授权读取”，或重新下载。' }); return false;
            }
            try {
                chrome.permissions.request(hostPermission(pending.origin)).then(granted => {
                    reply({ ok: true, granted });
                    if (!granted) return;
                    (async () => {
                        await rememberOrigin(pending.origin);
                        const [item] = await chrome.downloads.search({ id: pending.id });
                        if (item && candidateFor(sender.tab.id) === pending) await capture(item);
                    })().catch(error => status({ state: 'error', message: `读取未完成，请重新下载或手动导入文件。${error.message}` }).catch(() => {}));
                }).catch(error => { debug('message.handler.failed', details, error); reply({ ok: false, error: error.message }); });
            } catch (error) { debug('message.handler.failed', details, error); reply({ ok: false, error: error.message }); }
            return true;
        }
        if (message.action === 'history:capture:request') {
            // Preserve the content-script click's user gesture across sendMessage:
            // do not await contains(), storage or other work before request().
            try {
                const origin = message.origin;
                if (origin !== undefined && (!H.isExportURL(origin) || new URL(origin).origin !== origin)) {
                    throw new Error('下载来源无效，请刷新页面后重试。');
                }
                // Combine downloads with one observed origin, never the optional
                // wildcard. This hint alone must never trigger a fetch or import.
                const requested = origin ? { ...capturePermissions, ...hostPermission(origin) } : capturePermissions;
                chrome.permissions.request(requested).then(async granted => {
                    const enabled = await canCapture();
                    // Install listeners before the content script resumes the download.
                    if (enabled) registerDownloads();
                    if (granted && origin) await rememberOrigin(origin);
                    await syncPermissionState();
                    reply({ ok: true, enabled, granted });
                }).catch(error => { debug('message.handler.failed', details, error); reply({ ok: false, error: error.message }); });
            } catch (error) { debug('message.handler.failed', details, error); reply({ ok: false, error: error.message }); }
            return true;
        }
        (async () => {
            if (message.action === 'history:locale') {
                const locales = ['en', 'zh_CN', 'zh_TW', 'es', 'pt_BR', 'pt_PT', 'fr', 'ja', 'de'];
                if (!locales.includes(message.locale)) throw new Error('Unsupported locale');
                const response = await fetch(chrome.runtime.getURL(`_locales/${message.locale}/messages.json`));
                if (!response.ok) throw new Error('Locale unavailable');
                const catalog = await response.json();
                return { ok: true, messages: Object.fromEntries(Object.entries(catalog).filter(([key]) => key.startsWith('history'))) };
            }
            if (message.action === 'history:capture:status') {
                await flowsReady;
                const pending = candidateFor(sender.tab.id);
                return { ok: true, enabled: await canCapture(), pending: pending?.state === 'permission'
                    ? { id: pending.id, origin: pending.origin } : null };
            }
            if (message.action === 'history:capture:arm') {
                await armDownload(sender); return { ok: true };
            }
            if (message.action === 'history:capture:revoke') {
                const { deepShareHistoryGrantedOrigins = [] } = await chrome.storage.local.get('deepShareHistoryGrantedOrigins');
                const required = chrome.runtime.getManifest().host_permissions || [];
                const origins = deepShareHistoryGrantedOrigins.filter(origin => !required.includes(origin));
                await chrome.permissions.remove({ ...capturePermissions, origins });
                await chrome.storage.local.set({ deepShareHistoryGrantedOrigins: [] });
                await syncPermissionState();
                return { ok: true, enabled: await canCapture() };
            }
            if (message.action.startsWith('history:import:')) return importMessage(message, sender);
            if (['history:read', 'history:read:chunk', 'history:read:cancel'].includes(message.action)) return readMessage(message, sender);
            if (message.action === 'history:clear') {
                // Serialize with captures, so a pending download cannot repopulate a cleared library.
                queue = queue.catch(() => {}).then(() => store.clear());
                await queue;
                await status({ state: 'empty', message: '本地历史库已清除。请从系统设置导出并下载以重新建立。' });
                return { ok: true };
            }
            throw new Error('未知历史对话操作。');
        })().then(reply, error => {
            debug('message.handler.failed', { ...details, durationMs: Date.now() - started }, error);
            reply({ ok: false, error: error.message });
        });
        return true;
    });
})();
