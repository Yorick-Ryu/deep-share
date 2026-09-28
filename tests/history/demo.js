/* Offline UI fixture. No real account, requests, downloads or uploads. */
(() => {
    if (new URLSearchParams(location.search).has('dark')) document.body.dataset.demoTheme = 'dark';
    let archive = null;
    const listeners = [];
    let importChunks = [];
    const raw = [
        ['项目技术方案', '我们计划做一个历史对话功能。', '从设置导出，然后在新对话里筛选历史记录。'],
        ['代码与公式示例', '请保留 $E = mc^2$。', '```js\nconst answer = 42;\n```\n\n公式：$E = mc^2$'],
        ['<img src=x onerror=alert(1)>', '测试纯文本预览。', '<script>alert("不应执行")</script>']
    ].map(([title, question, answer], i) => ({ id: `demo-${i}`, title, updated_at: '2026-09-28T06:00:00Z', mapping: {
        root: { parent: null, message: null },
        '1': { parent: 'root', message: { inserted_at: '2026-09-28T05:00:00Z', fragments: [{ type: 'REQUEST', content: question }] } },
        '2': { parent: '1', message: { inserted_at: '2026-09-28T05:01:00Z', fragments: [{ type: 'THINK', content: '这里是可选的思考示例。' }, { type: 'RESPONSE', content: answer }] } }
    } }));
    raw[0].mapping['3'] = { parent: '1', message: { inserted_at: '2026-09-28T05:02:00Z', fragments: [{ type: 'RESPONSE', content: '新版方案：支持关键词搜索、预览、勾选、Markdown 上传。' }] } };
    // Optional long list for scrolling, sticky dates and multiselect animation QA.
    if (new URLSearchParams(location.search).has('long')) {
        raw[1].mapping['2'].message.fragments[1].content += '\n\n' + Array.from({ length: 60 }, (_, i) => `示例段落 ${i + 1}：用于验证切换对话后预览回到顶部。`).join('\n\n');
        for (let i = 0, count = new URLSearchParams(location.search).has('dense') ? 450 : 60; i < count; i++) {
            const date = new Date(); date.setDate(date.getDate() - Math.floor(i / 12));
            raw.push({ ...raw[1], id: `scroll-${i}`, title: `滚动测试对话 ${i + 1}`, updated_at: date.toISOString() });
        }
    }
    globalThis.chrome = {
        runtime: { sendMessage: async ({ action, chunk }) => {
            if (action === 'history:import:start') { importChunks = []; return { ok: true, id: 'demo-import' }; }
            if (action === 'history:import:chunk') { importChunks.push(chunk); return { ok: true }; }
            if (action === 'history:import:cancel') { importChunks = []; return { ok: true }; }
            if (action === 'history:import:finish') {
                try {
                    const conversations = DeepShareHistory.parseConversations(importChunks.join(''));
                    await DeepShareHistoryStore.write({ conversations, savedAt: new Date().toISOString() });
                    return { ok: true, count: conversations.length };
                } catch (error) { return { ok: false, error: error.message }; }
                finally { importChunks = []; }
            }
            if (action === 'history:clear') await DeepShareHistoryStore.clear();
            return { ok: true, archive: await DeepShareHistoryStore.read() };
        } },
        storage: { local: { get: async () => ({}) }, onChanged: { addListener: listener => listeners.push(listener) } }
    };
    document.querySelector('#simulate-export').onclick = async () => {
        archive = { conversations: DeepShareHistory.parseConversations(JSON.stringify(raw)), savedAt: new Date().toISOString() };
        await DeepShareHistoryStore.write(archive);
        listeners.forEach(listener => listener({ deepShareHistoryStatus: { newValue: { state: 'ready', message: `示例：已保存 ${raw.length} 个历史对话。` } } }, 'local'));
    };
    document.querySelector('input[type=file]').onchange = async event => {
        const file = event.target.files[0];
        document.querySelector('#attachment').textContent = `已附加：${file.name}（${file.size} 字节，测试页面未上传至网络）`;
        const text = await file.text();
        document.querySelector('#result').textContent = text.includes('# 历史对话参考资料') ? 'MD 附件验证通过' : 'MD 附件验证失败';
    };
    document.addEventListener('deepshare:convertToDocx', event => {
        const { messages, documentTitle } = event.detail;
        const toast = showToastNotification('正在转换 Word（离线演示）', 'loading', 0);
        setTimeout(() => {
            dismissToastNotification(toast);
            const failed = new URLSearchParams(location.search).has('worderror');
            showToastNotification(failed ? 'Word 转换失败（离线演示）' : 'Word 转换完成（离线演示）', failed ? 'error' : 'success', 0);
        }, 500);
        document.querySelector('#attachment').textContent = `Word 转换请求：${documentTitle}.docx（测试页面未上传至网络）`;
        document.querySelector('#result').textContent = messages.content.includes('这里是可选的思考示例。') ? 'Word 请求包含思考内容' : 'Word 请求不含思考内容';
    });
})();
