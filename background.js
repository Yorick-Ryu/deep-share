importScripts('scripts/history/core.js', 'scripts/history/store.js', 'scripts/history/permissions.js', 'scripts/history/background.js');

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

    // Reloading/updating invalidates old script contexts but leaves their DOM
    // behind. Reinjection creates duplicate controls and stale listeners.
    // Existing pages pick up the new declarative scripts on their next reload.
    if (details.reason === 'install') injectContentScriptsOnInstall();
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
                if (!tab.url || !/^https?:\/\//.test(tab.url) || tab.discarded || tab.status === 'loading') {
                    continue;
                }

                try {
                    const origin = `${new URL(tab.url).origin}/*`;
                    if (!await chrome.permissions.contains({ origins: [origin] })) continue;
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
                            files: script.js,
                            ...(script.world ? { world: script.world } : {})
                        });
                    }
                    console.debug(`Successfully injected content scripts into tab ${tab.id}`);
                } catch (err) {
                    // Access can change between querying a tab and injection
                    // (navigation, closing, or withheld site access).
                    if (/Cannot access|No tab with id|No frame with id|Frame with ID .* removed|The tab was closed/i.test(err.message || '')) {
                        console.debug(`Skipped unavailable tab ${tab.id}; content scripts will load on an authorized page navigation.`);
                    } else {
                        console.error(`Failed to inject into tab ${tab.id}:`, err);
                    }
                }
            }
        }
    } catch (e) {
        console.error('Error during content script injection:', e);
    }
}


// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // History requests are answered asynchronously by the dedicated listener.
    if (message.action?.startsWith('history:')) return false;

    // Handle open popup request
    if (message.action === 'openPopup') {
        if (chrome.action && typeof chrome.action.openPopup === 'function') {
            // Open the popup programmatically with query parameters
            let popupUrl = 'popup/popup.html';
            const params = [];
            if (message.actionParam) params.push(`action=${encodeURIComponent(message.actionParam)}`);

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
