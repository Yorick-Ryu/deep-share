/**
 * DeepShare DOCX Converter Module
 * Handles conversion of conversation to DOCX format
 */

// Function to initialize the DOCX conversion feature
function initDocxConverter() {
    console.debug('DOCX converter initialized');

    // Listen for messages from the main content script
    document.addEventListener('deepshare:convertToDocx', async (event) => {
        const message = event.detail?.messages || {};
        const sourceButton = event.detail?.sourceButton; // Get the source button
        await convertToDocx(message, sourceButton);
    });
}

// Function to handle the conversion process
async function convertToDocx(message, sourceButton) {
    console.debug('Starting DOCX conversion');
    
    // Check if message is a Promise and await it
    if (message instanceof Promise) {
        try {
            message = await message;
        } catch (error) {
            console.error('Error resolving message Promise:', error);
            window.showToastNotification('Error preparing content for conversion', 'error');
            return;
        }
    } else {
        console.debug('Message:', message);
    }
    
    // Check for API key first
    try {
        const settings = await chrome.storage.sync.get({
            docxServerUrl: 'https://api.ds.rick216.cn',
            docxApiKey: '',
            docxMode: 'api'
        });

        // If no API key is set and using API mode, show notification and open popup
        if (settings.docxMode === 'api' && (!settings.docxApiKey || settings.docxApiKey.trim() === '')) {
            window.showToastNotification(
                chrome.i18n.getMessage('apiKeyMissing') || '请购买或填写API-Key以使用文档转换功能',
                'error',
                5000
            );

            // Try to open the extension popup
            try {
                chrome.runtime.sendMessage({ action: 'openPopup' });
            } catch (err) {
                console.error('Failed to send message to open popup:', err);
            }
            return;
        }
    } catch (error) {
        console.error('Error checking API key:', error);
    }

    let convertingNotificationId = null;

    // Disable the DOCX button if provided
    if (sourceButton && sourceButton instanceof Element) {
        sourceButton.style.opacity = '0.5';
        sourceButton.style.pointerEvents = 'none';
        sourceButton.setAttribute('disabled', 'true');
        // Store original title and update with converting message
        sourceButton._originalTitle = sourceButton.title || chrome.i18n.getMessage('docxButton');
        sourceButton.title = chrome.i18n.getMessage('docxConverting');
    }

    try {
        convertingNotificationId = window.showToastNotification(chrome.i18n.getMessage('docxConverting'), 'loading', 30000); // 30s timeout as max

        // Get settings from storage
        const settings = await chrome.storage.sync.get({
            docxServerUrl: 'https://api.ds.rick216.cn',
            docxMode: 'api'
        });

        // Use the appropriate conversion method based on mode
        if (settings.docxMode === 'local') {
            await convertToDocxLocally(message.content);
        } else {
            await convertToDocxViaApi(message.content, settings.docxServerUrl);
        }

        // Hide converting notification
        if (convertingNotificationId !== null) {
            window.dismissToastNotification(convertingNotificationId);
        }

        // Show success notification
        window.showToastNotification(chrome.i18n.getMessage('docxConversionSuccess'), 'success');

    } catch (error) {
        console.error('DOCX conversion failed:', error);

        // Hide converting notification
        if (convertingNotificationId !== null) {
            window.dismissToastNotification(convertingNotificationId);
        }

        // Check if it's an API key related error
        let errorMessage = error.message;
        if (error.message && (
            error.message.includes('Failed to read') || 
            error.message.includes('headers') || 
            error.message.includes('ISO-8859-1') ||
            error.message.includes('401') ||
            error.message.includes('403') ||
            error.message.includes('Unauthorized')
        )) {
            errorMessage = chrome.i18n.getMessage('apiKeyError') || 'API-KEY填写错误，请联系客服微信：yorick_cn';
        }

        window.showToastNotification(errorMessage, 'error');
    } finally {
        // Re-enable the DOCX button if provided
        if (sourceButton && sourceButton instanceof Element) {
            sourceButton.style.opacity = '';
            sourceButton.style.pointerEvents = '';
            sourceButton.removeAttribute('disabled');
            // Restore original title
            if (sourceButton._originalTitle) {
                sourceButton.title = sourceButton._originalTitle;
                delete sourceButton._originalTitle;
            }
        }
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
        const blob = new Blob([html], { type: 'text/html' });

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
            docxApiKey: '',
            convertMermaid: false,  // Default to false for Mermaid conversion
            lastUsedTemplate: null
        });

        const url = serverUrl || settings.docxServerUrl || 'https://api.ds.rick216.cn';
        const apiKey = settings.docxApiKey;

        // Ensure API key is provided
        if (!apiKey) {
            throw new Error('API Key not set. Please configure your API key in the extension settings.');
        }

        // Ensure content is a string
        if (!content || typeof content !== 'string') {
            throw new Error('Invalid content for conversion. Content must be text.');
        }

        console.debug('Sending content to API:', content.substring(0, 100) + '...');
        console.debug('Convert Mermaid:', settings.convertMermaid);

        const currentLang = chrome.i18n.getUILanguage();
        const language = currentLang.startsWith('zh') ? 'zh' : 'en';

        const body = {
            content: content,
            filename: generateFilename(content),
            convert_mermaid: settings.convertMermaid,
            language: language
        };

        if (settings.lastUsedTemplate) {
            body.template_name = settings.lastUsedTemplate;
            console.debug('Using template:', settings.lastUsedTemplate);
        }

        // Call the conversion API
        const response = await fetch(`${url}/convert-text`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API error: ${response.status} ${errorText}`);
        }

        // Download the file
        const blob = await response.blob();
        const filename = generateFilename(content) + '.docx';

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
    // Helper function to get local time zone timestamp
    function getLocalTimestamp() {
        const now = new Date();
        // Format date in local timezone
        const options = {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false
        };
        const localTime = now.toLocaleString('zh-CN', options)
            .replace(/[\/\s:]/g, '-')
            .replace(',', '');
        return localTime;
    }

    // Default filename generation
    if (!content || typeof content !== 'string') {
        // Fallback if no valid content
        const timestamp = getLocalTimestamp();
        return `document_${timestamp}`;
    }

    // Extract the first line or first few words for the filename
    const firstLine = content.split('\n')[0] || '';
    let filename = firstLine.trim();

    // If first line is too long, truncate it
    filename = filename.substring(0, 10).trim();

    // Remove special characters that aren't allowed in filenames
    filename = filename.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '');

    // If filename is still empty after cleaning, use a default
    if (!filename) {
        filename = 'document';
    }

    // Add timestamp with local timezone
    const timestamp = getLocalTimestamp();
    return `${filename}_${timestamp}`;
}

// Initialize the module
initDocxConverter();
checkQuota(); // Check quota on startup
