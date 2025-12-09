/**
 * DeepShare Background Script
 * Handles background tasks for the extension
 */

// Offscreen document management
let creatingOffscreen = null;
const OFFSCREEN_DOCUMENT_PATH = 'offscreen/offscreen.html';

// Check if offscreen document exists
async function hasOffscreenDocument() {
    const contexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT'],
        documentUrls: [chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH)]
    });
    return contexts.length > 0;
}

// Create offscreen document for MathJax conversion
async function setupOffscreenDocument() {
    // If we're already creating, wait for it
    if (creatingOffscreen) {
        await creatingOffscreen;
        return;
    }
    
    // Check if already exists
    if (await hasOffscreenDocument()) {
        return;
    }
    
    // Create the offscreen document
    creatingOffscreen = chrome.offscreen.createDocument({
        url: OFFSCREEN_DOCUMENT_PATH,
        reasons: ['DOM_PARSER'],
        justification: 'MathJax requires DOM access for LaTeX to MathML conversion'
    });
    
    await creatingOffscreen;
    creatingOffscreen = null;
}

// Listen for messages from content scripts and offscreen document
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Ignore messages from offscreen document (they have target: 'background')
    if (message.target === 'offscreen') {
        return false;
    }
    
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
    
    // Handle LaTeX to MathML conversion request from content scripts
    if (message.action === 'convertLatexToMathML') {
        const { latex, displayMode, engine } = message;
        
        // Use async handling
        (async () => {
            try {
                await setupOffscreenDocument();
                
                // Send message to offscreen document with target field
                const response = await chrome.runtime.sendMessage({
                    target: 'offscreen',
                    action: 'convertLatexToMathML',
                    latex: latex,
                    displayMode: displayMode,
                    engine: engine || 'mathjax'
                });
                
                sendResponse(response);
            } catch (error) {
                console.error('Error in LaTeX conversion:', error);
                sendResponse({ success: false, error: error.message, fallback: latex });
            }
        })();
        
        return true; // Keep message channel open for async response
    }
    
    return false;
});

// Initialize offscreen document on extension startup for faster first conversion
chrome.runtime.onStartup.addListener(() => {
    setTimeout(() => {
        setupOffscreenDocument().catch(console.error);
    }, 2000);
});

// Also initialize on install/update
chrome.runtime.onInstalled.addListener(() => {
    setTimeout(() => {
        setupOffscreenDocument().catch(console.error);
    }, 1000);
});
