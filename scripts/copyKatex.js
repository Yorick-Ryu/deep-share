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
                    
                    // Show visual feedback with localized message
                    showCopyFeedback(chrome.i18n.getMessage('latexCopied'));
                } catch (error) {
                    console.error('Failed to copy LaTeX code:', error);
                    showCopyFeedback(chrome.i18n.getMessage('copyFailed'), true);
                }
            }
        });
        
        // Add cursor pointer style to indicate clickability
        element.style.cursor = 'pointer';
        
        // Add title attribute for tooltip
        element.title = chrome.i18n.getMessage('clickToCopyLatex');
    });
}

// Function to show copy feedback inside the specified container
function showCopyFeedback(message, isError = false) {
    // Find the container specified by the user (changed to updated selector)
    const container = document.querySelector("#root > div > div.c3ecdb44 > div.f2eea526");
    
    // Create feedback element
    const feedback = document.createElement('div');
    feedback.textContent = message;
    feedback.className = 'katex-copy-notification';
    feedback.style.cssText = `
        position: absolute;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        background: ${isError ? '#f44336' : '#4d6bfe'};
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.3s ease, transform 0.3s ease;
        z-index: 1000;
        text-align: center;
        min-width: 100px;
    `;
    
    if (container) {
        // Target container exists
        if (getComputedStyle(container).position === 'static') {
            container.style.position = 'relative';
        }
        
        // Add feedback inside the container at the top
        container.appendChild(feedback);
        
        // Show with animation
        setTimeout(() => {
            feedback.style.opacity = '1';
            feedback.style.transform = 'translateX(-50%) translateY(0)';
        }, 10);
        
        // Hide and remove after delay
        setTimeout(() => {
            feedback.style.opacity = '0';
            feedback.style.transform = 'translateX(-50%) translateY(-10px)';
            setTimeout(() => {
                if (container.contains(feedback)) {
                    container.removeChild(feedback);
                }
            }, 300);
        }, 2000);
    } else {
        // Fallback to body if container not found
        document.body.appendChild(feedback);
        feedback.style.position = 'fixed';
        feedback.style.top = '20px';
        feedback.style.left = '50%';
        
        // Show with animation
        setTimeout(() => {
            feedback.style.opacity = '1';
            feedback.style.transform = 'translateX(-50%) translateY(0)';
        }, 10);
        
        // Hide and remove after delay
        setTimeout(() => {
            feedback.style.opacity = '0';
            feedback.style.transform = 'translateX(-50%) translateY(-10px)';
            setTimeout(() => {
                if (document.body.contains(feedback)) {
                    document.body.removeChild(feedback);
                }
            }, 300);
        }, 2000);
    }
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
