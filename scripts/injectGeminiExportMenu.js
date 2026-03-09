/**
 * DeepShare Gemini Export Menu Injector
 * Injects "Export to Markdown" and "Export to Word" in the conversation actions menu
 */
(function () {
    'use strict';
    console.debug('DeepShare: Initializing Gemini full conversation export menu');

    // Attach listener to the document to catch clicks on the menu button
    document.addEventListener('click', (e) => {
        const menuBtn = e.target.closest('button[data-test-id="conversation-actions-menu-icon-button"]');
        if (menuBtn) {
            // Menu was clicked, wait for it to appear
            setTimeout(injectExportOptions, 100);
        }
    }, true);

    // Also use observer for cases where the menu might be opened programmatically or via keyboard
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.addedNodes.length) {
                const menuPanel = document.querySelector('.mat-mdc-menu-panel.conversation-actions-menu');
                if (menuPanel && !menuPanel.dataset.deepshareExportInjected) {
                    injectExportOptions();
                }
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    function injectExportOptions() {
        const menuContent = document.querySelector('.mat-mdc-menu-panel.conversation-actions-menu .mat-mdc-menu-content');
        if (!menuContent) return;

        if (menuContent.querySelector('.deepshare-export-full-md')) return; // Already injected

        // Skip if there's a "Share" button (indicates history list menu)
        if (menuContent.querySelector('[data-test-id="share-button"]')) {
            console.debug('DeepShare: Share button detected, likely a history item menu. Skipping injection.');
            return;
        }

        // Find the "Pin" button to insert after
        const pinButton = menuContent.querySelector('button[data-test-id="pin-button"]');
        const targetAnchor = pinButton || menuContent.firstElementChild;
        if (!targetAnchor) return;

        // --- Create Export to Markdown Button
        const mdButton = document.createElement('button');
        mdButton.className = 'mat-mdc-menu-item mat-focus-indicator ng-star-inserted deepshare-export-full-md';
        mdButton.setAttribute('role', 'menuitem');
        mdButton.setAttribute('tabindex', '0');
        mdButton.setAttribute('aria-disabled', 'false');
        mdButton.innerHTML = `
            <mat-icon role="img" fonticon="file_download" class="mat-icon notranslate gds-icon-l google-symbols mat-ligature-font mat-icon-no-color" aria-hidden="true" data-mat-icon-type="font" data-mat-icon-name="file_download">
                <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style="width: 20px; height: 20px;">
                    <path d="M20.56 18H3.44C2.65 18 2 17.37 2 16.59V7.41C2 6.63 2.65 6 3.44 6H20.56C21.35 6 22 6.63 22 7.41V16.59C22 17.37 21.35 18 20.56 18M6.81 15.19V11.53L8.73 13.88L10.65 11.53V15.19H12.58V8.81H10.65L8.73 11.16L6.81 8.81H4.89V15.19H6.81M19.69 12H17.77V8.81H15.85V12H13.92L16.81 15.28L19.69 12Z"/>
                </svg>
            </mat-icon>
            <span class="mat-mdc-menu-item-text"><span class="gds-body-m">${chrome.i18n.getMessage('saveAsMarkdown')}</span></span>
            <div matripple="" class="mat-ripple mat-mdc-menu-ripple"></div>
        `;

        // --- Create Export to Word Button
        const wordButton = document.createElement('button');
        wordButton.className = 'mat-mdc-menu-item mat-focus-indicator ng-star-inserted deepshare-export-full-word';
        wordButton.setAttribute('role', 'menuitem');
        wordButton.setAttribute('tabindex', '0');
        wordButton.setAttribute('aria-disabled', 'false');
        wordButton.innerHTML = `
            <mat-icon role="img" fonticon="description" class="mat-icon notranslate gds-icon-l google-symbols mat-ligature-font mat-icon-no-color" aria-hidden="true" data-mat-icon-type="font" data-mat-icon-name="description">
                <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style="width: 20px; height: 20px;">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                </svg>
            </mat-icon>
            <span class="mat-mdc-menu-item-text"><span class="gds-body-m">${chrome.i18n.getMessage('docxButton')}</span></span>
            <div matripple="" class="mat-ripple mat-mdc-menu-ripple"></div>
        `;

        // Insert buttons
        targetAnchor.after(wordButton, mdButton);

        menuContent.parentElement.dataset.deepshareExportInjected = 'true';

        // Click Handlers
        mdButton.addEventListener('click', async (e) => {
            e.stopPropagation();
            closeMenu();
            await toggleGeminiSelectionMode('md');
        });

        wordButton.addEventListener('click', async (e) => {
            e.stopPropagation();
            closeMenu();
            await toggleGeminiSelectionMode('docx');
        });
    }

    function closeMenu() {
        const backdrop = document.querySelector('.cdk-overlay-backdrop');
        if (backdrop) backdrop.click();
    }

    let isSelectionMode = false;
    let selectedFormat = 'md';
    let currentConversationId = getConversationId();

    function getConversationId() {
        // Conversation ID is usually the last part of the URL path in Gemini
        const parts = window.location.pathname.split('/');
        return parts[parts.length - 1];
    }

    // Monitor URL changes to detect conversation switching
    let lastHref = window.location.href;
    const urlObserver = new MutationObserver(() => {
        if (lastHref !== window.location.href) {
            lastHref = window.location.href;
            const newConvId = getConversationId();
            if (newConvId !== currentConversationId) {
                currentConversationId = newConvId;
                if (isSelectionMode) {
                    console.debug('DeepShare: Conversation changed, exiting selection mode');
                    exitGeminiSelectionMode();
                }
            }
        }
    });
    urlObserver.observe(document, { childList: true, subtree: true });

    async function toggleGeminiSelectionMode(format) {
        if (isSelectionMode) {
            exitGeminiSelectionMode();
            return;
        }

        isSelectionMode = true;
        selectedFormat = format;

        // Phase 1: Inject selection bar in "loading" state
        const loadingTextEl = injectLoadingSelectionBar();

        try {
            // Wait for all history to be pulled into the DOM
            await autoLoadAllHistory(loadingTextEl);
        } finally {
            // Proceed even if auto-load had issues
        }

        if (!isSelectionMode) return; // User might have navigated away during load

        // Phase 2: Inject selection UI (checkboxes) into all loaded turns
        document.body.classList.add('gemini-selection-mode');
        const turns = document.querySelectorAll('user-query, model-response');
        turns.forEach((turn, index) => {
            if (turn.querySelector('.gemini-message-checkbox-wrapper')) return;

            const role = turn.tagName === 'USER-QUERY' ? 'user' : 'assistant';
            const wrapper = document.createElement('div');
            wrapper.className = 'gemini-message-checkbox-wrapper';
            wrapper.innerHTML = `<input type="checkbox" class="gemini-message-checkbox" data-index="${index}" data-role="${role}" checked>`;

            turn.prepend(wrapper);
            turn.classList.add('is-selected'); // 初始选中时添加类名

            // Make entire turn clickable to toggle checkbox
            turn.addEventListener('click', handleContainerClick);
        });

        // Phase 3: Transition the selection bar from "loading" state to "active" state
        requestAnimationFrame(() => {
            transitionSelectionBarToActive();
            updateSelectionCount();
        });
    }

    function handleContainerClick(e) {
        if (e.target.closest('.gemini-message-checkbox-wrapper')) return;
        const checkbox = this.querySelector('.gemini-message-checkbox');
        if (checkbox) {
            checkbox.checked = !checkbox.checked;
            updateSelectionCount();
        }
    }

    function exitGeminiSelectionMode() {
        isSelectionMode = false;
        document.body.classList.remove('gemini-selection-mode');

        document.querySelectorAll('.gemini-message-checkbox-wrapper').forEach(el => el.remove());
        document.querySelectorAll('user-query, model-response').forEach(el => {
            el.removeEventListener('click', handleContainerClick);
        });

        const bar = document.querySelector('.gemini-selection-bar');
        if (bar) bar.remove();
    }

    function injectLoadingSelectionBar() {
        let bar = document.querySelector('.gemini-selection-bar');
        if (bar) bar.remove();

        bar = document.createElement('div');
        bar.className = 'gemini-selection-bar is-loading';

        bar.innerHTML = `
            <mat-spinner role="progressbar" class="mat-mdc-progress-spinner mdc-circular-progress mat-primary mdc-circular-progress--indeterminate" style="width: 24px; height: 24px;">
                <div class="mdc-circular-progress__indeterminate-container">
                    <div class="mdc-circular-progress__spinner-layer">
                        <div class="mdc-circular-progress__circle-clipper mdc-circular-progress__circle-left">
                            <svg class="mdc-circular-progress__indeterminate-circle-graphic" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="18" stroke-dasharray="113.097" stroke-dashoffset="56.549" stroke-width="4"></circle></svg>
                        </div>
                        <div class="mdc-circular-progress__gap-patch">
                            <svg class="mdc-circular-progress__indeterminate-circle-graphic" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="18" stroke-dasharray="113.097" stroke-dashoffset="56.549" stroke-width="4"></circle></svg>
                        </div>
                        <div class="mdc-circular-progress__circle-clipper mdc-circular-progress__circle-right">
                            <svg class="mdc-circular-progress__indeterminate-circle-graphic" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="18" stroke-dasharray="113.097" stroke-dashoffset="56.549" stroke-width="4"></circle></svg>
                        </div>
                    </div>
                </div>
            </mat-spinner>
            <span class="gemini-bar-loading-text">${chrome.i18n.getMessage('loadingHistory') || 'Loading History...'}</span>
        `;

        // Add spinner animation keyframes if not present
        if (!document.getElementById('gemini-export-keyframes')) {
            const style = document.createElement('style');
            style.id = 'gemini-export-keyframes';
            style.textContent = `@keyframes gemini-export-spin { to { transform: rotate(360deg); } }`;
            document.head.appendChild(style);
        }

        const container = document.querySelector('chat-window') || document.body;
        container.appendChild(bar);

        return bar.querySelector('.gemini-bar-loading-text');
    }

    function transitionSelectionBarToActive() {
        const bar = document.querySelector('.gemini-selection-bar');
        if (!bar) return;

        // Animate the bar expansion using the CSS class
        bar.classList.remove('is-loading');
        bar.classList.add('is-active');

        // Replace content with actual controls
        bar.innerHTML = `
            <span class="gemini-bar-count">${chrome.i18n.getMessage('itemsSelected', ['0'])}</span>
            <button class="gemini-bar-btn gemini-bar-btn--secondary select-all-toggle is-active" style="opacity: 0; transition: opacity 0.5s ease 0.2s;">${chrome.i18n.getMessage('selectAllButton')}</button>
            <button class="gemini-bar-btn gemini-bar-btn--secondary select-all-user is-active" style="opacity: 0; transition: opacity 0.5s ease 0.3s;">${chrome.i18n.getMessage('selectAllQuestions')}</button>
            <button class="gemini-bar-btn gemini-bar-btn--secondary select-all-assistant is-active" style="opacity: 0; transition: opacity 0.5s ease 0.4s;">${chrome.i18n.getMessage('selectAllResponsesButton')}</button>
            <button class="gemini-bar-btn gemini-bar-btn--primary confirm-export" style="opacity: 0; transition: opacity 0.5s ease 0.5s;">${chrome.i18n.getMessage('confirmExport')}</button>
            <button class="gemini-bar-btn gemini-bar-btn--secondary cancel-selection" style="opacity: 0; transition: opacity 0.5s ease 0.6s;">${chrome.i18n.getMessage('cancelButton')}</button>
        `;

        // Trigger reflow then fade in buttons
        requestAnimationFrame(() => {
            bar.querySelectorAll('.gemini-bar-btn').forEach(btn => btn.style.opacity = '1');
        });

        bar.querySelector('.select-all-toggle').addEventListener('click', () => {
            const checkboxes = document.querySelectorAll('.gemini-message-checkbox');
            const allChecked = Array.from(checkboxes).every(cb => cb.checked);
            checkboxes.forEach(cb => cb.checked = !allChecked);
            updateSelectionCount();
        });

        bar.querySelector('.select-all-user').addEventListener('click', () => {
            const checkboxes = document.querySelectorAll('.gemini-message-checkbox[data-role="user"]');
            const allChecked = Array.from(checkboxes).every(cb => cb.checked);
            checkboxes.forEach(cb => cb.checked = !allChecked);
            updateSelectionCount();
        });

        bar.querySelector('.select-all-assistant').addEventListener('click', () => {
            const checkboxes = document.querySelectorAll('.gemini-message-checkbox[data-role="assistant"]');
            const allChecked = Array.from(checkboxes).every(cb => cb.checked);
            checkboxes.forEach(cb => cb.checked = !allChecked);
            updateSelectionCount();
        });

        bar.querySelector('.confirm-export').addEventListener('click', async (e) => {
            const btn = e.target;
            const originalText = btn.textContent;
            btn.disabled = true;
            // History is already loaded by toggleGeminiSelectionMode, no need to show loading text here.

            const data = await chrome.storage.sync.get(['includeGeminiChatLink']);
            const { title, markdown } = extractFullConversation(true, data.includeGeminiChatLink === true);

            btn.disabled = false;
            btn.textContent = originalText;

            if (!markdown.trim() || markdown.split('\n').length < 5) { // Basic check for empty extraction
                window.showToastNotification(chrome.i18n.getMessage('noMessageSelected'), 'error');
                return;
            }

            if (selectedFormat === 'md') {
                downloadMarkdownFile(markdown, title);
            } else {
                const event = new CustomEvent('deepshare:convertToDocx', {
                    detail: {
                        messages: { content: markdown },
                        sourceButton: bar.querySelector('.confirm-export'),
                        documentTitle: title
                    },
                });
                document.dispatchEvent(event);
            }
            exitGeminiSelectionMode();
        });

        bar.querySelector('.cancel-selection').addEventListener('click', exitGeminiSelectionMode);

        // Listen for checkbox changes to update count setup happens once in transitionSelectionBarToActive,
        // but we need to make sure we don't bind this event listener multiple times.
        if (!document.body.dataset.geminiSelectionListenerBound) {
            document.body.dataset.geminiSelectionListenerBound = 'true';
            document.addEventListener('change', (e) => {
                if (e.target.classList.contains('gemini-message-checkbox')) {
                    updateSelectionCount();
                }
            });
        }
    }

    function updateSelectionCount() {
        const turns = document.querySelectorAll('user-query, model-response');
        turns.forEach(turn => {
            const cb = turn.querySelector('.gemini-message-checkbox');
            if (cb) {
                turn.classList.toggle('is-selected', cb.checked);
            }
        });

        const checkboxes = document.querySelectorAll('.gemini-message-checkbox');
        const count = Array.from(checkboxes).filter(cb => cb.checked).length;
        const countEl = document.querySelector('.gemini-bar-count');
        if (countEl) {
            countEl.textContent = chrome.i18n.getMessage('itemsSelected', [count.toString()]);
        }

        const bar = document.querySelector('.gemini-selection-bar');
        if (!bar) return;

        // Update Toggle buttons
        const allChecked = checkboxes.length > 0 && Array.from(checkboxes).every(cb => cb.checked);
        const allToggle = bar.querySelector('.select-all-toggle');
        if (allToggle) {
            allToggle.classList.toggle('is-active', allChecked);
        }

        const userCheckboxes = document.querySelectorAll('.gemini-message-checkbox[data-role="user"]');
        const allUserChecked = userCheckboxes.length > 0 && Array.from(userCheckboxes).every(cb => cb.checked);
        const userToggle = bar.querySelector('.select-all-user');
        if (userToggle) {
            userToggle.classList.toggle('is-active', allUserChecked);
        }

        const assistantCheckboxes = document.querySelectorAll('.gemini-message-checkbox[data-role="assistant"]');
        const allAssistantChecked = assistantCheckboxes.length > 0 && Array.from(assistantCheckboxes).every(cb => cb.checked);
        const assistantToggle = bar.querySelector('.select-all-assistant');
        if (assistantToggle) {
            assistantToggle.classList.toggle('is-active', allAssistantChecked);
        }

        // Disable confirm-export if count is 0
        const confirmBtn = bar.querySelector('.confirm-export');
        if (confirmBtn) {
            confirmBtn.disabled = count === 0;
        }
    }

    function extractFullConversation(onlySelected = false, includeLink = false) {
        const turns = Array.from(document.querySelectorAll('user-query, model-response'));
        let finalMarkdown = '';

        let title = '';
        const titleElement = document.querySelector('[data-test-id="conversation-title"]');
        if (titleElement) {
            title = titleElement.textContent.trim();
        }
        if (!title) {
            title = document.title.replace(' - Gemini', '').trim();
        }
        if (title === 'Gemini' || !title) title = chrome.i18n.getMessage('geminiConversation');

        finalMarkdown += `# ${title}\n\n`;

        const selectedTurns = turns.filter(turn => {
            if (!onlySelected) return true;
            const checkbox = turn.querySelector('.gemini-message-checkbox');
            return checkbox && checkbox.checked;
        });

        const hasUser = selectedTurns.some(t => t.tagName === 'USER-QUERY');
        const hasAssistant = selectedTurns.some(t => t.tagName === 'MODEL-RESPONSE');
        const showRoleHeaders = hasUser && hasAssistant;

        selectedTurns.forEach((turn) => {
            if (turn.tagName === 'USER-QUERY') {
                const textContainer = turn.querySelector('.query-text');
                if (textContainer && window.extractGeminiContentWithFormulas) {
                    const content = window.extractGeminiContentWithFormulas(textContainer);
                    if (showRoleHeaders) finalMarkdown += `**${chrome.i18n.getMessage('roleUser')}**\n\n`;
                    finalMarkdown += `${content}\n\n`;
                }
            } else if (turn.tagName === 'MODEL-RESPONSE') {
                const contentContainer = turn.querySelector('.model-response-text message-content') ||
                    turn.querySelector('structured-content-container.model-response-text message-content') ||
                    turn.querySelector('message-content');

                let content = '';
                if (contentContainer) {
                    content = window.extractGeminiContentWithFormulas(contentContainer);
                }
                if (showRoleHeaders) finalMarkdown += `**${chrome.i18n.getMessage('roleAssistant')}**\n\n`;
                finalMarkdown += `${content}\n\n`;
                if (showRoleHeaders) finalMarkdown += `---\n\n`;
            }
        });

        // Append URL info if enabled
        if (includeLink) {
            finalMarkdown += `\n*${chrome.i18n.getMessage('sourceConversationLabel')}: ${window.location.href}*\n`;
            finalMarkdown += `*${chrome.i18n.getMessage('exportedViaDeepShare')}*\n`;
        }

        return { title, markdown: finalMarkdown.trim() };
    }

    function downloadMarkdownFile(content, title) {
        const filename = generateFilename(title) + '.md';
        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    function generateFilename(title) {
        const now = new Date();
        const timestamp = now.toLocaleString('zh-CN', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false
        }).replace(/[\/\s:]/g, '-').replace(',', '');

        if (!title) return `gemini_conversation_${timestamp}`;
        const cleanTitle = title.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5\-]/g, '').substring(0, 50).trim();
        return `${cleanTitle || 'gemini_conversation'}_${timestamp}`;
    }

    // --- Auto-Load Logic ---

    function getFingerprintSelectors() {
        return [
            '.user-query-bubble-with-background',
            '.user-query-bubble-container',
            '.user-query-container',
            'user-query-content .user-query-bubble-with-background',
            'div[aria-label="User message"]',
            'article[data-author="user"]',
            'article[data-turn="user"]',
            '[data-message-author-role="user"]',
            'div[role="listitem"][data-user="true"]',
            '[aria-label="Gemini response"]',
            '[data-message-author-role="assistant"]',
            '[data-message-author-role="model"]',
            'article[data-author="assistant"]',
            'article[data-turn="assistant"]',
            'article[data-turn="model"]',
            '.model-response', 'model-response',
            '.response-container',
            'div[role="listitem"]:not([data-user="true"])'
        ];
    }

    function hashString(input) {
        let h = 2166136261 >>> 0;
        for (let i = 0; i < input.length; i++) {
            h ^= input.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return (h >>> 0).toString(36);
    }

    function computeDOMFingerprint() {
        const selector = getFingerprintSelectors().join(',');
        const nodes = Array.from(document.querySelectorAll(selector));

        // Filter out nodes that are descendants of other matched nodes
        const topLevel = [];
        for (const el of nodes) {
            const parent = el.parentElement;
            if (parent && parent.closest(selector)) continue;
            topLevel.push(el);
        }

        const texts = [];
        for (let i = 0; i < topLevel.length && texts.length < 10; i++) {
            const t = String(topLevel[i].textContent || '').replace(/\\s+/g, ' ').trim();
            if (t) texts.push(t);
        }

        const signature = hashString(texts.join('|'));
        return { signature, count: topLevel.length };
    }

    // Click the top node to trigger loading more history
    function clickTopNode() {
        const selector = getFingerprintSelectors().join(',');
        const nodes = Array.from(document.querySelectorAll(selector));

        const topLevel = [];
        for (const el of nodes) {
            const parent = el.parentElement;
            if (parent && parent.closest(selector)) continue;
            topLevel.push(el);
        }

        if (topLevel.length > 0) {
            const topNode = topLevel[0];
            try {
                topNode.scrollIntoView({ behavior: 'auto', block: 'center' });
                const opts = { bubbles: true, cancelable: true, view: window };
                topNode.dispatchEvent(new MouseEvent('mousedown', opts));
                topNode.dispatchEvent(new MouseEvent('mouseup', opts));
                topNode.click();
                return true;
            } catch (e) {
                console.warn('DeepShare: Failed to click top node', e);
            }
        }
        return false;
    }

    async function waitForDOMChange(beforeFingerprint, timeoutMs = 6000) {
        return new Promise((resolve) => {
            const start = Date.now();
            const pollInterval = setInterval(() => {
                const current = computeDOMFingerprint();
                if (current.signature !== beforeFingerprint.signature || current.count !== beforeFingerprint.count) {
                    clearInterval(pollInterval);
                    resolve(true); // Changed
                } else if (Date.now() - start > timeoutMs) {
                    clearInterval(pollInterval);
                    resolve(false); // Timed out without change
                }
            }, 100);
        });
    }

    async function autoLoadAllHistory(textEl) {
        console.debug('DeepShare: Starting auto-load of conversation history...');

        // Fast-path: If the conversation currently has 10 or fewer turns, 
        // it's almost certainly not truncated, so skip the auto-load entirely.
        const currentTurns = document.querySelectorAll('user-query, model-response').length;
        if (currentTurns <= 10) {
            console.debug('DeepShare: Conversation has 10 or fewer turns. Skipping auto-load.');
            return;
        }

        let attempt = 0;
        const maxAttempts = 50;

        while (attempt < maxAttempts) {
            attempt++;
            const beforeFingerprint = computeDOMFingerprint();

            const clicked = clickTopNode();
            if (!clicked) {
                console.debug('DeepShare: Could not find top node to click, stopping auto-load.');
                break;
            }

            if (textEl) {
                // Ensure text is kept static without count
                textEl.textContent = chrome.i18n.getMessage('loadingHistory') || 'Loading history...';
            }

            // Wait up to 3 seconds for the DOM to change
            console.debug(`DeepShare: Simulation click ${attempt}, waiting for DOM change...`);
            const changed = await waitForDOMChange(beforeFingerprint, 3000);

            if (!changed) {
                console.debug('DeepShare: DOM did not change after click. Assuming all history is loaded.');
                break;
            }

            // Wait a little bit extra to ensure DOM settles after change
            await new Promise(r => setTimeout(r, 500));
        }

        console.debug('DeepShare: Finished auto-load sequence.');
    }
})();
