/* Observe only DeepSeek's own export-status response; never read auth headers. */
(() => {
    if (window.__deepShareExportSourceObserver) return;
    window.__deepShareExportSourceObserver = true;
    const endpoint = '/api/v0/download_export_history';
    const channel = 'deepshare:history-export-source';
    let source = null;
    function isEndpoint(value) {
        try {
            const url = new URL(value, location.href);
            return url.origin === 'https://chat.deepseek.com' && url.pathname === endpoint;
        } catch { return false; }
    }
    function publish() {
        if (source?.expiresAt <= Date.now()) source = null;
        window.postMessage({ type: channel, source }, 'https://chat.deepseek.com');
    }
    function observe(body) {
        source = null;
        const data = body?.data?.biz_data;
        if (body?.code === 0 && body.data?.biz_code === 0 && data?.status === 'FINISHED') {
            try {
                const url = new URL(data.history_download_url);
                const expiresAt = Math.min(Number(data.expires_at) * 1000, Date.now() + 5 * 60000);
                if (url.protocol === 'https:' && !url.username && !url.password && expiresAt > Date.now()) {
                    // Only the origin crosses worlds. Never retain or publish signed URLs.
                    source = { origin: url.origin, expiresAt };
                }
            } catch { /* Unsupported export response: use download-based discovery. */ }
        }
        publish();
    }
    const open = XMLHttpRequest.prototype.open;
    const send = XMLHttpRequest.prototype.send;
    const requests = new WeakMap();
    XMLHttpRequest.prototype.open = function (method, url, ...args) {
        requests.set(this, isEndpoint(url));
        return Reflect.apply(open, this, [method, url, ...args]);
    };
    XMLHttpRequest.prototype.send = function (...args) {
        if (requests.get(this)) {
            this.addEventListener('load', () => {
                try {
                    if (this.status !== 200 || !isEndpoint(this.responseURL)) return;
                    observe(this.responseType === 'json' ? this.response : JSON.parse(this.responseText));
                } catch { /* Observation must not interfere with the official request. */ }
            }, { once: true });
        }
        return Reflect.apply(send, this, args);
    };
    // Keep compatibility if DeepSeek moves this endpoint from XHR to fetch.
    const originalFetch = window.fetch;
    window.fetch = function (...args) {
        const result = Reflect.apply(originalFetch, this, args);
        const url = typeof args[0] === 'string' || args[0] instanceof URL ? args[0] : args[0]?.url;
        if (isEndpoint(url)) result.then(response => {
            if (response.ok && isEndpoint(response.url)) return response.clone().json().then(observe);
        }).catch(() => {});
        return result;
    };
    window.addEventListener('message', event => {
        if (event.source === window && event.origin === 'https://chat.deepseek.com' && event.data?.type === `${channel}:query`) publish();
    });
})();
