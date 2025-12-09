/**
 * Formula copy functionality for Zhihu platform
 * Adds click events to LaTeX formulas on Zhihu to extract the code and enable copying
 * Uses background script for LaTeX to MathML conversion via MathJax or KaTeX
 */

// 存储全局设置对象，便于快速访问
let formulaSettings = {
    enableFormulaCopy: true,  // 默认启用
    formulaFormat: 'mathml',  // 默认使用 MathML
    formulaEngine: 'mathjax'  // 默认使用 MathJax
};

// Function to add copy functionality to LaTeX formulas in Zhihu platform
function enableKatexCopy4Zhihu() {
    // 查找知乎公式元素 - 使用 ztext-math 类
    const zhihuFormulaElements = document.querySelectorAll('span.ztext-math');
    
    zhihuFormulaElements.forEach(element => {
        // Make sure we haven't already processed this element
        if (element.dataset.katexCopyEnabled) return;

        // Mark as processed
        element.dataset.katexCopyEnabled = 'true';

        // Add click event listener
        element.addEventListener('click', handleFormulaClick);

        // Add cursor pointer style to indicate clickability
        updateElementStyle(element);
    });
}

// 处理公式点击事件的函数
async function handleFormulaClick(e) {
    // 如果功能被禁用，直接返回
    if (!formulaSettings.enableFormulaCopy) {
        return;
    }

    // Prevent the default behavior
    e.preventDefault();
    e.stopPropagation();

    // 多种可能的获取LaTeX代码的方式
    let latexCode = '';
    
    // 方法1：从data-tex属性获取
    if (this.dataset.tex) {
        latexCode = this.dataset.tex;
    } 
    // 方法2：从script标签获取
    else {
        const scriptElement = this.querySelector('script[type="math/tex;mode=inline"]');
        if (scriptElement) {
            latexCode = scriptElement.textContent.trim();
        }
        // 方法3：从span.tex2jax_ignore获取
        else {
            const texHolder = this.querySelector('span.tex2jax_ignore');
            if (texHolder) {
                latexCode = texHolder.textContent.trim();
            }
        }
    }

    if (latexCode) {
        try {
            let textToCopy;
            // Use the format specified in settings
            if (formulaSettings.formulaFormat === 'latex') {
                // Copy raw LaTeX
                textToCopy = latexCode;
            } else {
                // Convert LaTeX to MathML via background script
                textToCopy = await convertLatexToMathML(latexCode);
            }

            // Copy to clipboard
            await navigator.clipboard.writeText(textToCopy);

            // Show visual feedback with localized message
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
        
        // 创建并应用悬停样式
        // 使用CSS类来处理悬停效果，统一只对SVG应用背景色
        const styleId = 'deep-share-katex-hover-style';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                span.ztext-math[data-katex-copy-enabled="true"] {
                    display: inline-block;
                }
                span.ztext-math[data-katex-copy-enabled="true"]:hover svg {
                    background-color: rgba(66, 133, 244, 0.15);
                }
                span.ztext-math[data-katex-copy-enabled="true"] svg {
                    transition: background-color 0.2s ease;
                    border-radius: 2px;
                }
            `;
            document.head.appendChild(style);
        }
    } else {
        element.style.cursor = '';
        element.title = '';
        
        // 如果禁用了功能，移除可能的样式
        const styleId = 'deep-share-katex-hover-style';
        const styleElement = document.getElementById(styleId);
        if (styleElement) {
            styleElement.remove();
        }
    }
}

// 更新所有已处理元素的样式和行为
function updateAllElements() {
    const formulaElements = document.querySelectorAll('span.ztext-math[data-katex-copy-enabled="true"]');
    formulaElements.forEach(updateElementStyle);
}

// Function to convert LaTeX to MathML via background script
async function convertLatexToMathML(latexCode, displayMode = true) {
    try {
        // Send message to background script for conversion
        const response = await chrome.runtime.sendMessage({
            action: 'convertLatexToMathML',
            latex: latexCode,
            displayMode: displayMode,
            engine: formulaSettings.formulaEngine
        });
        
        if (response && response.success) {
            return response.mathml;
        }
        
        // If conversion failed, return the original LaTeX code
        console.error('MathML conversion failed:', response?.error);
        return response?.fallback || latexCode;
    } catch (error) {
        console.error('Error requesting MathML conversion:', error);
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
        enableKatexCopy4Zhihu();
    });
}

// Initialize when DOM is loaded
function initKatexCopy4Zhihu() {
    console.debug('DeepShare Formula copy functionality for Zhihu initialized');

    // 首先加载设置
    loadSettings();

    // Use MutationObserver to handle dynamically added elements
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            if (mutation.addedNodes.length > 0) {
                enableKatexCopy4Zhihu();
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
    document.addEventListener('DOMContentLoaded', initKatexCopy4Zhihu);
} else {
    initKatexCopy4Zhihu();
}
