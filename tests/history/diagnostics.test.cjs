const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function harness(failConsole = false) {
    const output = [], storageCalls = [];
    const api = { runtime: { getManifest: () => ({ version: '1.9.6' }) }, storage: { local: Object.fromEntries(
        ['get', 'set', 'remove'].map(name => [name, () => { storageCalls.push(name); throw Error('Diagnostics must not use storage'); }])
    ) } };
    const context = { console: Object.fromEntries(['debug', 'info', 'warn', 'error'].map(level => [level, (...values) => {
        if (failConsole) throw Error('console unavailable');
        output.push({ level, entry: JSON.parse(values[1]) });
    }])) };
    vm.runInNewContext(fs.readFileSync('scripts/history/core.js', 'utf8'), context);
    return { output, storageCalls, create: scope => context.DeepShareHistory.createDiagnostics(scope, api) };
}
test('diagnostics only print sanitized metadata and never read or write storage', () => {
    const h = harness(), log = h.create('page');
    for (let i = 0; i < 125; i++) log('request.done', { requestId: `trace-${i}`, action: 'history:read', durationMs: i,
        content: 'PRIVATE BODY', fileName: 'PRIVATE FILE', url: 'https://secret.example?token=PRIVATE TOKEN', apiKey: 'PRIVATE KEY' });
    const error = new Error('PRIVATE ERROR: conversation title and API key');
    error.stack = 'Error: PRIVATE ERROR\n at fn (chrome-extension://oljnfjcmboabapboepidmkbmpfkfccck/scripts/history/content.js:42:10)';
    log('request.failed', { requestId: 'trace-failed' }, error);
    const { entry } = h.output.at(-1);
    assert.equal(entry.errorCode, 'OPERATION_FAILED');
    assert.deepEqual(Array.from(entry.frames), ['scripts/history/content.js:42:10']);
    assert.equal(entry.version, '1.9.6');
    assert.doesNotMatch(JSON.stringify(h.output), /PRIVATE|secret\.example/);
    assert.deepEqual(h.storageCalls, []);
});
test('normal progress is debug, import summaries info, slow requests warn and failures error', () => {
    const h = harness(), log = h.create('page');
    for (const event of ['page.ready', 'request.start', 'request.done', 'archive.load.done', 'import.parse.done']) log(event);
    assert.ok(h.output.every(record => record.level === 'debug'));
    log('import.saved', { count: 272 }); assert.equal(h.output.at(-1).level, 'info');
    log('request.waiting'); assert.equal(h.output.at(-1).level, 'warn');
    log('archive.transfer.expired'); assert.equal(h.output.at(-1).level, 'warn');
    log('request.failed', {}, new Error('message channel closed before a response was received'));
    assert.equal(h.output.at(-1).level, 'error'); assert.equal(h.output.at(-1).entry.errorCode, 'CHANNEL_CLOSED');
    log('message.reply.failed', {}, new TypeError('Message exceeded maximum allowed size of 64MiB.'));
    assert.equal(h.output.at(-1).level, 'error'); assert.equal(h.output.at(-1).entry.errorCode, 'MESSAGE_TOO_LARGE');
    // Higher-level handlers add context in Verbose without duplicating the Error entry.
    log('archive.load.failed', {}, new Error('offline')); assert.equal(h.output.at(-1).level, 'debug');
    assert.deepEqual(h.storageCalls, []);
});
test('unavailable console does not break history operations', () => {
    const log = harness(true).create('worker');
    assert.doesNotThrow(() => log('message.reply.failed', {}, new Error('offline')));
});
