/**
 * DeepShare Background Script
 * Handles background tasks for the extension
 */

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Handle open popup request
    if (message.action === 'openPopup') {
        if (chrome.action && typeof chrome.action.openPopup === 'function') {
            // Open the popup programmatically with query parameter
            chrome.action.setPopup({ popup: 'popup/popup.html?action=apiKeyMissing' });

            // Open the popup
            chrome.action.openPopup().then(() => {
                sendResponse({ success: true });
            }).catch((err) => {
                console.error('Failed to open popup:', err);
                sendResponse({ success: false, error: err.message });
            });

            // Reset the popup URL after a delay (to not affect future opens)
            setTimeout(() => {
                chrome.action.setPopup({ popup: 'popup/popup.html' });
            }, 1000);

            return true; // Keep the channel open for async sendResponse
        } else {
            console.warn('chrome.action.openPopup is not supported in this browser version');
            sendResponse({ success: false, error: 'openPopup not supported' });
            return false;
        }
    }

    // Default response for other messages
    if (sendResponse) {
        sendResponse({ success: true, ignored: true });
    }
    return false;
});
