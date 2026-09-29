const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const endpoint = 'https://chat.deepseek.com/api/v0/download_export_history';
const body = (data = {}) => ({ code: 0, data: { biz_code: 0, biz_data: {
    status: 'FINISHED', history_download_url: 'https://new-cdn.deepseek.com/export?signature=SECRET',
    expires_at: Math.floor(Date.now() / 1000) + 3600, ...data
} } });
function setup() {
    const posts = [], events = {}, fetches = [];
    class XHR {
        open(...args) { this.openArgs = args; }
        send(...args) { this.sendArgs = args; return 'native-result'; }
        addEventListener(name, handler) { this[name] = handler; }
        complete(data, responseURL = endpoint) {
            this.status = 200; this.responseURL = responseURL; this.responseText = JSON.stringify(data);
            this.load?.();
        }
    }
    const response = { ok: true, url: endpoint, clone: () => ({ json: async () => body() }) };
    const win = {
        fetch(...args) { fetches.push(args); return Promise.resolve(response); },
        postMessage(data, origin) { posts.push({ data: JSON.parse(JSON.stringify(data)), origin }); },
        addEventListener(name, handler) { events[name] = handler; }
    };
    const context = { window: win, location: { href: 'https://chat.deepseek.com/' }, XMLHttpRequest: XHR, URL };
    vm.runInNewContext(fs.readFileSync('scripts/history/export-source.js', 'utf8'), context);
    return { win, XHR, posts, response, fetches, replay: (trusted = true) => events.message({ source: trusted ? win : {}, origin: 'https://chat.deepseek.com', data: { type: 'deepshare:history-export-source:query' } }) };
}
test('observes official XHR while preserving requests and sends only an expiring origin', () => {
    const h = setup(), xhr = new h.XHR();
    xhr.open('GET', '/api/v0/download_export_history', true);
    assert.equal(xhr.send(), 'native-result'); xhr.complete(body());
    const message = h.posts.at(-1);
    assert.equal(message.data.source.origin, 'https://new-cdn.deepseek.com');
    assert.ok(message.data.source.expiresAt <= Date.now() + 5 * 60000);
    assert.equal(message.origin, 'https://chat.deepseek.com');
    assert.doesNotMatch(JSON.stringify(h.posts), /SECRET|signature|history_download_url/);
    h.replay(); assert.equal(h.posts.length, 2);
    h.replay(false); assert.equal(h.posts.length, 2);
});
test('does not observe unrelated, failed or redirected-to-foreign XHR', () => {
    const h = setup();
    for (const path of ['/api/v0/users/current', 'https://evil.example.com/api/v0/download_export_history']) {
        const xhr = new h.XHR(); xhr.open('GET', path); xhr.send(); xhr.complete(body());
    }
    const foreign = new h.XHR(); foreign.open('GET', endpoint); foreign.send(); foreign.complete(body(), 'https://evil.example.com/api/v0/download_export_history');
    assert.equal(h.posts.length, 0);
});
test('clears cached origins for unfinished, expired and malformed export responses', () => {
    const h = setup();
    for (const data of [body(), body({ status: 'PROCESSING' }), body({ expires_at: 1 }), body({ history_download_url: 'http://example.com' }), { error: true }]) {
        const xhr = new h.XHR(); xhr.open('GET', endpoint); xhr.send(); xhr.complete(data);
    }
    assert.equal(h.posts[0].data.source.origin, 'https://new-cdn.deepseek.com');
    assert.ok(h.posts.slice(1).every(post => post.data.source === null));
});
test('fetch observation preserves the original response without consuming its body', async () => {
    const h = setup();
    assert.equal(await h.win.fetch(endpoint, { method: 'GET' }), h.response);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(h.fetches.length, 1);
    assert.equal(h.posts[0].data.source.origin, 'https://new-cdn.deepseek.com');
    assert.doesNotMatch(JSON.stringify(h.posts), /SECRET/);
});
