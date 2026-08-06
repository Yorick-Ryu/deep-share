/**
 * KaTeX formula copy functionality
 * Adds click events to KaTeX formulas to allow copying the LaTeX code or MathML
 * Uses in-page converter for LaTeX to MathML conversion via MathJax or KaTeX
 */

// 存储全局设置对象，便于快速访问
let formulaSettings = {
    enableFormulaCopy: true,  // 默认启用
    formulaFormat: 'mathml',  // 默认使用 MathML
    formulaEngine: 'mathjax'  // 默认使用 MathJax
};

// Function to add copy functionality to KaTeX formulas
function enableKatexCopy() {
    // Find all KaTeX elements on the page
    const katexElements = document.querySelectorAll('.katex');

    katexElements.forEach(element => {
        // Make sure we haven't already processed this element
        if (element.dataset.katexCopyEnabled) return;

        // Mark as processed
        element.dataset.katexCopyEnabled = 'true';

        // Add click event listener
        element.addEventListener('click', handleKatexClick);

        // Add cursor pointer style to indicate clickability
        updateElementStyle(element);
    });
}

// Read the LaTeX source from both legacy KaTeX markup and current ChatGPT markup.
function getLatexSource(element) {
    const annotation = element.querySelector('.katex-mathml annotation[encoding="application/x-tex"]');
    const sourceElement = element.closest('[data-math-source], [role="math"][aria-label]');

    return annotation?.textContent?.trim()
        || sourceElement?.getAttribute('data-math-source')?.trim()
        || sourceElement?.getAttribute('aria-label')?.trim()
        || '';
}

// Clipboard copy events must be handled synchronously. KaTeX can synchronously
// produce MathML, so use it for mixed text-and-formula selections.
function convertLatexToMathMLSync(latexCode, displayMode = false) {
    try {
        if (typeof katex === 'undefined') return '';

        const container = document.createElement('div');
        katex.render(latexCode, container, {
            output: 'mathml',
            throwOnError: false,
            displayMode
        });

        const mathElement = container.querySelector('math');
        if (!mathElement) return '';

        if (!mathElement.hasAttribute('xmlns')) {
            mathElement.setAttribute('xmlns', 'http://www.w3.org/1998/Math/MathML');
        }
        return mathElement.outerHTML;
    } catch (error) {
        console.error('DeepShare: Failed to convert selected formula to MathML:', error);
        return '';
    }
}

// Preserve formulas when a mixed range of ChatGPT text is copied into Word.
function handleSelectionCopy(event) {
    if (!formulaSettings.enableFormulaCopy || !event.clipboardData) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const selectedFormulaSources = Array.from(document.querySelectorAll('[data-math-source]'))
        .filter(element => {
            try {
                return range.intersectsNode(element);
            } catch (error) {
                return false;
            }
        })
        .map(element => ({
            latex: element.getAttribute('data-math-source')?.trim()
                || element.getAttribute('aria-label')?.trim()
                || '',
            displayMode: element.style.display === 'block'
                || Boolean(element.querySelector('.katex-display'))
        }))
        .filter(formula => formula.latex);

    if (selectedFormulaSources.length === 0) return;

    const fragment = range.cloneContents();
    const container = document.createElement('div');
    container.appendChild(fragment);

    // Match cloned KaTeX nodes to the intersected source elements in document
    // order. This also handles a range that starts or ends inside a formula,
    // where cloneContents() may omit the outer data-math-source wrapper.
    Array.from(container.querySelectorAll('.katex')).forEach((katexElement, index) => {
        const formula = selectedFormulaSources[index];
        if (!formula) return;
        const mathML = convertLatexToMathMLSync(formula.latex, formula.displayMode);
        if (!mathML) return;

        const replacement = document.createElement(formula.displayMode ? 'div' : 'span');
        replacement.setAttribute('data-deepshare-formula', 'true');
        if (formula.displayMode) {
            replacement.style.textAlign = 'center';
            replacement.style.margin = '0.5em 0';
        }
        replacement.innerHTML = mathML;
        const formulaRoot = katexElement.closest('[data-math-source]') || katexElement;
        formulaRoot.replaceWith(replacement);
    });

    event.clipboardData.setData('text/html', container.innerHTML);
    event.clipboardData.setData('text/plain', selection.toString());
    event.preventDefault();
    event.stopImmediatePropagation();

    window.showToastNotification(
        chrome.i18n?.getMessage('formulaCopied') || 'Selection copied with formulas!',
        'success'
    );
}

