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
        const sourceButton = event.detail?.sourceButton; // Get the source button
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
        
        // Show success notification using the toast notification system
        window.showToastNotification(chrome.i18n.getMessage('docxConversionSuccess'), 'success');
        
    } catch (error) {
        console.error('DOCX conversion failed:', error);
        window.showToastNotification(error.message, 'error');
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

// Initialize the module
initDocxConverter();
