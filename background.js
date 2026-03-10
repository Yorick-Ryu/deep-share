/**
 * DeepShare Background Script
 * Handles background tasks for the extension
 */

// Listen for extension installation or update
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        // Check if onboarding has been completed
        chrome.storage.sync.get(['onboardingCompleted'], (data) => {
            if (!data.onboardingCompleted) {
                // Open onboarding page on first install
                chrome.tabs.create({
                    url: chrome.runtime.getURL('onboarding/onboarding.html')
                });
            }
        });
    }

    // Inject scripts into already opened tabs without needing to refresh
    injectContentScriptsOnInstall();
});

// Function to dynamically inject content scripts into existing tabs
async function injectContentScriptsOnInstall() {
    try {
        const manifest = chrome.runtime.getManifest();
        const contentScripts = manifest.content_scripts;

        if (!contentScripts) return;

        for (const script of contentScripts) {
            const matches = script.matches;

            // Query tabs that match these URLs
            const tabs = await chrome.tabs.query({ url: matches });

            for (const tab of tabs) {
                // Ignore empty or restricted URLs
                if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) {
                    continue;
                }

                try {
                    // Inject CSS
                    if (script.css && script.css.length > 0) {
                        await chrome.scripting.insertCSS({
                            target: { tabId: tab.id },
                            files: script.css
                        });
                    }

                    // Inject JS
                    if (script.js && script.js.length > 0) {
                        await chrome.scripting.executeScript({
                            target: { tabId: tab.id },
                            files: script.js
                        });
                    }
                    console.log(`Successfully injected content scripts into tab ${tab.id} (${tab.url})`);
                } catch (err) {
                    console.error(`Failed to inject into tab ${tab.id} (${tab.url}):`, err);
                }
            }
        }
    } catch (e) {
        console.error('Error during content script injection:', e);
    }
}


// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Handle open popup request
    if (message.action === 'openPopup') {
        if (chrome.action && typeof chrome.action.openPopup === 'function') {
            // Open the popup programmatically with query parameters
            let popupUrl = 'popup/popup.html';
            const params = [];
            if (message.actionParam) params.push(`action=${message.actionParam}`);
            if (message.error) params.push(`error=${encodeURIComponent(message.error)}`);

            if (params.length > 0) {
                popupUrl += '?' + params.join('&');
            }

            chrome.action.setPopup({ popup: popupUrl });

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
