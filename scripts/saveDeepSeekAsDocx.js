// This script handles saving DeepSeek conversations as a DOCX file.
// Supports virtual DOM by scrolling through the conversation to collect all messages.
console.log("saveDeepSeekAsDocx.js loaded");

// Abort controller for cancelling scroll collection in progress
let scrollAbortController = null;

document.addEventListener('deepshare:saveAsDocx', async () => {
    console.log('Save as DOCX clicked');

    const docxBtn = document.getElementById('save-as-docx-btn');
    const imageBtn = document.getElementById('save-as-image-btn');
    setButtonDisabled(docxBtn, true);
    setButtonDisabled(imageBtn, true);

    scrollAbortController = new AbortController();
    const { signal } = scrollAbortController;

    // Listen for the cancel button click
    const cancelBtn = document.querySelector('.fab07e97 .ds-basic-button--outlined');
    const onCancel = () => scrollAbortController?.abort();
    if (cancelBtn) {
        cancelBtn.addEventListener('click', onCancel, { once: true });
    }

    let savedClipboard = null;
    try {
        try {
            savedClipboard = await navigator.clipboard.readText();
        } catch (_) { /* clipboard not accessible — nothing to restore later */ }

        const messages = await getSelectedDeepSeekMessages(signal);
        if (messages.length === 0) {
            window.showToastNotification(chrome.i18n?.getMessage('noMessageSelected') || 'Please select at least one message', 'error');
            setButtonDisabled(docxBtn, false);
            setButtonDisabled(imageBtn, false);
            return;
        }
        const content = messages.map(m => `**${m.role}**: \n${m.content}`).join('\n\n---\n\n');

        const documentTitle = document.querySelector('.afa34042')?.textContent?.trim() || null;

        // Don't pass sourceButton — docxConverter uses a different disable/enable
        // mechanism (disabled attr) that conflicts with ours (aria-disabled + class).
        // Instead, observe when docxConverter removes the 'disabled' attr to know it's done.
        document.dispatchEvent(new CustomEvent('deepshare:convertToDocx', {
            detail: {
                messages: { content: content },
                sourceButton: docxBtn,
                documentTitle
            }
        }));

    } catch (error) {

        if (error.name === 'AbortError') {
            console.log('DOCX export cancelled by user');
        } else if (error.message === 'NO_SELECTION') {
            window.showToastNotification(chrome.i18n?.getMessage('noMessageSelected') || 'Please select at least one message', 'error');
        } else {
            console.error('Error getting messages for DOCX conversion:', error);
            const errorMessage = error.message && error.message.includes('Read permission denied')
                ? chrome.i18n?.getMessage('clipboardPermissionError')
                : `${chrome.i18n?.getMessage('getClipboardError')}: ${error.message}`;
            window.showToastNotification(errorMessage, 'error');
        }
    } finally {
        if (savedClipboard !== null) {
            try { await navigator.clipboard.writeText(savedClipboard); } catch (_) {}
        }
        setButtonDisabled(docxBtn, false);
        setButtonDisabled(imageBtn, false);
        if (cancelBtn) {
            cancelBtn.removeEventListener('click', onCancel);
        }
        scrollAbortController = null;
    }
});

function setButtonDisabled(button, disabled) {
    if (!button || !(button instanceof Element)) return;
    if (disabled) {
        button.style.opacity = '0.5';
        button.style.pointerEvents = 'none';
        button.setAttribute('aria-disabled', 'true');
        button.classList.add('ds-atom-button--disabled');
    } else {
        button.style.opacity = '';
        button.style.pointerEvents = '';
        button.setAttribute('aria-disabled', 'false');
        button.classList.remove('ds-atom-button--disabled');
    }
}

async function getSelectedDeepSeekMessages(signal) {
    const messageCheckboxes = document.querySelectorAll('.d30139ff .ds-checkbox');
    if (messageCheckboxes.length === 0) {
        return [];
    }

    const selectedCheckboxes = Array.from(messageCheckboxes).filter(
        checkbox => checkbox.classList.contains('ds-checkbox--active')
    );

    if (selectedCheckboxes.length === 0) {
        throw new Error('NO_SELECTION');
    }

    const isVirtualList = !!document.querySelector('.ds-virtual-list-items');

    if (isVirtualList && selectedCheckboxes.length > 4) {
        return await collectAllMessagesViaScroll(signal);
    }

    return await collectVisibleSelectedMessages(selectedCheckboxes);
}

