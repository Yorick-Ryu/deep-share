/**
 * Gemini Math formula copy functionality
 * Adds click events to Gemini math formulas to allow copying the LaTeX code or MathML
 * Uses in-page converter for LaTeX to MathML conversion via MathJax or KaTeX
 */

// 存储全局设置对象，便于快速访问
let formulaSettings = {
    enableFormulaCopy: true,  // 默认启用
    formulaFormat: 'mathml',  // 默认使用 MathML
    formulaEngine: 'katex'  // 默认使用 KaTeX
};

// Function to add copy functionality to Gemini math formulas
function enableGeminiMathCopy() {
    // Find all Gemini math elements on the page (both inline and block)
    const mathElements = document.querySelectorAll('.math-inline, .math-block');

    mathElements.forEach(element => {
        // Make sure we haven't already processed this element
        if (element.dataset.geminiMathCopyEnabled) return;

        // Mark as processed
        element.dataset.geminiMathCopyEnabled = 'true';

        // Add click event listener
        element.addEventListener('click', handleGeminiMathClick);

        // Add cursor pointer style to indicate clickability
        updateElementStyle(element);
    });
}

// 集中处理点击事件的函数
async function handleGeminiMathClick(e) {
    // 如果功能被禁用，直接返回
    if (!formulaSettings.enableFormulaCopy) {
        return;
    }

    // Get the LaTeX code from data-math attribute
    const latexCode = this.dataset.math;

    if (latexCode) {
        try {
            let textToCopy;
            // Use the format specified in settings
            if (formulaSettings.formulaFormat === 'latex') {
                // Copy raw LaTeX
                textToCopy = latexCode;
            } else {
                // Convert LaTeX to MathML via background script
                // Check if this is a block or inline formula
                const isBlock = this.classList.contains('math-block');
                textToCopy = await convertLatexToMathML(latexCode, isBlock);
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
    const mathElements = document.querySelectorAll('[data-gemini-math-copy-enabled="true"]');
    mathElements.forEach(updateElementStyle);
}

// Function to convert LaTeX to MathML via in-page converter
async function convertLatexToMathML(latexCode, displayMode = false) {
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
        formulaEngine: 'katex'   // 默认使用 KaTeX
    }, (settings) => {
        formulaSettings = settings;
        updateAllElements();
        enableGeminiMathCopy();
    });
}

// Initialize when DOM is loaded
function initGeminiMathCopy() {

    console.debug('DeepShare Gemini Math copy functionality initialized');

    // 首先加载设置
    loadSettings();

    // Use MutationObserver to handle dynamically added math elements
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            if (mutation.addedNodes.length > 0) {
                enableGeminiMathCopy();
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
    document.addEventListener('DOMContentLoaded', initGeminiMathCopy);
} else {
    initGeminiMathCopy();
}
