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

// 集中处理点击事件的函数
async function handleKatexClick(e) {
    // 如果功能被禁用，直接返回
    if (!formulaSettings.enableFormulaCopy) {
        return;
    }

    // Find the annotation element that contains the LaTeX code
    const annotation = this.querySelector('.katex-mathml annotation[encoding="application/x-tex"]');

    if (annotation) {
        // Trim whitespace from LaTeX code before copying
        const latexCode = annotation.textContent.trim();

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
            window.showToastNotification(chrome.i18n.getMessage('formulaCopied'), 'success');
        } catch (error) {
            console.error('Failed to copy formula:', error);
            window.showToastNotification(chrome.i18n.getMessage('copyFailed'), 'error');
        }
    }
}

// 更新元素样式和提示
function updateElementStyle(element) {
    if (formulaSettings.enableFormulaCopy) {
        element.style.cursor = 'pointer';
        element.title = chrome.i18n.getMessage('clickToCopyFormula');
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