async function collectVisibleSelectedMessages(selectedCheckboxes) {
    const messages = [];

    for (const checkbox of selectedCheckboxes) {
        const messageDiv = checkbox.closest('._9663006, [class*="_4f9bf79"]');
        if (messageDiv) {
            if (messageDiv.matches('._9663006') || messageDiv.querySelector('.d29f3d7d')) {
                const userElement = messageDiv.querySelector('.fbb737a4');
                const userText = Array.from(userElement?.childNodes || [])
                    .find(node => node.nodeType === Node.TEXT_NODE)?.textContent?.trim();
                if (userText) {
                    messages.push({ role: "User", content: userText });
                }
            } else {
                const content = await extractAIMessageContent(messageDiv);
                if (content) {
                    messages.push({ role: "Assistant", content: content });
                }
            }
        }
    }

    return messages;
}

/**
 * Scrolls through the entire virtual list from top to bottom,
 * collecting all conversation messages in order.
 */
async function collectAllMessagesViaScroll(signal) {
    const collectedMessages = new Map();

    const scrollContainer = findScrollContainer();
    if (!scrollContainer) {
        console.error('Could not find scroll container');
        return await collectVisibleSelectedMessages(
            Array.from(document.querySelectorAll('.d30139ff .ds-checkbox.ds-checkbox--active'))
        );
    }

    scrollContainer.scrollTop = 0;
    await waitForDomSettle(400);

    let stuckCount = 0;
    const MAX_STUCK = 5;

    while (stuckCount < MAX_STUCK) {
        throwIfAborted(signal);

        const prevSize = collectedMessages.size;
        await collectVisibleMessages(collectedMessages);

        const maxScroll = scrollContainer.scrollHeight - scrollContainer.clientHeight;
        if (scrollContainer.scrollTop >= maxScroll - 5) {
            break;
        }

        throwIfAborted(signal);

        if (collectedMessages.size === prevSize) {
            stuckCount++;
            const lastEl = findLastCollectedElement(collectedMessages);
            if (lastEl) {
                lastEl.scrollIntoView({ behavior: 'smooth', block: 'end' });
            } else {
                scrollContainer.scrollTo({
                    top: scrollContainer.scrollTop + scrollContainer.clientHeight,
                    behavior: 'smooth'
                });
            }
            await waitForScrollEnd(scrollContainer, 1500);
            await waitForDomSettle(300);
            continue;
        }

        stuckCount = 0;

        const lastElement = findLastCollectedElement(collectedMessages);
        if (lastElement) {
            lastElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            await waitForScrollEnd(scrollContainer, 2000);
            await waitForDomSettle(300);
        } else {
            scrollContainer.scrollTo({
                top: scrollContainer.scrollTop + scrollContainer.clientHeight,
                behavior: 'smooth'
            });
            await waitForScrollEnd(scrollContainer, 2000);
            await waitForDomSettle(300);
        }
    }

    const sortedEntries = Array.from(collectedMessages.entries())
        .sort(([a], [b]) => a - b);

    return sortedEntries.map(([, msg]) => ({ role: msg.role, content: msg.content }));
}

function throwIfAborted(signal) {
    if (signal?.aborted) {
        throw new DOMException('Export cancelled', 'AbortError');
    }
}

/**
 * Finds the DOM element for the last (highest key) collected message.
 */
function findLastCollectedElement(collectedMessages) {
    if (collectedMessages.size === 0) return null;

    const maxKey = Math.max(...collectedMessages.keys());
    const selector = `[data-virtual-list-item-key="${maxKey}"]`;
    return document.querySelector(selector);
}

/**
 * Collects all currently visible messages in the DOM and adds them to the map.
 */
async function collectVisibleMessages(collectedMessages) {
    const messageSelector = '._9663006, ._4f9bf79._43c05b5, ._4f9bf79.d7dc56a8._43c05b5';
    const visibleMessages = document.querySelectorAll(messageSelector);

    for (const messageDiv of visibleMessages) {
        const key = getVirtualListKey(messageDiv);
        if (key === null || collectedMessages.has(key)) {
            continue;
        }

        const isUserMessage = messageDiv.matches('._9663006') || messageDiv.querySelector('.d29f3d7d');

        if (isUserMessage) {
            const userElement = messageDiv.querySelector('.fbb737a4');
            const userText = getUserTextContent(userElement);
            if (userText) {
                collectedMessages.set(key, { role: "User", content: userText });
            }
        } else {
            const content = await extractAIMessageContent(messageDiv);
            if (content) {
                collectedMessages.set(key, { role: "Assistant", content: content });
            }
        }
    }
}

/**
 * Extracts text content from a user message element, handling multi-line and complex structures.
 */
