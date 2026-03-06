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
            <span class="mat-mdc-menu-item-text"><span class="gds-body-m">${chrome.i18n.getMessage('saveAsMarkdown') || '保存为 Markdown'}</span></span>
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
            <span class="mat-mdc-menu-item-text"><span class="gds-body-m">${chrome.i18n.getMessage('docxButton') || '保存为Word'}</span></span>
            <div matripple="" class="mat-ripple mat-mdc-menu-ripple"></div>
        `;

        // Insert buttons
        targetAnchor.after(wordButton, mdButton);

        menuContent.parentElement.dataset.deepshareExportInjected = 'true';

        // Click Handlers
        mdButton.addEventListener('click', (e) => {
            e.stopPropagation();
            closeMenu();
            toggleGeminiSelectionMode('md');
        });

        wordButton.addEventListener('click', (e) => {
            e.stopPropagation();
            closeMenu();
            toggleGeminiSelectionMode('docx');
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

    function toggleGeminiSelectionMode(format) {
        if (isSelectionMode) {
            exitGeminiSelectionMode();
            return;
        }

        isSelectionMode = true;
        selectedFormat = format;

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

        // 在下一帧添加类名，触发平滑的 CSS Transition
        requestAnimationFrame(() => {
            document.body.classList.add('gemini-selection-mode');
            injectSelectionBar();
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

    function injectSelectionBar() {
        if (document.querySelector('.gemini-selection-bar')) return;

        const bar = document.createElement('div');
        bar.className = 'gemini-selection-bar';
        bar.innerHTML = `
            <span class="gemini-bar-count">已选择 0 项</span>
            <button class="gemini-bar-btn gemini-bar-btn--secondary select-all-toggle is-active">全选</button>
            <button class="gemini-bar-btn gemini-bar-btn--secondary select-all-user is-active">全选问题</button>
            <button class="gemini-bar-btn gemini-bar-btn--secondary select-all-assistant is-active">全选回答</button>
            <button class="gemini-bar-btn gemini-bar-btn--primary confirm-export">确认导出</button>
            <button class="gemini-bar-btn gemini-bar-btn--secondary cancel-selection">取消</button>
        `;

        const container = document.querySelector('chat-window');
        container.appendChild(bar);

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

        bar.querySelector('.confirm-export').addEventListener('click', () => {
            const { title, markdown } = extractFullConversation(true);

            if (!markdown.trim() || markdown.split('\n').length < 5) { // Basic check for empty extraction
                window.showToastNotification('请至少选择一条消息', 'error');
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

        // Listen for checkbox changes to update count
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('gemini-message-checkbox')) {
                updateSelectionCount();
            }
        });
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
            countEl.textContent = `已选择 ${count} 项`;
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

    function extractFullConversation(onlySelected = false) {
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
        if (title === 'Gemini' || !title) title = 'Gemini Conversation';

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
                    if (showRoleHeaders) finalMarkdown += `**User**\n\n`;
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
                if (showRoleHeaders) finalMarkdown += `**Assistant**\n\n`;
                finalMarkdown += `${content}\n\n`;
                if (showRoleHeaders) finalMarkdown += `---\n\n`;
            }
        });

        // Append URL info
        finalMarkdown += `\n*Source: ${window.location.href}*\n`;
        finalMarkdown += `*Exported via DeepShare*\n`;

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
})();
