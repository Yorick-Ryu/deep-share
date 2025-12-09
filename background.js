/**
 * DeepShare Background Script
 * Handles background tasks for the extension
 */

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Handle open popup request
    if (message.action === 'openPopup') {
        // Open the popup programmatically with query parameter
        chrome.action.setPopup({ popup: 'popup/popup.html?action=apiKeyMissing' });

        // Open the popup
        chrome.action.openPopup();

        // Reset the popup URL after a delay (to not affect future opens)
        setTimeout(() => {
            chrome.action.setPopup({ popup: 'popup/popup.html' });
        }, 1000);

        return true;
    }

    return false;
});
