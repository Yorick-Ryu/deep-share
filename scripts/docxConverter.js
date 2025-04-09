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
            docxServerUrl: 'https://api.ds.rick216.cn',
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
    try {
        // Get API settings from storage
        const settings = await chrome.storage.sync.get({
            docxServerUrl: 'https://api.ds.rick216.cn',
            docxApiKey: ''
        });
        
        const url = serverUrl || settings.docxServerUrl || 'https://api.ds.rick216.cn';
        const apiKey = settings.docxApiKey;
        
        // Ensure API key is provided
        if (!apiKey) {
            throw new Error('API Key not set. Please configure your API key in the extension settings.');
        }
        
        // Call the conversion API
        const response = await fetch(`${url}/convert-text`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey
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
        
        // After successful conversion, check and update the quota
        checkQuota();
    } catch (error) {
        throw error;
    }
}

// Function to check user's quota
async function checkQuota() {
    try {
        // Get API settings from storage
        const settings = await chrome.storage.sync.get({
            docxServerUrl: 'https://api.ds.rick216.cn',
            docxApiKey: ''
        });
        
        const url = settings.docxServerUrl;
        const apiKey = settings.docxApiKey;
        
        // If not configured, exit quietly
        if (!apiKey || !url) {
            return;
        }
        
        // Call the quota API
        const response = await fetch(`${url}/auth/quota`, {
            method: 'GET',
            headers: {
                'X-API-Key': apiKey
            }
        });
        
        if (!response.ok) {
            console.error('Failed to check quota');
            return;
        }
        
        const quotaData = await response.json();
        
        // Store quota information in local storage for access by popup
        chrome.storage.local.set({
            quotaData: {
                total: quotaData.total_quota,
                used: quotaData.used_quota,
                remaining: quotaData.remaining_quota,
                lastChecked: new Date().toISOString()
            }
        });
        
        // Notify the popup if it's open
        chrome.runtime.sendMessage({
            action: 'quotaUpdated',
            data: quotaData
        }).catch(() => {
            // It's ok if this fails (popup might not be open)
        });
        
    } catch (error) {
        console.error('Error checking quota:', error);
    }
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
checkQuota(); // Check quota on startup
