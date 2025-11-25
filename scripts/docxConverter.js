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
            removeDividers: false,  // Default to false for removing dividers
            removeEmojis: false,    // Default to false for removing emojis
            convertMermaid: false,  // Default to false for Mermaid conversion
            compatMode: true,       // Default to true for compatibility mode
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
        console.debug('Remove Dividers:', settings.removeDividers);
        console.debug('Remove Emojis:', settings.removeEmojis);
        console.debug('Convert Mermaid:', settings.convertMermaid);

        // Remove emojis from content if enabled (frontend processing)
        let processedContent = content;
        if (settings.removeEmojis) {
            // First, convert number emojis to their text equivalents
            // Handle keycap number emojis (0️⃣-9️⃣) - these are composed of digit + FE0F + 20E3
            processedContent = processedContent.replace(/0\uFE0F?\u20E3/gu, '0. ');
            processedContent = processedContent.replace(/1\uFE0F?\u20E3/gu, '1. ');
            processedContent = processedContent.replace(/2\uFE0F?\u20E3/gu, '2. ');
            processedContent = processedContent.replace(/3\uFE0F?\u20E3/gu, '3. ');
            processedContent = processedContent.replace(/4\uFE0F?\u20E3/gu, '4. ');
            processedContent = processedContent.replace(/5\uFE0F?\u20E3/gu, '5. ');
            processedContent = processedContent.replace(/6\uFE0F?\u20E3/gu, '6. ');
            processedContent = processedContent.replace(/7\uFE0F?\u20E3/gu, '7. ');
            processedContent = processedContent.replace(/8\uFE0F?\u20E3/gu, '8. ');
            processedContent = processedContent.replace(/9\uFE0F?\u20E3/gu, '9. ');
            // Handle special keycap ten emoji
            processedContent = processedContent.replace(/🔟/gu, '10. ');
            
            // Then remove other emoji characters using regex
            processedContent = processedContent.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{FE00}-\u{FE0F}\u{1F200}-\u{1F251}]/gu, '');
        }

        const currentLang = chrome.i18n.getUILanguage();
        const language = currentLang.startsWith('zh') ? 'zh' : 'en';

        const body = {
            content: processedContent,
            filename: generateFilename(content),
            remove_hr: settings.removeDividers,
            convert_mermaid: settings.convertMermaid,
            compat_mode: settings.compatMode,
            language: language
        };

        if (settings.lastUsedTemplate) {
            body.template_name = settings.lastUsedTemplate;
            console.debug('Using template:', settings.lastUsedTemplate);
        }

        // Call the conversion API
        const result = await chrome.runtime.sendMessage({
            action: 'fetchDocxConversion',
            url: `${url}/convert-text`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey
            },
            body: JSON.stringify(body)
        });

        if (result.error) {
            throw new Error(result.error);
        }

        // Create blob from the response data
        const blob = new Blob([new Uint8Array(result.data)], { 
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
        });
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
        const result = await chrome.runtime.sendMessage({
            action: 'fetchQuota',
            url: `${url}/auth/quota`,
            method: 'GET',
            headers: {
                'X-API-Key': apiKey
            }
        });

        if (result.error) {
            console.error('Failed to check quota:', result.error);
            return;
        }

        const quotaData = result.data;

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
