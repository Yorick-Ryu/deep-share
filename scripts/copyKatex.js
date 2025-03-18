/**
 * KaTeX formula copy functionality
 * Adds click events to KaTeX formulas to allow copying the LaTeX code
 */

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
        element.addEventListener('click', async (e) => {
            // Find the annotation element that contains the LaTeX code
            const annotation = element.querySelector('.katex-mathml annotation[encoding="application/x-tex"]');
            
            if (annotation) {
                // Trim whitespace from LaTeX code before copying
                const latexCode = annotation.textContent.trim();
                
                try {
                    // Copy to clipboard
                    await navigator.clipboard.writeText(latexCode);
                    
                    // Show visual feedback with localized message using the toast notification
                    window.showToastNotification(chrome.i18n.getMessage('latexCopied'), 'success');
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

// Initialize when DOM is loaded
function initKatexCopy() {
    // Initial setup
    enableKatexCopy();
    
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
}

// Run initialization
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initKatexCopy);
} else {
    initKatexCopy();
}
