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

  if (message.action === 'fetchDocxConversion') {
        handleDocxConversion(message, sendResponse);
        return true; // Keep message channel open for async response
    } else if (message.action === 'fetchQuota') {
        handleQuotaCheck(message, sendResponse);
        return true; // Keep message channel open for async response
    }
});

async function handleDocxConversion(request, sendResponse) {
    try {
        const response = await fetch(request.url, {
            method: request.method,
            headers: request.headers,
            body: request.body
        });

        if (!response.ok) {
            const errorText = await response.text();
            sendResponse({ error: `API error: ${response.status} ${errorText}` });
            return;
        }

        const arrayBuffer = await response.arrayBuffer();
        const data = Array.from(new Uint8Array(arrayBuffer));
        sendResponse({ data: data });
    } catch (error) {
        sendResponse({ error: error.message });
    }
}

async function handleQuotaCheck(request, sendResponse) {
    try {
        const response = await fetch(request.url, {
            method: request.method,
            headers: request.headers
        });

        if (!response.ok) {
            sendResponse({ error: `Failed to check quota: ${response.status}` });
            return;
        }

        const data = await response.json();
        sendResponse({ data: data });
    } catch (error) {
        sendResponse({ error: error.message });
    }
}
