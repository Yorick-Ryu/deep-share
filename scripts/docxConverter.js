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
        
        // Get settings from storage
        const settings = await chrome.storage.sync.get({
            docxServerUrl: 'http://127.0.0.1:8000',
            docxMode: 'local'
        });
        
        // Use the appropriate conversion method based on mode
        if (settings.docxMode === 'local') {
            await convertToDocxLocally(clipboardContent);
        } else {
            await convertToDocxViaApi(clipboardContent, settings.docxServerUrl);
        }
        
        // Show success notification
        window.showToastNotification(chrome.i18n.getMessage('docxConversionSuccess'), 'success');
        
    } catch (error) {
        console.error('DOCX conversion failed:', error);
        window.showToastNotification(error.message, 'error');
    }
}

// Function to convert text to DOCX locally using browser APIs
async function convertToDocxLocally(content) {
    try {
        // For now, create simple HTML to convert to a Blob
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Document</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.5; }
                    pre { white-space: pre-wrap; }
                </style>
            </head>
            <body>
                <pre>${escapeHtml(content)}</pre>
            </body>
            </html>
        `;
        
        // Create a Blob from the HTML
        const blob = new Blob([html], {type: 'text/html'});
        
        // Generate filename
        const filename = generateFilename(content) + '.html';
        
        // Download the file (users can open it in Word)
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        
        // Clean up
        URL.revokeObjectURL(url);
    } catch (error) {
        throw new Error('Local conversion failed: ' + error.message);
    }
}

// Helper function to escape HTML special characters
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Function to convert text to DOCX via API
async function convertToDocxViaApi(content, serverUrl) {
    const url = serverUrl || 'http://127.0.0.1:8000';
    
    // Call the conversion API
    const response = await fetch(`${url}/convert-text`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            content: content,
            filename: generateFilename(content)
        })
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error: ${response.status} ${errorText}`);
    }
    
    // Download the file
    const blob = await response.blob();
    const filename = response.headers.get('content-disposition')?.split('filename=')[1] || 'document.docx';
    
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    link.click();
    
    // Clean up
    URL.revokeObjectURL(downloadUrl);
}

// Helper function to generate a filename based on the clipboard content
function generateFilename(content) {
    // Default filename generation
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
    
    // Add timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    return `${filename}_${timestamp}`;
}

// Initialize the module
initDocxConverter();
