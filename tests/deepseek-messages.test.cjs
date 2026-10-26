const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('scripts/saveDeepSeekAsDocx.js', 'utf8');

function setup(prompt) {
    const messages = [
        {
            matches: () => true,
            querySelector: selector => selector === '.fbb737a4' ? prompt : null,
            getAttribute: () => '1'
        },
        {
            matches: () => false,
            querySelector: () => null,
            getAttribute: () => '2'
        }
    ];
    const checkboxes = messages.map(message => ({
        classList: { contains: () => true },
        closest: () => message
    }));
    const context = vm.createContext({
        console: { log() {} },
        Node: { TEXT_NODE: 3 },
        document: {
            addEventListener() {},
            querySelector: () => null,
            querySelectorAll: selector => selector === '.d30139ff .ds-checkbox' ? checkboxes : messages
        }
    });
    vm.runInContext(source, context);
    // Isolate prompt collection from the unrelated clipboard-based AI extractor.
    vm.runInContext('extractAIMessageContent = async () => "Assistant response"', context);
    return context;
}

for (const [name, prompt, expected] of [
    ['nested collapsible prompt', {
        childNodes: [{ nodeType: 1, textContent: '2 099 ₽  是多少人民币' }],
        innerText: '2 099 ₽  是多少人民币'
    }, '2 099 ₽  是多少人民币'],
    ['mixed direct and nested text with multiple lines', {
        childNodes: [
            { nodeType: 3, textContent: '第一行' },
            { nodeType: 1, textContent: '第二行' },
            { nodeType: 3, textContent: '第三行' }
        ],
        innerText: '第一行\n第二行\n\n第三行'
    }, '第一行\n第二行\n\n第三行'],
    ['legacy direct text', {
        childNodes: [{ nodeType: 3, textContent: '  原有输入  ' }],
        innerText: '  原有输入  '
    }, '原有输入'],
    ['empty prompt', { childNodes: [], innerText: '  ' }, null],
    ['missing prompt', null, null]
]) {
    test(`both collection paths preserve ${name} and message order`, async () => {
        const context = setup(prompt);
        const expectedMessages = [
            ...(expected ? [{ role: 'User', content: expected }] : []),
            { role: 'Assistant', content: 'Assistant response' }
        ];
        const selected = await vm.runInContext('getSelectedDeepSeekMessages()', context);
        assert.deepEqual(JSON.parse(JSON.stringify(selected)), expectedMessages);

        const scrolled = await vm.runInContext(`(async () => {
            const collected = new Map();
            await collectVisibleMessages(collected);
            await collectVisibleMessages(collected);
            return Array.from(collected.values());
        })()`, context);
        assert.deepEqual(JSON.parse(JSON.stringify(scrolled)), expectedMessages);
    });
}
