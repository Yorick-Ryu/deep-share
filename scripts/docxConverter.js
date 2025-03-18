/**
 * DeepShare DOCX Converter Module
 * Handles conversion of conversation to DOCX format
 */

// Function to initialize the DOCX conversion feature
function initDocxConverter() {
    console.log('DOCX converter initialized');
    
    // Listen for messages from the main content script
    document.addEventListener('deepshare:convertToDocx', async (event) => {
        const message = event.detail?.messages || {};
        const sourceButton = event.detail?.sourceButton; // New: get the source button
        await convertToDocx(message, sourceButton);
    });
}

// Function to handle the conversion process
async function convertToDocx(message, sourceButton) {
    try {
        // Step 1: Find the correct copy button that's next to the clicked DOCX button
        let copyBtn;
        
        // If we have the sourceButton reference, use it to find the adjacent copy button
        if (sourceButton && sourceButton instanceof Element) {
            // The copy button should be the previous sibling of the DOCX button
            copyBtn = sourceButton.previousElementSibling;
            if (!copyBtn || !copyBtn.classList.contains('ds-icon-button')) {
                throw new Error('Copy button not found next to the DOCX button');
            }
        } else {
            // Fallback to the old method if somehow sourceButton is not available
            const docxBtn = document.querySelector('.deepseek-docx-btn');
            if (!docxBtn) {
                throw new Error('DOCX button not found');
            }
            
            copyBtn = docxBtn.previousElementSibling;
            if (!copyBtn || !copyBtn.classList.contains('ds-icon-button')) {
                throw new Error('Copy button not found');
            }
        }
        
        // Click the copy button to copy content to clipboard
        copyBtn.click();
        
        // Wait for clipboard to be populated
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Step 2: Get content from clipboard
        const clipboardContent = await navigator.clipboard.readText();
        if (!clipboardContent) {
            throw new Error('Failed to get content from clipboard');
        }
        
        // Step 3: Call the conversion API
        const response = await fetch('http://127.0.0.1:8000/convert-text', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: clipboardContent,
                filename: generateFilename(clipboardContent) // Use clipboardContent as primary source
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API error: ${response.status} ${errorText}`);
        }
        
        // Step 4: Download the file
        const blob = await response.blob();
        const filename = response.headers.get('content-disposition')?.split('filename=')[1] || 'document.docx';
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        
        // Clean up
        URL.revokeObjectURL(url);
        showNotification(chrome.i18n.getMessage('docxConversionSuccess'));
        
    } catch (error) {
        console.error('DOCX conversion failed:', error);
        showNotification(error.message, true);
    }
}

// Helper function to generate a filename based on the clipboard content
function generateFilename(content) {
    if (!content || typeof content !== 'string') {
        // Fallback if no valid content
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
        return `document_${timestamp}`;
    }
    
    // Extract the first line or first few words for the filename
    const firstLine = content.split('\n')[0] || '';
    let filename = firstLine.trim();
    
    // If first line is too long, truncate it
    filename = filename.substring(0, 30).trim();
    
    // Remove special characters that aren't allowed in filenames
    filename = filename.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '');
    
    // If filename is still empty after cleaning, use a default
    if (!filename) {
        filename = 'document';
    }
    
    // Add role and timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    return `${filename}_${timestamp}`;
}

// Function to show a notification (success or error)
function showNotification(message, isError = false) {
    // Find the container similar to KaTeX notifications
    const container = document.querySelector("#root > div > div.c3ecdb44 > div.f2eea526");
    
    // Create feedback element
    const feedback = document.createElement('div');
    feedback.textContent = message;
    feedback.className = 'katex-copy-notification'; // Use the same class as KaTeX notifications
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

// Initialize the module
initDocxConverter();
