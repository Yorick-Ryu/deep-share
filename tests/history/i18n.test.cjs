const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { conversation } = require('./fixtures.cjs');
const locales = ['en', 'zh_CN', 'zh_TW', 'es', 'pt_BR', 'pt_PT', 'fr', 'ja', 'de'];
function environment(preferredLanguage = 'auto', browser = 'en-US', unavailable = false) {
    const context = { TextEncoder, Date, URL, module: { exports: {} },
        chrome: { storage: { sync: { get: async () => ({ preferredLanguage }) } },
            i18n: { getUILanguage: () => browser }, runtime: { getURL: path => path } },
        fetch: async path => ({ ok: !unavailable, json: async () => JSON.parse(fs.readFileSync(path, 'utf8')) }) };
    context.chrome.runtime.sendMessage = async ({ action, locale }) => {
        assert.equal(action, 'history:locale');
        const response = await context.fetch(`_locales/${locale}/messages.json`);
        return { ok: response.ok, messages: response.ok ? await response.json() : null };
    };
    vm.createContext(context);
    for (const file of ['i18n', 'core']) vm.runInContext(fs.readFileSync(`scripts/history/${file}.js`, 'utf8'), context);
    return { I: context.DeepShareHistoryI18n, H: context.DeepShareHistory, context };
}
test('all nine catalogs include history messages with matching placeholders', () => {
    const english = JSON.parse(fs.readFileSync('_locales/en/messages.json'));
    const keys = Object.keys(english).filter(key => key.startsWith('history'));
    assert.ok(keys.length > 50);
    for (const locale of locales) {
        const messages = JSON.parse(fs.readFileSync(`_locales/${locale}/messages.json`));
        for (const key of keys) {
            assert.ok(messages[key]?.message, `${locale}: ${key}`);
            assert.deepEqual(messages[key].message.match(/\$\w+\$/g), english[key].message.match(/\$\w+\$/g), `${locale}: ${key}`);
            if (!['zh_CN', 'zh_TW', 'ja'].includes(locale)) assert.doesNotMatch(messages[key].message, /\p{Script=Han}/u);
        }
    }
});
test('explicit extension preference overrides site; auto follows site, then browser', async () => {
    for (const [preference, site, browser, expected] of [
        ['de', 'en-US', 'zh-CN', 'de'], ['auto', 'en-US', 'zh-CN', 'en'],
        ['auto', 'zh-Hant-HK', 'en-US', 'zh_TW'], ['auto', 'pt-PT', 'en', 'pt_PT'],
        ['auto', 'pt-BR', 'en', 'pt_BR'], ['auto', '', 'ja-JP', 'ja'],
        ['auto', 'ar', 'en-US', 'en']
    ]) {
        const { I } = environment(preference, browser); await I.init(site); assert.equal(I.locale, expected);
    }
});
test('translations preserve substitutions and conversation content in exported Markdown', async () => {
    for (const locale of locales) {
        const { I, H } = environment(locale); await I.init('en');
        assert.ok(I.t('已选 $1 个对话', [7]).includes('7'));
        assert.ok(I.t('选择 $1', ['<b>$&</b>']).includes('<b>$&</b>'));
        const [c] = H.parseConversations(JSON.stringify([conversation()]));
        const md = H.markdown([c], { thinking: true });
        assert.ok(md.includes('## ' + I.t('用户')));
        assert.ok(md.includes('### ' + I.t('思考内容')));
        assert.ok(md.includes('```js\nconst x = 2;\n```'));
        assert.ok(md.includes('$x^2$')); assert.ok(md.includes('思考示例'));
        assert.equal(H.dateGroup('', new Date()), I.t('更早'));
        assert.equal(H.filename([{ title: 'CON' }, { title: 'x' }]), '_CON' + I.t('等多个对话') + '.md');
        assert.doesNotMatch(I.error('导入失败，已有历史库仍保留。ZIP 内容损坏。'), /\$value\$/);
    }
});
test('missing locale falls back to English, including old worker errors', async () => {
    const { I } = environment('fr', 'en', true); await I.init('fr');
    assert.equal(I.t('导入历史对话'), 'Import chat history');
    assert.equal(I.t('选择 $1', ['Math']), 'Select Math');
    assert.match(I.error('导出包超过 64 MB，暂无法处理。'), /64 MB/);
    assert.doesNotMatch(I.error('保存失败，已有对话库仍保留。网络错误'), /\p{Script=Han}/u);
});
test('stale locale loads cannot replace the latest language', async () => {
    const { I, context } = environment();
    let resolveFrench;
    context.fetch = path => path.includes('/fr/') ? new Promise(resolve => { resolveFrench = resolve; })
        : Promise.resolve({ ok: true, json: async () => JSON.parse(fs.readFileSync(path)) });
    const first = I.init('fr'); await new Promise(resolve => setImmediate(resolve));
    await I.init('de');
    resolveFrench({ ok: true, json: async () => JSON.parse(fs.readFileSync('_locales/fr/messages.json')) });
    assert.equal(await first, false); assert.equal(I.locale, 'de');
});
test('native export labels distinguish downloads, re-exports and destructive controls', () => {
    const H = require('../../scripts/history/core.js');
    const labels = [
        ['导出所有历史对话', '下载', '重新导出', '删除所有对话'],
        ['匯出所有歷史對話', '下載', '重新匯出', '刪除所有對話'],
        ['Export data', 'Download', 'Re-exporting', 'Delete all chats'],
        ['Daten exportieren', 'Herunterladen', 'Erneut exportieren', 'Alle Chats löschen'],
        ['Exporter les données', 'Télécharger', 'Réexporter', 'Supprimer tous les dialogues'],
        ['Exportar datos', 'Descargar', 'Reexportar', 'Eliminar todos los chats'],
        ['Exportar dados', 'Baixar', 'Reexportar', 'Excluir todas as conversas'],
        ['Exportar dados', 'Descarregar', 'Reexportar', 'Eliminar todas as conversas'],
        ['データをエクスポート', 'ダウンロード', '再エクスポート', 'すべてのチャットを削除']
    ];
    for (const [heading, download, reexport, deletion] of labels) {
        assert.ok(H.nativeLabel('heading', heading)); assert.ok(H.nativeLabel('download', download));
        assert.ok(H.nativeLabel('reexport', reexport)); assert.ok(H.nativeLabel('delete', heading + deletion, true));
        assert.equal(H.nativeLabel('download', reexport), false);
        assert.equal(H.nativeLabel('download', deletion), false);
        assert.equal(H.nativeLabel('download', 'Other ' + download), false);
    }
});