function getUserTextContent(element) {
    if (!element) return null;

    // First try: get direct text nodes
    const textFromNodes = Array.from(element.childNodes)
        .filter(node => node.nodeType === Node.TEXT_NODE)
        .map(node => node.textContent.trim())
        .filter(Boolean)
        .join('');

    if (textFromNodes) return textFromNodes;

    // Fallback: get innerText which handles nested structures
    const innerText = element.innerText?.trim();
    return innerText || null;
}

/**
 * Extracts the virtual list item key from a message element.
 */
function getVirtualListKey(element) {
    // Check self first
    const selfKey = element.getAttribute('data-virtual-list-item-key');
    if (selfKey !== null) return parseInt(selfKey, 10);

    // Check closest parent with the key
    const parent = element.closest('[data-virtual-list-item-key]');
    if (parent) return parseInt(parent.getAttribute('data-virtual-list-item-key'), 10);

    return null;
}

/**
 * Finds the scrollable container for the conversation.
 */
function findScrollContainer() {
    // Primary: the known container class
    const knownContainer = document.querySelector('.dad65929');
    if (knownContainer && isScrollable(knownContainer)) return knownContainer;

    // Secondary: the virtual list's scrollable parent
    const virtualList = document.querySelector('.ds-virtual-list-items');
    if (virtualList) {
        let parent = virtualList.parentElement;
        while (parent) {
            if (isScrollable(parent)) return parent;
            parent = parent.parentElement;
        }
    }

    // Tertiary: search for any scrollable container with messages
    const firstMessage = document.querySelector('._9663006, ._4f9bf79._43c05b5');
    if (firstMessage) {
        let parent = firstMessage.parentElement;
        while (parent) {
            if (isScrollable(parent)) return parent;
            parent = parent.parentElement;
        }
    }

    return null;
}

function isScrollable(element) {
    const style = getComputedStyle(element);
    const overflowY = style.overflowY;
    return (overflowY === 'auto' || overflowY === 'scroll') && element.scrollHeight > element.clientHeight;
}

/**
 * Extracts AI message content using the copy button for high-quality markdown,
 * or falls back to DOM text extraction.
 */
async function extractAIMessageContent(messageDiv) {
    // Strategy 1: Copy button with known SVG path
    let copyButton = null;
    const dsIconButtons = messageDiv.querySelectorAll('.ds-icon-button[role="button"]');
    for (const btn of dsIconButtons) {
        const svgPath = btn.querySelector('svg path[d^="M6.149"]');
        if (svgPath) {
            copyButton = btn;
            break;
        }
    }

    // Strategy 2: First role=button with tabindex
    if (!copyButton) {
        const buttons = messageDiv.querySelectorAll('[role="button"][tabindex]');
        if (buttons.length > 0) {
            copyButton = buttons[0];
        }
    }

    if (copyButton) {
        try {
            return await getContentViaCopyButton(copyButton);
        } catch (error) {
            console.warn('Copy button extraction failed, falling back to DOM:', error);
        }
    }

    // Fallback: extract from DOM directly
    return extractContentFromDOM(messageDiv);
}

/**
 * Extracts content directly from the DOM as a fallback.
 */
function extractContentFromDOM(messageDiv) {
    const markdownDiv = messageDiv.querySelector('.ds-markdown');
    if (!markdownDiv) return null;

    // Use innerText which respects line breaks and formatting
    const text = markdownDiv.innerText?.trim();
    return text || null;
}

function getContentViaCopyButton(copyButton) {
    return new Promise((resolve, reject) => {
        copyButton.click();

        setTimeout(async () => {
            try {
                resolve(await navigator.clipboard.readText());
            } catch (error) {
                reject(error);
            }
        }, 300);
    });
}

function waitForDomSettle(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Waits for a smooth scroll to finish by monitoring scrollTop stability.
 * Resolves when scrollTop hasn't changed for 80ms, or after timeoutMs.
 */
function waitForScrollEnd(container, timeoutMs = 2000) {
    return new Promise(resolve => {
        let lastTop = container.scrollTop;
        let stableTimer = null;
        const STABLE_MS = 80;

        const deadline = setTimeout(() => {
            cleanup();
            resolve();
        }, timeoutMs);

        function check() {
            const currentTop = container.scrollTop;
            if (Math.abs(currentTop - lastTop) < 1) {
                if (!stableTimer) {
                    stableTimer = setTimeout(() => {
                        cleanup();
                        resolve();
                    }, STABLE_MS);
                }
            } else {
                clearTimeout(stableTimer);
                stableTimer = null;
                lastTop = currentTop;
            }
            rafId = requestAnimationFrame(check);
        }

        let rafId = requestAnimationFrame(check);

        function cleanup() {
            cancelAnimationFrame(rafId);
            clearTimeout(stableTimer);
            clearTimeout(deadline);
        }
    });
}
