const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function setup({ granted = true, tabs = [{ id: 1, url: 'https://chat.deepseek.com/', status: 'complete' }], failFirst = false } = {}) {
    const calls = { css: [], js: [], errors: [], checks: [] };
    let installed;
    const context = vm.createContext({
        URL, importScripts() {},
        console: { debug() {}, error: (...args) => calls.errors.push(args) },
        chrome: {
            runtime: {
                onInstalled: { addListener: fn => { installed = fn; } },
                onMessage: { addListener() {} },
                getManifest: () => ({ content_scripts: [{ matches: ['https://chat.deepseek.com/*'], css: ['styles/style.css'], js: ['scripts/common.js'] }] })
            },
            permissions: { contains: async request => { calls.checks.push(request); return granted; } },
            storage: { sync: { get: (_keys, fn) => fn({ onboardingCompleted: true }) } },
            tabs: { query: async () => tabs },
            scripting: {
                insertCSS: async ({ target }) => { if (failFirst && target.tabId === 1) throw new Error('Cannot access contents of the page.'); calls.css.push(target.tabId); },
                executeScript: async ({ target }) => { calls.js.push(target.tabId); }
            }
        }
    });
    vm.runInContext(fs.readFileSync('background.js', 'utf8'), context);
    return { calls, context, installed };
}
test('updates do not reinject scripts into old pages', async () => {
    const h = setup();
    h.installed({ reason: 'update' });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(h.calls.checks.length, 0);
    assert.deepEqual(h.calls.js, []);
});
test('initial injection skips withheld permissions, discarded and loading tabs', async () => {
    const h = setup({ granted: false });
    await vm.runInContext('injectContentScriptsOnInstall()', h.context);
    assert.deepEqual(h.calls.js, []);
    assert.equal(h.calls.checks[0].origins[0], 'https://chat.deepseek.com/*');
    const inactive = setup({ tabs: [{ id: 2, url: 'https://chat.deepseek.com/', discarded: true }, { id: 3, url: 'https://chat.deepseek.com/', status: 'loading' }] });
    await vm.runInContext('injectContentScriptsOnInstall()', inactive.context);
    assert.equal(inactive.calls.checks.length, 0);
});
test('authorized initial injection still adds CSS and scripts', async () => {
    const h = setup();
    await vm.runInContext('injectContentScriptsOnInstall()', h.context);
    assert.deepEqual(h.calls.css, [1]);
    assert.deepEqual(h.calls.js, [1]);
});
test('access changes on one tab do not block remaining tabs', async () => {
    const h = setup({ failFirst: true, tabs: [{ id: 1, url: 'https://chat.deepseek.com/' }, { id: 2, url: 'https://chat.deepseek.com/' }] });
    await vm.runInContext('injectContentScriptsOnInstall()', h.context);
    assert.deepEqual(h.calls.js, [2]);
    assert.equal(h.calls.errors.length, 0);
});
