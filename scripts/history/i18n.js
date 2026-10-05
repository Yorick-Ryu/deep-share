/* History translations use the same catalogs and preference as the popup.
 * Automatic mode follows the site's language, then the browser language.
 * Source strings also let older worker errors be localized after an update. */
(() => {
    const sources = {
    "导入历史对话": "historyTitle",
    "授权读取": "historyAllow",
    "关闭": "historyClose",
    "历史对话列表": "historyList",
    "搜索历史对话": "historySearch",
    "搜索标题或对话正文": "historySearchHint",
    "多选": "historyMulti",
    "退出多选": "historyExitMulti",
    "选择 $1": "historySelect",
    "已选 $1 个对话": "historySelected",
    "当前对话": "historyCurrent",
    "未选择对话": "historyNone",
    "用户": "historyUser",
    "思考内容": "historyThinking",
    "包含思考内容": "historyIncludeThinking",
    "（无文本正文）": "historyNoText",
    "附件：$1（仅文件名）": "historyFiles",
    "没有找到匹配的对话，试试其他关键词。": "historyNoMatches",
    "下载Markdown": "historyDownloadMD",
    "导出 Word": "historyWord",
    "导入": "historyImport",
    "导入中…": "historyImporting",
    "刷新": "historyRefresh",
    "清除本地历史库": "historyClear",
    "确认清除？": "historyConfirmClear",
    "清除中…": "historyClearing",
    "查看历史库": "historyView",
    "今天": "historyToday",
    "昨天": "historyYesterday",
    "7 天内": "historyWeek",
    "30 天内": "historyMonth",
    "更早": "historyOlder",
    "更新时间：$1": "historyUpdated",
    "未知": "historyUnknown",
    "正文": "historyBody",
    "附件（需另行上传原文件）：$1": "historyFileNote",
    "历史对话": "historyFilename",
    "等多个对话": "historyFilenameSuffix",
    "未命名对话": "historyUntitled",
    "导入已下载的 DeepSeek ZIP 导出包或 conversations.json": "historyImportHint",
    "请在 DeepSeek「系统设置 → 数据管理」导出历史对话，点击“下载”时可直接保存到历史库。也可点击下方“导入历史对话”选择已下载的 ZIP 或 JSON 文件。": "historyEmpty",
    "使用 DeepShare 文档转换服务，发送所选内容并沿用插件的 API-Key 设置": "historyWordHint",
    "未授权读取导出包，仍可手动导入已下载的文件。": "historyDenied",
    "允许读取 $1 的本次导出包": "historyAllowHost",
    "允许识别手动下载的官方历史对话": "historyAllowHint",
    "下载已完成，请点击“授权读取”读取本次导出包。": "historyDownloaded",
    "点击“授权读取”后，将本次导出包保存到本地历史库。": "historyPending",
    "点击下载时可授权保存到本地历史库。拒绝授权仍可正常下载，也可在历史库中手动导入文件。": "historyCaptureHint",
    "已保存 $1 个历史对话。如需同步最新对话，请先重新导出，待生成完成后再点击下载。": "historySaved",
    "请先导出历史对话，待生成完成后点击下载同步；如需获取最新对话，请先重新导出。": "historySyncHint",
    "重新导出": "historyReexport",
    "下载": "historyDownload",
    "暂未找到可用的文档上传入口。请下载 MD，再通过 DeepSeek 输入框的附件按钮上传。": "historyUploadMissing",
    "浏览器未能自动附加文件，请下载 MD 后从 DeepSeek 附件按钮上传。": "historyUploadFailed",
    "插件连接中断，请刷新页面再试。": "historyConnection",
    "导出包超过 64 MB。": "historySize",
    "请选择 DeepSeek 导出的 ZIP 或 JSON 文件。": "historyChooseFile",
    "导入失败，已有历史库仍保留。": "historyImportFailed",
    "历史文件无效或不完整，请重新导出或下载。": "historyInvalidArchive",
    "操作未完成，请重试。已有历史库仍保留。": "historyOperationFailed",
    "正在保存刚下载的历史对话…": "historySaving",
    "此下载地址无法安全读取，请在历史库中手动导入已下载的 ZIP 文件。": "historyManualImport",
    "下载授权信息已更新，请再点击一次“授权读取”，或重新下载。": "historyPermissionExpired",
    "本地历史库已清除。请从系统设置导出并下载以重新建立。": "historyCleared"
};
    const english = {
    "historyTitle": "Import chat history",
    "historyAllow": "Allow access",
    "historyClose": "Close",
    "historyList": "Chat history",
    "historySearch": "Search history",
    "historySearchHint": "Search titles or messages",
    "historyMulti": "Select chats",
    "historyExitMulti": "Exit selection",
    "historySelect": "Select $1",
    "historySelected": "Selected chats: $1",
    "historyCurrent": "Current chat",
    "historyNone": "No chat selected",
    "historyUser": "User",
    "historyThinking": "Thinking",
    "historyIncludeThinking": "Include thinking",
    "historyNoText": "(No text content)",
    "historyFiles": "Attachments: $1 (filenames only)",
    "historyNoMatches": "No matching chats. Try another keyword.",
    "historyDownloadMD": "Download Markdown",
    "historyWord": "Export Word",
    "historyImport": "Import",
    "historyImporting": "Importing…",
    "historyRefresh": "Refresh",
    "historyClear": "Clear local history",
    "historyConfirmClear": "Confirm clear?",
    "historyClearing": "Clearing…",
    "historyView": "Open history",
    "historyToday": "Today",
    "historyYesterday": "Yesterday",
    "historyWeek": "Last 7 days",
    "historyMonth": "Last 30 days",
    "historyOlder": "Earlier",
    "historyUpdated": "Updated: $1",
    "historyUnknown": "Unknown",
    "historyBody": "Content",
    "historyFileNote": "Attachments (upload original files separately): $1",
    "historyFilename": "Chat history",
    "historyFilenameSuffix": " and other chats",
    "historyUntitled": "Untitled chat",
    "historyImportHint": "Import a downloaded DeepSeek ZIP or conversations.json",
    "historyEmpty": "Export your history in DeepSeek Settings → Data Management, then download it to save it locally. Or import a downloaded ZIP or JSON below.",
    "historyWordHint": "Send selected content to DeepShare’s document conversion service using your configured API key",
    "historyDenied": "Access was not granted. You can still import the downloaded file manually.",
    "historyAllowHost": "Allow reading this export from $1",
    "historyAllowHint": "Allow detection of manually downloaded official history exports",
    "historyDownloaded": "Download complete. Click “Allow access” to read this export.",
    "historyPending": "Click “Allow access” to save this export to your local history.",
    "historyCaptureHint": "When you download, you can allow saving to local history. Declining still allows the download and manual import.",
    "historySaved": "Saved chats: $1. For newer chats, re-export first, wait for it to finish, then download.",
    "historySyncHint": "Export your history, wait for it to finish, then download. Re-export to include newer chats.",
    "historyReexport": "Re-export",
    "historyDownload": "Download",
    "historyUploadMissing": "No document upload control found. Download Markdown and upload it with DeepSeek’s attachment button.",
    "historyUploadFailed": "Automatic attachment failed. Download Markdown and attach it manually in DeepSeek.",
    "historyConnection": "Extension disconnected. Refresh the page and try again.",
    "historySize": "The export exceeds 64 MB.",
    "historyChooseFile": "Choose a ZIP or JSON file exported by DeepSeek.",
    "historyImportFailed": "Import failed. Your existing history is unchanged.",
    "historyInvalidArchive": "Invalid or incomplete history file. Export or download it again.",
    "historyOperationFailed": "Operation failed. Try again; your existing history is unchanged.",
    "historySaving": "Saving downloaded history…",
    "historyManualImport": "Cannot read this download safely. Import the downloaded ZIP manually in the history library.",
    "historyPermissionExpired": "Download access details changed. Click “Allow access” again or download again.",
    "historyCleared": "Local history cleared. Export and download again to rebuild it."
};
    const supported = ['en', 'zh_CN', 'zh_TW', 'es', 'pt_BR', 'pt_PT', 'fr', 'ja', 'de'];
    let messages = {}, locale = 'en', revision = 0;
    function resolveLocale(value) {
        const name = String(value || '').replace(/_/g, '-').toLowerCase();
        if (name.startsWith('zh')) return /(?:tw|hk|hant)/.test(name) ? 'zh_TW' : 'zh_CN';
        if (name.startsWith('pt')) return name === 'pt-pt' ? 'pt_PT' : 'pt_BR';
        return supported.find(item => item === name.split('-')[0]) || 'en';
    }
    function format(message, values = []) {
        const args = Array.isArray(values) ? values : [values];
        return message.replace(/\$(\d+)/g, (_, n) => String(args[Number(n) - 1] ?? ''));
    }
    function t(source, values = []) {
        const key = sources[source];
        if (!key) return format(source, values);
        const entry = messages[key];
        let message = entry?.message || english[key];
        if (entry) message = message.replace(/\$([a-z_]+)\$/gi, (token, name) => entry.placeholders?.[name.toLowerCase()]?.content ?? token);
        return format(message, values);
    }
    function error(message) {
        const text = String(message || '');
        if (sources[text]) return t(text);
        for (const prefix of ['导入失败，已有历史库仍保留。']) {
            if (text.startsWith(prefix)) return t(prefix) + ' ' + error(text.slice(prefix.length));
        }
        if (/64 MB/.test(text)) return t('导出包超过 64 MB。');
        if (/ZIP|JSON|conversations\.json|对话分支|对话格式|对话 ID|可识别的消息|没有对话/.test(text)) return t('历史文件无效或不完整，请重新导出或下载。');
        // Browser-generated errors may already be localized. Never rewrite
        // conversation content; this helper is only for operation failures.
        if (/[\u3400-\u9fff]/.test(text)) return t('操作未完成，请重试。已有历史库仍保留。');
        return text || t('操作未完成，请重试。已有历史库仍保留。');
    }
    async function init(pageLanguage) {
        const current = ++revision;
        const settings = await chrome.storage.sync.get('preferredLanguage');
        const preferred = settings.preferredLanguage;
        const next = resolveLocale(preferred && preferred !== 'auto' ? preferred : pageLanguage || chrome.i18n.getUILanguage());
        let loaded = {};
        try {
            // Content scripts cannot fetch private extension resources from
            // every page. Let our worker read the bundled catalog; do not make
            // it web-accessible or request additional host permissions.
            const response = await chrome.runtime.sendMessage({ action: 'history:locale', locale: next });
            if (!response?.ok || !response.messages) throw new Error('Locale unavailable');
            loaded = response.messages;
        } catch { /* English fallback is bundled, even if a locale cannot load. */ }
        if (current !== revision) return false;
        messages = loaded; locale = next;
        return true;
    }
    globalThis.DeepShareHistoryI18n = { t, error, init, resolveLocale, get locale() { return locale; } };
    if (typeof module !== 'undefined') module.exports = globalThis.DeepShareHistoryI18n;
})();
