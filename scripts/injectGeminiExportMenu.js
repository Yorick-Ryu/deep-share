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
            const { title, markdown } = extractFullConversation();
            downloadMarkdownFile(markdown, title);
        });

        wordButton.addEventListener('click', (e) => {
            e.stopPropagation();
            closeMenu();
            const { title, markdown } = extractFullConversation();

            const event = new CustomEvent('deepshare:convertToDocx', {
                detail: {
                    messages: { content: markdown },
                    sourceButton: wordButton,
                    documentTitle: title
                },
            });
            document.dispatchEvent(event);
        });
    }

    function closeMenu() {
        const backdrop = document.querySelector('.cdk-overlay-backdrop');
        if (backdrop) backdrop.click();
    }

    function extractFullConversation() {
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

        turns.forEach((turn, index) => {
            if (turn.tagName === 'USER-QUERY') {
                const textContainer = turn.querySelector('.query-text');
                if (textContainer) {
                    finalMarkdown += `### User\n\n${textContainer.textContent.trim()}\n\n`;
                }
            } else if (turn.tagName === 'MODEL-RESPONSE') {
                const contentContainer = turn.querySelector('.model-response-text message-content') ||
                    turn.querySelector('structured-content-container.model-response-text message-content') ||
                    turn.querySelector('message-content');

                let content = '';
                if (contentContainer) {
                    content = window.extractGeminiContentWithFormulas(contentContainer);
                }
                finalMarkdown += `### Assistant\n\n${content}\n\n`;
                finalMarkdown += `---\n\n`;
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
