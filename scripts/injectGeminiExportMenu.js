/**
 * DeepShare Gemini Export Menu Injector
 * Injects "Export to Markdown" and "Export to Word" in the conversation actions menu
 */
(function () {
    'use strict';
    console.debug('DeepShare: Initializing Gemini full conversation export menu');

    // State to track if the last clicked menu button was in the main header (not sidebar)
    let isHeaderMenuClicked = false;
    let headerMenuButtonTestId = '';
    let lastHeaderMenuClickAt = 0;

    // Attach listener to the document to catch clicks on the menu button
    document.addEventListener('click', (e) => {
        if (isInsideSidebarSurface(e.target)) {
            clearHeaderMenuState();
        }

        const menuBtn = e.target.closest([
            '[data-test-id="conversation-actions-menu-icon-button"]',
            '[data-test-id="actions-menu-button"]',
            '[data-test-id="share-and-export-menu-button"]'
        ].join(','));
        if (menuBtn) {
            if (!isHeaderConversationMenuButton(menuBtn)) {
                clearHeaderMenuState();
                return;
            }

            isHeaderMenuClicked = true;
            headerMenuButtonTestId = menuBtn.dataset.testId || '';
            lastHeaderMenuClickAt = Date.now();
            // Menu was clicked, wait for it to appear
            setTimeout(() => injectExportOptions(), 100);
        }
    }, true);

    // Also use observer for cases where the menu might be opened programmatically or via keyboard
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.addedNodes.length) {
                if (!hasRecentHeaderMenuClick()) continue; // Only inject after a confirmed header menu click.

                const roleMenu = findOpenRoleMenu();
                const menuPanel = document.querySelector('.mat-mdc-menu-panel.conversation-actions-menu, .mat-mdc-menu-panel.conversation-actions-menu-panel');
                if (roleMenu?.tagName === 'GEM-MENU') {
                    injectExportOptions({ menuContent: roleMenu });
                } else if (isHeaderMenuClicked && menuPanel && !menuPanel.dataset.deepshareExportInjected) {
                    injectExportOptions();
                }
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    function injectExportOptions(options = {}) {
        if (!hasRecentHeaderMenuClick()) return; // Guard clause for injection

        const menuContent = options.menuContent ||
            document.querySelector('.mat-mdc-menu-panel.conversation-actions-menu .mat-mdc-menu-content, .mat-mdc-menu-panel.conversation-actions-menu-panel .mat-mdc-menu-content') ||
            findOpenRoleMenu();
        if (!menuContent) return;
        if (!isConversationActionsMenu(menuContent)) return;

        if (menuContent.querySelector('.deepshare-export-full-md')) return; // Already injected

        // Find the "Pin" button to insert after
        const pinButton = menuContent.querySelector('[data-test-id="pin-button"]');
        // Find the "Share" button as a fallback anchor
        const shareButton = menuContent.querySelector('[data-test-id="share-button"]');
        const nativeExportButton = menuContent.querySelector('[data-test-id="export-to-docs-button"], [data-test-id="export-to-gmail-button"]');
        
        const targetAnchor = pinButton || shareButton || nativeExportButton || menuContent.firstElementChild;
        if (!targetAnchor) return;

        // Dynamic class detection to match native styling and icon family.
        let iconClass = 'menu-icon';
        let iconFamilyClass = 'google-symbols';
        let iconNamespace = '';
        let textClass = 'menu-text';
        
        const existingIcon = targetAnchor.querySelector('mat-icon');
        const existingText = targetAnchor.querySelector('.mat-mdc-menu-item-text span');
        
        if (existingIcon) {
            if (existingIcon.classList.contains('lumi-symbols')) {
                iconFamilyClass = 'lumi-symbols';
                iconNamespace = 'lumi-symbols';
                iconClass = Array.from(existingIcon.classList).find(className => /^lm-icon-/.test(className)) || 'lm-icon-m';
            } else if (existingIcon.classList.contains('gds-icon-l')) iconClass = 'gds-icon-l';
            else if (existingIcon.classList.contains('menu-icon')) iconClass = 'menu-icon';
        }
        
        if (existingText) {
            // If the existing text uses gds-body-m, it's likely the non-bold version
            if (existingText.classList.contains('gds-body-m')) textClass = 'gds-body-m';
            else if (existingText.classList.contains('menu-text')) textClass = 'menu-text';
        }

        const isGemMenu = targetAnchor.tagName === 'GEM-MENU-ITEM';
        const mdLabel = chrome.i18n?.getMessage('saveAsMarkdown') || 'Save as Markdown';
        const wordLabel = chrome.i18n?.getMessage('docxButton') || 'Save as Word';
        const mdButton = isGemMenu
            ? createGemMenuItem(targetAnchor, 'article', mdLabel, 'deepshare-export-full-md', 'markdown')
            : createMaterialMenuButton(targetAnchor, 'article', mdLabel, 'deepshare-export-full-md', textClass, iconClass, iconFamilyClass, iconNamespace, 'markdown');
        const wordButton = isGemMenu
            ? createGemMenuItem(targetAnchor, 'docs', wordLabel, 'deepshare-export-full-word', 'word')
            : createMaterialMenuButton(targetAnchor, iconFamilyClass === 'lumi-symbols' ? 'docs' : 'description', wordLabel, 'deepshare-export-full-word', textClass, iconClass, iconFamilyClass, iconNamespace, 'word');

        // Insert buttons
        targetAnchor.after(wordButton, mdButton);

        (menuContent.parentElement || menuContent).dataset.deepshareExportInjected = 'true';

        // Click Handlers
        mdButton.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (!isGemMenu) closeMenu();
            await toggleGeminiSelectionMode('md');
        });

        wordButton.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (!isGemMenu) closeMenu();
            await toggleGeminiSelectionMode('docx');
        });
    }

    function isHeaderConversationMenuButton(menuBtn) {
        if (!menuBtn) return false;
        const testId = menuBtn.dataset.testId;
        if (testId !== 'conversation-actions-menu-icon-button' && testId !== 'actions-menu-button' && testId !== 'share-and-export-menu-button') return false;
        if (isSidebarConversationMenuButton(menuBtn)) return false;
        if (testId === 'share-and-export-menu-button' && isMessageShareExportMenuButton(menuBtn)) return false;

        return true;
    }

    function clearHeaderMenuState() {
        isHeaderMenuClicked = false;
        headerMenuButtonTestId = '';
        lastHeaderMenuClickAt = 0;
    }

    function hasRecentHeaderMenuClick() {
        return isHeaderMenuClicked && Date.now() - lastHeaderMenuClickAt < 1500;
    }

    function isSidebarConversationMenuButton(menuBtn) {
        return isInsideSidebarSurface(menuBtn);
    }

    function isInsideSidebarSurface(element) {
        if (!element?.closest) return false;
        return !!element.closest([
            'side-navigation-v2',
            'bard-sidenav',
            'bard-sidenav-container',
            'side-navigation-content'
        ].join(','));
    }

    function isMessageShareExportMenuButton(menuBtn) {
        if (menuBtn.closest('model-response, user-query, [data-message-author-role], article[data-author], article[data-turn]')) {
            return true;
        }

        let node = menuBtn.parentElement;
        let depth = 0;
        while (node && node !== document.body && depth < 8) {
            if (node.matches('header, nav, mat-toolbar, [role="banner"]')) return false;
            if (node.querySelector([
                'copy-button',
                '[data-test-id="copy-button"]',
                '[data-test-id="more-menu-button"]'
            ].join(','))) {
                return true;
            }
            node = node.parentElement;
            depth++;
        }

        return false;
    }

    function createMenuIconHtml(fontIcon, iconClass, iconFamilyClass, iconNamespace) {
        const namespaceAttr = iconNamespace ? ` data-mat-icon-namespace="${iconNamespace}"` : '';
        return `<mat-icon role="img" fonticon="${fontIcon}" class="mat-icon notranslate ${iconClass} ${iconFamilyClass} mat-ligature-font mat-icon-no-color" aria-hidden="true" data-mat-icon-type="font" data-mat-icon-name="${fontIcon}"${namespaceAttr}></mat-icon>`;
    }

    function createMaterialMenuButton(targetAnchor, fontIcon, label, className, textClass, iconClass, iconFamilyClass, iconNamespace, value) {
        if (isLumiMaterialMenuItem(targetAnchor)) {
            return createLumiMaterialMenuButton(targetAnchor, fontIcon, label, className, value);
        }

        const button = document.createElement('button');
        button.className = `${targetAnchor.getAttribute('class') || 'mat-mdc-menu-item mat-focus-indicator ng-star-inserted'} ${className} deepshare-gemini-menu-item`;
        button.setAttribute('type', 'button');
        button.setAttribute('role', 'menuitem');
        button.setAttribute('tabindex', '0');
        button.setAttribute('aria-disabled', 'false');
        button.setAttribute('aria-label', label);
        button.innerHTML = `
            ${createMenuIconHtml(fontIcon, iconClass, iconFamilyClass, iconNamespace)}
            <span class="mat-mdc-menu-item-text"><span class="${textClass}">${label}</span></span>
            <div matripple="" class="mat-ripple mat-mdc-menu-ripple"></div>
        `;
        return button;
    }

    function isLumiMaterialMenuItem(targetAnchor) {
        return targetAnchor.classList?.contains('lm-menu-item-theme') ||
            targetAnchor.hasAttribute?.('lmmenuitemtheme') ||
            !!targetAnchor.querySelector?.('mat-icon.lumi-symbols') ||
            !!targetAnchor.querySelector?.('gem-icon.gem-menu-item-icon');
    }

    function createLumiMaterialMenuButton(targetAnchor, fontIcon, label, className, value) {
        const button = targetAnchor.cloneNode(true);
        button.classList.add(className, 'deepshare-gemini-menu-item');
        button.setAttribute('type', 'button');
        button.setAttribute('role', 'menuitem');
        button.setAttribute('tabindex', '0');
        button.setAttribute('aria-disabled', 'false');
        button.setAttribute('aria-label', label);
        button.setAttribute('data-test-id', `${value}-export-button`);
        button.removeAttribute('jslog');

        const icon = button.querySelector('mat-icon');
        if (icon) {
            icon.setAttribute('fonticon', fontIcon);
            icon.setAttribute('data-mat-icon-name', fontIcon);
            icon.setAttribute('data-mat-icon-namespace', 'lumi-symbols');
            syncLumiIconSizeClass(targetAnchor, icon);
            icon.textContent = '';
        }

        const labelNode = button.querySelector('.gem-menu-item-label') ||
            button.querySelector('.mat-mdc-menu-item-text span:last-child');
        if (labelNode) labelNode.textContent = label;

        return button;
    }

    function createGemMenuItem(targetAnchor, fontIcon, label, className, value) {
        const item = targetAnchor.cloneNode(true);
        item.classList.add(className, 'deepshare-gemini-menu-item');
        item.setAttribute('role', 'menuitem');
        item.setAttribute('value', value);
        item.setAttribute('leadingicon', fontIcon);
        item.setAttribute('data-test-id', `${value}-export-button`);
        item.setAttribute('tabindex', '-1');
        item.setAttribute('aria-disabled', 'false');
        item.removeAttribute('jslog');
        item.removeAttribute('data-active');

        const content = item.querySelector('gem-menu-item-content');
        content?.classList.remove('active');

        const icon = item.querySelector('mat-icon');
        if (icon) {
            icon.setAttribute('fonticon', fontIcon);
            icon.setAttribute('data-mat-icon-name', fontIcon);
            icon.setAttribute('data-mat-icon-namespace', 'lumi-symbols');
            syncLumiIconSizeClass(targetAnchor, icon);
            icon.textContent = '';
        }

        const labelNode = item.querySelector('.label span') ||
            item.querySelector('.label-container span span') ||
            item.querySelector('span');
        if (labelNode) labelNode.textContent = label;

        return item;
    }

    function syncLumiIconSizeClass(source, targetIcon) {
        const sourceIcon = source?.querySelector?.('mat-icon.lumi-symbols');
        const sourceSizeClass = Array.from(sourceIcon?.classList || []).find(className => /^lm-icon-/.test(className));
        if (!sourceSizeClass) return;

        Array.from(targetIcon.classList)
            .filter(className => /^lm-icon-/.test(className))
            .forEach(className => targetIcon.classList.remove(className));
        targetIcon.classList.add(sourceSizeClass);
    }

    function closeMenu() {
        const backdrop = document.querySelector('.cdk-overlay-backdrop');
        if (backdrop) backdrop.click();
    }

    function findOpenRoleMenu() {
        const menus = Array.from(document.querySelectorAll('[role="menu"]'));
        return menus.find(menu => {
            if (menu.querySelector('.deepshare-menu-md-button')) return false;
            return isConversationActionsMenu(menu);
        }) || null;
    }

    function isConversationActionsMenu(menu) {
        if (!menu) return false;
        if (menu.matches?.('gem-menu[panelclass="share-dropdown-menu"]')) {
            return isHeaderMenuClicked && headerMenuButtonTestId === 'share-and-export-menu-button';
        }
        if (isInsideSidebarSurface(menu) || menu.closest('mat-card[data-test-id="card-container"], uploader, toolbox-drawer, .simplified-input-menu, .menu-list-container')) {
            return false;
        }

        if (menu.closest('.mat-mdc-menu-panel.conversation-actions-menu, .mat-mdc-menu-panel.conversation-actions-menu-panel')) {
            return true;
        }

        return isHeaderMenuClicked && !!menu.querySelector('[data-test-id="pin-button"], [data-test-id="rename-button"], [data-test-id="delete-button"]');
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
        const turns = getConversationTurns();
        turns.forEach((turn, index) => {
            if (turn.querySelector('.gemini-message-checkbox-wrapper')) return;

            const role = getTurnRole(turn);
            const wrapper = document.createElement('div');
            wrapper.className = 'gemini-message-checkbox-wrapper';
            wrapper.innerHTML = `<input type="checkbox" class="gemini-message-checkbox" data-index="${index}" data-role="${role}" checked>`;

            turn.classList.add('deepshare-gemini-turn');
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
        document.querySelectorAll('user-query, model-response, .deepshare-gemini-turn').forEach(el => {
            el.removeEventListener('click', handleContainerClick);
            el.classList.remove('deepshare-gemini-turn', 'is-selected');
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
            <span class="gemini-bar-loading-text">${chrome.i18n?.getMessage('loadingHistory') || 'Loading History...'}</span>
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
            <span class="gemini-bar-count">${chrome.i18n?.getMessage('itemsSelected', ['0'])}</span>
            <button class="gemini-bar-btn gemini-bar-btn--secondary select-all-toggle is-active" style="opacity: 0; transition: opacity 0.5s ease 0.2s;">${chrome.i18n?.getMessage('selectAllButton')}</button>
            <button class="gemini-bar-btn gemini-bar-btn--secondary select-all-user is-active" style="opacity: 0; transition: opacity 0.5s ease 0.3s;">${chrome.i18n?.getMessage('selectAllQuestions')}</button>
            <button class="gemini-bar-btn gemini-bar-btn--secondary select-all-assistant is-active" style="opacity: 0; transition: opacity 0.5s ease 0.4s;">${chrome.i18n?.getMessage('selectAllResponsesButton')}</button>
            <button class="gemini-bar-btn gemini-bar-btn--primary confirm-export" style="opacity: 0; transition: opacity 0.5s ease 0.5s;">${chrome.i18n?.getMessage('confirmExport')}</button>
            <button class="gemini-bar-btn gemini-bar-btn--secondary cancel-selection" style="opacity: 0; transition: opacity 0.5s ease 0.6s;">${chrome.i18n?.getMessage('cancelButton')}</button>
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
                window.showToastNotification(chrome.i18n?.getMessage('noMessageSelected'), 'error');
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
        const turns = getConversationTurns();
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
            countEl.textContent = chrome.i18n?.getMessage('itemsSelected', [count.toString()]);
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
        const turns = getConversationTurns();
        let finalMarkdown = '';

        let title = '';
        const titleElement = document.querySelector('[data-test-id="conversation-title"]');
        if (titleElement) {
            title = titleElement.textContent.trim();
        }
        if (!title) {
            title = document.title.replace(' - Gemini', '').trim();
        }
        if (title === 'Gemini' || !title) title = chrome.i18n?.getMessage('geminiConversation');

        finalMarkdown += `# ${title}\n\n`;

        const selectedTurns = turns.filter(turn => {
            if (!onlySelected) return true;
            const checkbox = turn.querySelector('.gemini-message-checkbox');
            return checkbox && checkbox.checked;
        });

        const hasUser = selectedTurns.some(t => getTurnRole(t) === 'user');
        const hasAssistant = selectedTurns.some(t => getTurnRole(t) === 'assistant');
        const showRoleHeaders = hasUser && hasAssistant;

        selectedTurns.forEach((turn) => {
            if (getTurnRole(turn) === 'user') {
                const textContainer = turn.querySelector('.query-text');
                if (window.extractGeminiContentWithFormulas) {
                    const content = textContainer ? window.extractGeminiContentWithFormulas(textContainer) : extractGenericTurnMarkdown(turn, 'user');
                    if (showRoleHeaders) finalMarkdown += `**${chrome.i18n?.getMessage('roleUser')}**\n\n`;
                    finalMarkdown += `${content}\n\n`;
                }
            } else if (getTurnRole(turn) === 'assistant') {
                const contentContainer = turn.querySelector('.model-response-text message-content') ||
                    turn.querySelector('structured-content-container.model-response-text message-content') ||
                    turn.querySelector('message-content');

                let content = '';
                if (contentContainer) {
                    content = window.extractGeminiContentWithFormulas(contentContainer);
                } else {
                    content = extractGenericTurnMarkdown(turn, 'assistant');
                }
                if (showRoleHeaders) finalMarkdown += `**${chrome.i18n?.getMessage('roleAssistant')}**\n\n`;
                finalMarkdown += `${content}\n\n`;
                if (showRoleHeaders) finalMarkdown += `---\n\n`;
            }
        });

        // Append URL info if enabled
        if (includeLink) {
            finalMarkdown += `\n*${chrome.i18n?.getMessage('sourceConversationLabel')}: ${window.location.href}*\n`;
            finalMarkdown += `*${chrome.i18n?.getMessage('exportedViaDeepShare')}*\n`;
        }

        return { title, markdown: finalMarkdown.trim() };
    }

    function getConversationTurns() {
        const oldTurns = Array.from(document.querySelectorAll('user-query, model-response'));
        if (oldTurns.length) return oldTurns;

        const headings = Array.from(document.querySelectorAll('h1, h2, h3, [role="heading"]'))
            .filter(el => /^(你说|Gemini 说)\b/.test((el.textContent || '').replace(/\s+/g, ' ').trim()));

        const turns = [];
        const seen = new Set();
        headings.forEach(heading => {
            const role = (heading.textContent || '').includes('你说') ? 'user' : 'assistant';
            const turn = findMessageBlockFromHeading(heading, role);
            if (turn && !seen.has(turn)) {
                seen.add(turn);
                turn.dataset.deepshareRole = role;
                turns.push(turn);
            }
        });

        return turns.sort((a, b) => a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_PRECEDING ? 1 : -1);
    }

    function findMessageBlockFromHeading(heading, role) {
        const oppositeLabel = role === 'user' ? 'Gemini 说' : '你说';
        let node = heading;
        let candidate = heading.parentElement || heading;

        while (node.parentElement && node.parentElement !== document.body) {
            const parent = node.parentElement;
            const text = (parent.textContent || '').replace(/\s+/g, ' ').trim();
            if (text.includes(oppositeLabel)) return candidate;
            candidate = parent;
            node = parent;
        }

        return candidate;
    }

    function getTurnRole(turn) {
        if (turn.tagName === 'USER-QUERY') return 'user';
        if (turn.tagName === 'MODEL-RESPONSE') return 'assistant';
        if (turn.dataset.deepshareRole) return turn.dataset.deepshareRole;
        const text = (turn.textContent || '').replace(/\s+/g, ' ').trim();
        return text.includes('你说') && !text.includes('Gemini 说') ? 'user' : 'assistant';
    }

    function extractGenericTurnMarkdown(turn, role = getTurnRole(turn)) {
        const headingText = Array.from(turn.querySelectorAll('h1, h2, h3, [role="heading"]'))
            .map(el => (el.textContent || '').replace(/\s+/g, ' ').trim())
            .find(text => role === 'user' ? text.startsWith('你说') : text.startsWith('Gemini 说'));
        const clone = turn.cloneNode(true);
        clone.querySelectorAll('button, svg, menu, [role="menu"], [role="heading"], h1, h2, h3, h4, h5, h6, textarea, input, .gemini-message-checkbox-wrapper, .deepshare-gemini-docx-btn, [aria-hidden="true"]').forEach(el => el.remove());
        const content = window.extractGeminiContentWithFormulas(clone).trim();

        if (content) return content;
        if (role === 'user' && headingText) return headingText.replace(/^你说\s*/, '').trim();
        return '';
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
            'h1', 'h2', 'h3', '[role="heading"]',
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

    function findGeminiHistoryScroller() {
        return document.querySelector('infinite-scroller[data-test-id="chat-history-container"]') ||
            document.querySelector('[data-test-id="chat-history-container"]') ||
            document.querySelector('infinite-scroller.chat-history') ||
            document.querySelector('.chat-history');
    }

    function getHistoryLoadState() {
        const scroller = findGeminiHistoryScroller();
        return {
            turns: getConversationTurns().length,
            scrollHeight: scroller ? scroller.scrollHeight : 0,
            scrollTop: scroller ? scroller.scrollTop : 0,
            fingerprint: computeDOMFingerprint()
        };
    }

    // Scroll the real Gemini history container to trigger loading older messages.
    function scrollHistoryToTop() {
        const scroller = findGeminiHistoryScroller();
        if (!scroller) return false;

        try {
            scroller.scrollTo({ top: 0, behavior: 'auto' });
            scroller.dispatchEvent(new Event('scroll', { bubbles: true }));
            return true;
        } catch (e) {
            console.warn('DeepShare: Failed to scroll Gemini history container', e);
            return false;
        }
    }

    // Click the top node to trigger loading more history in older Gemini UIs.
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

    function hasHistoryLoadStateChanged(beforeState, currentState) {
        return currentState.turns !== beforeState.turns ||
            currentState.scrollHeight !== beforeState.scrollHeight ||
            currentState.fingerprint.signature !== beforeState.fingerprint.signature ||
            currentState.fingerprint.count !== beforeState.fingerprint.count;
    }

    async function waitForHistoryLoadChange(beforeState, timeoutMs = 6000) {
        return new Promise((resolve) => {
            const start = Date.now();
            const pollInterval = setInterval(() => {
                const current = getHistoryLoadState();
                if (hasHistoryLoadStateChanged(beforeState, current)) {
                    clearInterval(pollInterval);
                    resolve(true);
                } else if (Date.now() - start > timeoutMs) {
                    clearInterval(pollInterval);
                    resolve(false);
                }
            }, 100);
        });
    }

    async function autoLoadAllHistory(textEl) {
        console.debug('DeepShare: Starting auto-load of conversation history...');

        // Fast-path: If the conversation currently has 10 or fewer turns, 
        // it's almost certainly not truncated, so skip the auto-load entirely.
        const currentTurns = getConversationTurns().length;
        if (currentTurns <= 10) {
            console.debug('DeepShare: Conversation has 10 or fewer turns. Skipping auto-load.');
            return;
        }

        let attempt = 0;
        const maxAttempts = 50;

        while (attempt < maxAttempts) {
            attempt++;
            const beforeState = getHistoryLoadState();

            const triggered = scrollHistoryToTop() || clickTopNode();
            if (!triggered) {
                console.debug('DeepShare: Could not find history scroller or top node, stopping auto-load.');
                break;
            }

            if (textEl) {
                // Ensure text is kept static without count
                textEl.textContent = chrome.i18n?.getMessage('loadingHistory') || 'Loading history...';
            }

            // Wait up to 4 seconds for Gemini to append older history.
            console.debug(`DeepShare: History load attempt ${attempt}, waiting for DOM change...`);
            const changed = await waitForHistoryLoadChange(beforeState, 4000);

            if (!changed) {
                console.debug('DeepShare: History did not change after scroll. Assuming all history is loaded.');
                break;
            }

            // Wait a little bit extra to ensure DOM settles after change
            await new Promise(r => setTimeout(r, 500));
        }

        console.debug('DeepShare: Finished auto-load sequence.');
    }
})();
