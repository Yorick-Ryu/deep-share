/**
 * KaTeX formula copy functionality for Doubao platform
 * Adds click events to formulas with data-custom-copy-text to extract the LaTeX code and convert to MathML
 */

// 存储全局设置对象，便于快速访问
let formulaSettings = {
    enableFormulaCopy: true,  // 默认启用
    formulaFormat: 'mathml'   // 默认使用 MathML
};

// Function to add copy functionality to LaTeX formulas in Doubao platform
function enableKatexCopy4Doubao() {
    // Find all elements with data-custom-copy-text attribute
    const latexElements = document.querySelectorAll('[data-custom-copy-text]');

    latexElements.forEach(element => {
        // Make sure we haven't already processed this element
        if (element.dataset.katexCopyEnabled) return;

        // Mark as processed
        element.dataset.katexCopyEnabled = 'true';

        // Add click event listener
        element.addEventListener('click', handleLatexClick);

        // Add cursor pointer style to indicate clickability
        updateElementStyle(element);
    });
}

// 集中处理点击事件的函数
async function handleLatexClick(e) {
    // 如果功能被禁用，直接返回
    if (!formulaSettings.enableFormulaCopy) {
        return;
    }

    // Get the LaTeX code from data-custom-copy-text attribute
    if (this.dataset.customCopyText) {
        // Remove the \( and \) from the beginning and end
        let latexCode = this.dataset.customCopyText;
        if (latexCode.startsWith('\\(') && latexCode.endsWith('\\)')) {
            latexCode = latexCode.substring(2, latexCode.length - 2);
        }

        try {
            let textToCopy;
            // Use the format specified in settings
            if (formulaSettings.formulaFormat === 'latex') {
                // Copy raw LaTeX
                textToCopy = latexCode;
            } else {
                // Convert LaTeX to MathML
                textToCopy = convertLatexToMathML(latexCode);
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
        element.title = chrome.i18n.getMessage('clickToCopyLatex');
    } else {
        element.style.cursor = '';
        element.title = '';
    }
}

// 更新所有已处理元素的样式和行为
function updateAllElements() {
    const latexElements = document.querySelectorAll('[data-custom-copy-text][data-katex-copy-enabled="true"]');
    latexElements.forEach(updateElementStyle);
}

// Function to convert LaTeX to MathML using KaTeX
function convertLatexToMathML(latexCode) {
    // Create a temporary container
    const container = document.createElement('div');

    try {
        // Use KaTeX to render LaTeX as MathML
        katex.render(latexCode, container, {
            output: 'mathml',
            throwOnError: false,
            displayMode: true
        });

        // Extract the MathML content
        const mathmlElement = container.querySelector('math');
        if (mathmlElement) {
            return mathmlElement.outerHTML;
        } else {
            console.error('Failed to generate MathML from LaTeX:', latexCode);
            return latexCode; // Fallback to original LaTeX code
        }
    } catch (error) {
        console.error('KaTeX rendering error:', error);
        return latexCode; // Fallback to original LaTeX code
    }
}

// 加载设置
function loadSettings() {
    chrome.storage.sync.get({
        enableFormulaCopy: true,  // 默认启用
        formulaFormat: 'mathml'   // 默认使用 MathML
    }, (settings) => {
        formulaSettings = settings;
        updateAllElements();
        enableKatexCopy4Doubao();
    });
}

// Initialize when DOM is loaded
function initKatexCopy4Doubao() {

    console.log('DeepShare Formula copy functionality initialized');

    // 首先加载设置
    loadSettings();

    // Use MutationObserver to handle dynamically added elements
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            if (mutation.addedNodes.length > 0) {
                enableKatexCopy4Doubao();
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
        // 如果相关设置有变更，更新所有元素
        if (changes.enableFormulaCopy || changes.formulaFormat) {
            updateAllElements();
        }
    });
}

// Run initialization
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initKatexCopy4Doubao);
} else {
    initKatexCopy4Doubao();
}