// 集中处理点击事件的函数
async function handleKatexClick(e) {
    // 如果功能被禁用，直接返回
    if (!formulaSettings.enableFormulaCopy) {
        return;
    }

    const latexCode = getLatexSource(this);

    if (!latexCode) {
        console.warn('DeepShare: Could not find the LaTeX source for this formula');
        window.showToastNotification(chrome.i18n?.getMessage('copyFailed') || 'Failed to copy formula', 'error');
        return;
    }

    try {
        let textToCopy;
        // Use the format specified in settings
        if (formulaSettings.formulaFormat === 'latex') {
            // Copy raw LaTeX
            textToCopy = latexCode;
        } else if (formulaSettings.formulaFormat === 'dollarLatex') {
            // Copy LaTeX wrapped in $$ for Markdown (Lark/Notion/Obsidian)
            textToCopy = `$$${latexCode}$$`;
        } else {
            // Convert LaTeX to MathML via background script
            textToCopy = await convertLatexToMathML(latexCode);
        }

        // Copy to clipboard
        await navigator.clipboard.writeText(textToCopy);

        // Show visual feedback with localized message using the toast notification
        window.showToastNotification(chrome.i18n?.getMessage('formulaCopied') || 'Formula copied!', 'success');
    } catch (error) {
        console.error('Failed to copy formula:', error);
        window.showToastNotification(chrome.i18n?.getMessage('copyFailed'), 'error');
    }
}

// 更新元素样式和提示
function updateElementStyle(element) {
    if (formulaSettings.enableFormulaCopy) {
        element.style.cursor = 'pointer';
        element.title = chrome.i18n?.getMessage('clickToCopyFormula');
    } else {
        element.style.cursor = '';
        element.title = '';
    }
}

// 更新所有已处理元素的样式和行为
function updateAllElements() {
    const katexElements = document.querySelectorAll('.katex[data-katex-copy-enabled="true"]');
    katexElements.forEach(updateElementStyle);
}

// Function to convert LaTeX to MathML via in-page converter
async function convertLatexToMathML(latexCode, displayMode = true) {
    try {
        if (window.deepShareFormulaConverter) {
            return await window.deepShareFormulaConverter.convertLatexToMathML(latexCode, {
                displayMode,
                engine: formulaSettings.formulaEngine
            });
        }
        console.error('MathML converter not available');
        return latexCode;
    } catch (error) {
        console.error('Error converting MathML:', error);
        return latexCode; // Fallback to original LaTeX code
    }
}

// 加载设置
function loadSettings() {
    chrome.storage.sync.get({
        enableFormulaCopy: true,   // 默认启用
        formulaFormat: 'mathml',   // 默认使用 MathML
        formulaEngine: 'mathjax'   // 默认使用 MathJax
    }, (settings) => {
        formulaSettings = settings;
        updateAllElements();
        enableKatexCopy();
    });
}

// Initialize when DOM is loaded
function initKatexCopy() {

    console.debug('DeepShare Formula copy functionality initialized');

    // 首先加载设置
    loadSettings();

    // Handle native range copying so Word receives MathML instead of KaTeX's
    // visual-only spans. Capture mode runs before ChatGPT's own copy handlers.
    document.addEventListener('copy', handleSelectionCopy, true);

    // Use MutationObserver to handle dynamically added KaTeX elements
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            if (mutation.addedNodes.length > 0) {
                enableKatexCopy();
            }
        });
    });

    // Start observing
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Listen for settings changes and re-apply
    chrome.storage.onChanged.addListener((changes) => {
        if (changes.enableFormulaCopy) {
            formulaSettings.enableFormulaCopy = changes.enableFormulaCopy.newValue;
        }
        if (changes.formulaFormat) {
            formulaSettings.formulaFormat = changes.formulaFormat.newValue;
        }
        if (changes.formulaEngine) {
            formulaSettings.formulaEngine = changes.formulaEngine.newValue;
        }
        // 如果相关设置有变更，更新所有元素
        if (changes.enableFormulaCopy || changes.formulaFormat || changes.formulaEngine) {
            updateAllElements();
        }
    });
}

// Run initialization
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initKatexCopy);
} else {
    initKatexCopy();
}
