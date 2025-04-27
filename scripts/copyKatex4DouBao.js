/**
 * KaTeX formula copy functionality for DouBao platform
 * Adds click events to formulas with data-custom-copy-text to extract the LaTeX code and convert to MathML
 */

// Function to add copy functionality to LaTeX formulas in DouBao platform
function enableKatexCopy4DouBao() {
    // Find all elements with data-custom-copy-text attribute
    const latexElements = document.querySelectorAll('[data-custom-copy-text]');
    
    latexElements.forEach(element => {
        // Make sure we haven't already processed this element
        if (element.dataset.katexCopyEnabled) return;
        
        // Mark as processed
        element.dataset.katexCopyEnabled = 'true';
        
        // Add click event listener
        element.addEventListener('click', async (e) => {
            // Get the LaTeX code from data-custom-copy-text attribute
            if (element.dataset.customCopyText) {
                // Remove the \( and \) from the beginning and end
                let latexCode = element.dataset.customCopyText;
                if (latexCode.startsWith('\\(') && latexCode.endsWith('\\)')) {
                    latexCode = latexCode.substring(2, latexCode.length - 2);
                }
                
                try {
                    // Convert LaTeX to MathML using KaTeX
                    const mathmlString = convertLatexToMathML(latexCode);
                    
                    // Copy MathML to clipboard
                    await navigator.clipboard.writeText(mathmlString);
                    
                    // Show visual feedback with localized message using the toast notification
                    window.showToastNotification(chrome.i18n.getMessage('formulaCopied'), 'success');
                } catch (error) {
                    console.error('Failed to copy LaTeX code:', error);
                    window.showToastNotification(chrome.i18n.getMessage('copyFailed'), 'error');
                }
            }
        });
        
        // Add cursor pointer style to indicate clickability
        element.style.cursor = 'pointer';
        
        // Add title attribute for tooltip
        element.title = chrome.i18n.getMessage('clickToCopyLatex');
    });
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

// Initialize when DOM is loaded
function initKatexCopy4DouBao() {
    // Initial setup
    enableKatexCopy4DouBao();
    
    // Use MutationObserver to handle dynamically added elements
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            if (mutation.addedNodes.length > 0) {
                enableKatexCopy4DouBao();
            }
        });
    });
    
    // Start observing
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// Run initialization
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initKatexCopy4DouBao);
} else {
    initKatexCopy4DouBao();
}