/**
 * DeepShare Gemini Button Injector
 * Injects a DOCX conversion button into the Gemini interface
 */

(function () {
    'use strict';

    let lastUrl = location.href;
    let activeMessageContainer = null;
    console.debug('DeepShare: Initializing DOCX button injection for Gemini');

    function findAndInjectButtons() {
        // Find button containers with the Gemini structure
        const buttonContainers = document.querySelectorAll('.buttons-container-v2, [class*="buttons-container"]');

        buttonContainers.forEach(container => {
            // 1. Handle DOCX button injection
            const copyButton = container.querySelector('copy-button button[data-test-id="copy-button"], copy-button button[mattooltip*="复制"], copy-button button[aria-label*="复制"], copy-button button[aria-label*="Copy"]');

            if (copyButton && !container.querySelector('.deepshare-gemini-docx-btn')) {
                injectButton(copyButton, container);
            }

            // 2. Handle "More" menu listener to track active message
            const moreButton = container.querySelector('[data-test-id="more-menu-button"] button, button[data-test-id="more-menu-button"]');
            if (moreButton && !moreButton.dataset.deepshareListenerAttached) {
                moreButton.dataset.deepshareListenerAttached = 'true';
                moreButton.addEventListener('click', () => {
                    activeMessageContainer = moreButton.closest('model-response');
                    console.debug('DeepShare: More menu opened, tracking message container');
                    // Wait for the menu overlay to appear
                    setTimeout(injectMdButtonToMenu, 100);
                });
            }
        });

        findAndInjectNewUiButtons();
    }

    function findAndInjectNewUiButtons() {
        const copyButtons = document.querySelectorAll('button[aria-label="复制"], button[aria-label="Copy"], button[aria-label*="复制回复"], button[aria-label*="Copy response"]');

        copyButtons.forEach(copyButton => {
            const messageContainer = findClosestMessageContainer(copyButton, 'assistant');
            if (!messageContainer) return;

            const actionRow = findActionRow(copyButton, messageContainer);
            if (!actionRow || actionRow.querySelector('.deepshare-gemini-docx-btn')) return;

            injectNewUiButton(copyButton, actionRow);
        });

        const moreButtons = document.querySelectorAll('[data-test-id="more-menu-button"] button, button[data-test-id="more-menu-button"]');
        moreButtons.forEach(moreButton => {
            const messageContainer = findClosestMessageContainer(moreButton, 'assistant');
            if (!messageContainer || moreButton.dataset.deepshareListenerAttached) return;

            moreButton.dataset.deepshareListenerAttached = 'true';
            moreButton.addEventListener('click', () => {
                activeMessageContainer = messageContainer;
                console.debug('DeepShare: New UI more menu opened, tracking message container');
                setTimeout(injectMdButtonToMenu, 100);
            });
        });

        const shareExportButtons = document.querySelectorAll([
            '[data-test-id="share-and-export-menu-button"] button',
            'button[data-test-id="share-and-export-menu-button"]'
        ].join(','));
        shareExportButtons.forEach(shareExportButton => {
            const messageContainer = findClosestMessageContainer(shareExportButton, 'assistant');
            if (!messageContainer || shareExportButton.dataset.deepshareListenerAttached) return;

            shareExportButton.dataset.deepshareListenerAttached = 'true';
            shareExportButton.addEventListener('click', () => {
                activeMessageContainer = messageContainer;
                console.debug('DeepShare: New UI share/export menu opened, tracking message container');
                setTimeout(injectMdButtonToMenu, 100);
            });
        });
    }

    function findActionRow(button, messageContainer) {
        let node = button.parentElement;
        while (node && node !== messageContainer) {
            const actionButtons = node.querySelectorAll('button[aria-label], button[data-test-id]');
            if (actionButtons.length >= 2) return node;
            node = node.parentElement;
        }
        return button.parentElement;
    }

    function findClosestMessageContainer(element, expectedRole) {
        const oldContainer = element.closest('model-response, user-query, [data-message-author-role="assistant"], [data-message-author-role="user"], article[data-author], article[data-turn]');
        if (oldContainer) return oldContainer;

        const roleLabel = expectedRole === 'user' ? '你说' : 'Gemini 说';
        const oppositeLabel = expectedRole === 'user' ? 'Gemini 说' : '你说';
        let node = element.parentElement;
        let candidate = null;

        while (node && node !== document.body) {
            const text = (node.textContent || '').replace(/\s+/g, ' ').trim();
            if (text.includes(roleLabel)) {
                candidate = node;
            }
            if (candidate && text.includes(oppositeLabel)) {
                return candidate;
            }
            node = node.parentElement;
        }

        return candidate;
    }

    const observer = new MutationObserver(() => {
        // On any DOM change, re-check for buttons
        findAndInjectButtons();

        // Also check if URL has changed for SPA navigation
        const currentUrl = location.href;
        if (currentUrl !== lastUrl) {
            console.debug(`DeepShare: URL changed to ${currentUrl}. Re-checking for buttons.`);
            lastUrl = currentUrl;
            // A small delay can help ensure the new content is loaded
            setTimeout(findAndInjectButtons, 500);
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });

    // Initial injection check after a small delay
    setTimeout(findAndInjectButtons, 1000);

    function injectButton(copyBtn, container) {
        console.debug('Injecting DOCX button for Gemini');

        if (isLuminousGeminiUi(container)) {
            injectLuminousButton(copyBtn, container);
            return;
        }

        // Create the wrapper component (following Gemini's Angular component structure)
        const buttonWrapper = document.createElement('deepshare-docx-button');
        buttonWrapper.className = 'deepshare-gemini-docx-btn ng-star-inserted';

        // Add Angular-style attributes to match the container's attributes
        const containerNgContent = container.getAttribute('_ngcontent-ng-c1687429729') ||
            container.querySelector('[_ngcontent-ng-c1687429729]')?.getAttribute('_ngcontent-ng-c1687429729') || '';

        if (containerNgContent !== null) {
            buttonWrapper.setAttribute('_ngcontent-ng-c1687429729', containerNgContent);
        }
        buttonWrapper.setAttribute('_nghost-ng-c3341669442', '');
        buttonWrapper.classList.add('ng-tns-c1687429729-17');

        // Create the actual button element with exact same structure as icon buttons
        const docxButton = document.createElement('button');
        // 修改为icon-button类型，与thumbs up/down按钮一致
        docxButton.className = 'mdc-icon-button mat-mdc-icon-button mat-mdc-button-base mat-mdc-tooltip-trigger icon-button mat-unthemed';
        docxButton.setAttribute('_ngcontent-ng-c3341669442', '');
        docxButton.setAttribute('mat-icon-button', ''); // 改为icon-button
        docxButton.setAttribute('tabindex', '0');
        docxButton.setAttribute('mattooltip', chrome.i18n?.getMessage('docxButton') || '保存为Word');
        docxButton.setAttribute('aria-label', chrome.i18n?.getMessage('docxButton') || '保存为Word');
        docxButton.setAttribute('title', chrome.i18n?.getMessage('docxButton') || '保存为Word');
        docxButton.setAttribute('data-test-id', 'docx-button');
        docxButton.setAttribute('mat-ripple-loader-class-name', 'mat-mdc-button-ripple');
        docxButton.setAttribute('mat-ripple-loader-centered', ''); // 添加居中属性

        // Create button inner structure exactly matching Gemini's icon buttons
        docxButton.innerHTML = `
            <span class="mat-mdc-button-persistent-ripple mdc-icon-button__ripple"></span>
            <mat-icon _ngcontent-ng-c3341669442="" role="img" fonticon="description" class="mat-icon notranslate gds-icon-m google-symbols mat-ligature-font mat-icon-no-color ng-star-inserted" aria-hidden="true" data-mat-icon-type="font" data-mat-icon-name="description">
                <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style="width: 20px; height: 20px;">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                </svg>
            </mat-icon>
            <span class="mat-focus-indicator"></span>
            <span class="mat-mdc-button-touch-target"></span>
        `;

        // Add comment nodes like Angular does
        const commentStart = document.createComment('');
        const commentEnd = document.createComment('');

        buttonWrapper.appendChild(commentStart);
        buttonWrapper.appendChild(docxButton);
        buttonWrapper.appendChild(commentEnd);

        // Insert after the copy button's parent wrapper
        const copyButtonWrapper = copyBtn.closest('copy-button');
        if (copyButtonWrapper) {
            copyButtonWrapper.insertAdjacentElement('afterend', buttonWrapper);
        }

        // Add click handler
        docxButton.addEventListener('click', async (e) => {
            e.stopPropagation();
            e.preventDefault();

            const sourceButton = e.currentTarget;

            try {
                console.debug('DOCX button clicked for Gemini');

                // Disable button during processing
                sourceButton.setAttribute('disabled', 'true');
                sourceButton.style.opacity = '0.6';

                // Get message content directly from DOM
                let messageContent = getGeminiContent(sourceButton);

                if (messageContent && messageContent.trim()) {
                    console.debug('Successfully extracted content from Gemini DOM');

                    // Append URL if enabled
                    const data = await chrome.storage.sync.get(['includeGeminiChatLink']);
                    if (data.includeGeminiChatLink === true) {
                        messageContent += `\n\n*${chrome.i18n?.getMessage('sourceConversationLabel')}: ${window.location.href}*\n*${chrome.i18n?.getMessage('exportedViaDeepShare')}*\n`;
                    }

                    const conversationData = {
                        role: 'assistant',
                        content: messageContent,
                    };

                    const event = new CustomEvent('deepshare:convertToDocx', {
                        detail: {
                            messages: conversationData,
                            sourceButton: sourceButton,
                        },
                    });
                    document.dispatchEvent(event);
                } else {
                    console.warn('Extracted content was empty');
                    window.showToastNotification(chrome.i18n?.getMessage('getClipboardError') || 'Content extraction failed', 'error');
                }
            } catch (error) {
                console.error('Error getting content from Gemini:', error);
                window.showToastNotification(`${chrome.i18n?.getMessage('getClipboardError') || 'Error'}: ${error.message}`, 'error');
            } finally {
                // Re-enable button
                sourceButton.removeAttribute('disabled');
                sourceButton.style.opacity = '1';
            }
        });

        console.debug('DOCX button successfully injected for Gemini');
    }

    function isLuminousGeminiUi(container) {
        return !!container.querySelector('.lumi-symbols, .lm-enabled, .luminous-theme');
    }

    function injectLuminousButton(copyBtn, container) {
        const label = chrome.i18n?.getMessage('docxButton') || '保存为Word';
        const copyGemButton = copyBtn.closest('gem-icon-button');
        const buttonWrapper = document.createElement('deepshare-docx-button');
        buttonWrapper.className = copyBtn.closest('.luminous-theme')
            ? 'deepshare-gemini-docx-btn deepshare-gemini-docx-btn--lumi luminous-theme ng-star-inserted'
            : 'deepshare-gemini-docx-btn deepshare-gemini-docx-btn--lumi ng-star-inserted';

        copyElementAttributes(container, buttonWrapper, /^_ngcontent-/);

        const gemButton = document.createElement('gem-icon-button');
        gemButton.className = copyGemButton?.className || 'mat-mdc-tooltip-trigger gem-button gem-button-badge-size-small gem-button-size-small gem-button-type-on-surface lm-enabled ng-star-inserted';
        gemButton.classList.add('deepshare-gemini-docx-gem-button');
        gemButton.setAttribute('theme', copyGemButton?.getAttribute('theme') || 'lm');
        gemButton.setAttribute('type', copyGemButton?.getAttribute('type') || 'onSurface');
        gemButton.setAttribute('arialabel', label);
        gemButton.setAttribute('gemtooltip', label);
        gemButton.setAttribute('data-test-id', 'docx-button');
        copyElementAttributes(copyGemButton, gemButton, /^_nghost-/);

        const docxButton = copyBtn.cloneNode(false);
        docxButton.className = copyBtn.className || 'mdc-icon-button mat-mdc-icon-button mat-mdc-button-base mat-badge mat-unthemed mat-badge-overlap mat-badge-above mat-badge-after mat-badge-small mat-badge-hidden ng-star-inserted';
        docxButton.classList.add('deepshare-gemini-lumi-icon-button');
        docxButton.setAttribute('maticonbutton', '');
        docxButton.setAttribute('matbadgeposition', 'after');
        docxButton.setAttribute('tabindex', '0');
        docxButton.setAttribute('aria-label', label);
        docxButton.setAttribute('data-test-id', 'docx-button');
        docxButton.setAttribute('mat-ripple-loader-class-name', 'mat-mdc-button-ripple');
        docxButton.setAttribute('mat-ripple-loader-centered', '');
        docxButton.removeAttribute('jslog');
        docxButton.removeAttribute('aria-pressed');

        const gemIcon = buildLuminousIconFrom(copyBtn, 'docs');

        docxButton.innerHTML = `
            <span class="mat-mdc-button-persistent-ripple mdc-icon-button__ripple"></span>
            ${gemIcon.outerHTML}
            <span class="mat-focus-indicator"></span>
            <span class="mat-mdc-button-touch-target"></span>
            <span class="mat-ripple mat-mdc-button-ripple"></span>
        `;

        gemButton.appendChild(document.createComment(''));
        gemButton.appendChild(docxButton);
        gemButton.appendChild(document.createComment(''));
        buttonWrapper.appendChild(document.createComment(''));
        buttonWrapper.appendChild(gemButton);
        buttonWrapper.appendChild(document.createComment(''));

        const copyButtonWrapper = copyBtn.closest('copy-button');
        if (copyButtonWrapper) {
            copyButtonWrapper.insertAdjacentElement('afterend', buttonWrapper);
        } else {
            copyBtn.insertAdjacentElement('afterend', buttonWrapper);
        }

        docxButton.addEventListener('click', handleDocxButtonClick);
        attachGeminiTooltip(docxButton, label);
        console.debug('DOCX button successfully injected for Gemini luminous UI');
    }

    function buildLuminousIconFrom(sourceButton, fontIcon) {
        const sourceGemIcon = sourceButton.querySelector('gem-icon');
        const gemIcon = sourceGemIcon ? sourceGemIcon.cloneNode(true) : document.createElement('gem-icon');
        let matIcon = gemIcon.querySelector('mat-icon');

        if (!matIcon) {
            matIcon = document.createElement('mat-icon');
            gemIcon.appendChild(matIcon);
        }

        matIcon.setAttribute('role', 'img');
        matIcon.setAttribute('fonticon', fontIcon);
        matIcon.setAttribute('aria-hidden', 'true');
        matIcon.setAttribute('data-mat-icon-type', 'font');
        matIcon.setAttribute('data-mat-icon-name', fontIcon);
        matIcon.setAttribute('data-mat-icon-namespace', 'lumi-symbols');
        const sizeClass = getLumiIconSizeClass(sourceButton) || 'lm-icon-l';
        matIcon.className = `mat-icon notranslate ${sizeClass} lumi-symbols mat-ligature-font mat-icon-no-color ng-star-inserted`;
        matIcon.textContent = '';

        return gemIcon;
    }

    function getLumiIconSizeClass(sourceButton) {
        const sourceIcon = sourceButton?.querySelector?.('mat-icon.lumi-symbols');
        return Array.from(sourceIcon?.classList || []).find(className => /^lm-icon-/.test(className));
    }

    function copyElementAttributes(source, target, pattern) {
        if (!source) return;
        Array.from(source.attributes || []).forEach(attr => {
            if (pattern.test(attr.name)) target.setAttribute(attr.name, attr.value);
        });
    }

    let tooltipIdSeed = 0;
    let activeTooltip = null;
    let tooltipShowTimer = null;
    let tooltipHideTimer = null;

    function attachGeminiTooltip(anchor, text) {
        const show = () => {
            clearTimeout(tooltipHideTimer);
            clearTimeout(tooltipShowTimer);
            showGeminiTooltip(anchor, text);
        };
        const hide = () => {
            clearTimeout(tooltipShowTimer);
            hideGeminiTooltip();
        };

        anchor.addEventListener('mouseenter', show);
        anchor.addEventListener('focus', show);
        anchor.addEventListener('mouseleave', hide);
        anchor.addEventListener('blur', hide);
        anchor.addEventListener('click', () => hideGeminiTooltip(true), true);
        anchor.addEventListener('mousedown', hide);
    }

    function showGeminiTooltip(anchor, text) {
        hideGeminiTooltip(true);

        const id = `deepshare-gemini-tooltip-${++tooltipIdSeed}`;
        const panel = document.createElement('div');
        panel.id = id;
        panel.className = 'mat-mdc-tooltip-panel mat-mdc-tooltip-panel-below mat-mdc-tooltip-panel-non-interactive deepshare-gemini-tooltip-panel deepshare-gemini-tooltip-panel--below';
        panel.setAttribute('role', 'tooltip');

        const tooltip = document.createElement('div');
        tooltip.className = 'mat-mdc-tooltip mat-mdc-tooltip-show';
        tooltip.innerHTML = `
            <div class="mat-mdc-tooltip-surface">${escapeHtml(text)}</div>
            <div class="deepshare-gemini-tooltip-arrow" aria-hidden="true"></div>
        `;
        panel.appendChild(tooltip);
        document.body.appendChild(panel);

        const anchorRect = anchor.getBoundingClientRect();
        const panelRect = panel.getBoundingClientRect();
        const gap = 6;
        const top = Math.min(
            window.innerHeight - panelRect.height - 8,
            Math.max(8, anchorRect.bottom + gap)
        );
        const left = Math.min(
            window.innerWidth - panelRect.width - 8,
            Math.max(8, anchorRect.left + anchorRect.width / 2 - panelRect.width / 2)
        );

        panel.style.top = `${top + window.scrollY}px`;
        panel.style.left = `${left + window.scrollX}px`;
        anchor.setAttribute('aria-describedby', id);
        activeTooltip = { panel, anchor };
    }

    function hideGeminiTooltip(immediate = false) {
        clearTimeout(tooltipShowTimer);
        clearTimeout(tooltipHideTimer);
        if (!activeTooltip) {
            if (immediate) removeGeminiTooltipPanels();
            return;
        }

        const { panel, anchor } = activeTooltip;
        activeTooltip = null;
        anchor?.removeAttribute('aria-describedby');

        const tooltip = panel.querySelector('.mat-mdc-tooltip');
        if (immediate || !tooltip) {
            panel.remove();
            if (immediate) removeGeminiTooltipPanels();
            return;
        }

        tooltip.classList.remove('mat-mdc-tooltip-show');
        tooltip.classList.add('mat-mdc-tooltip-hide');
        tooltipHideTimer = setTimeout(() => panel.remove(), 90);
    }

    function removeGeminiTooltipPanels() {
        document.querySelectorAll('.deepshare-gemini-tooltip-panel').forEach(panel => panel.remove());
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function injectNewUiButton(copyBtn, container) {
        console.debug('Injecting DOCX button for Gemini new UI');

        const buttonWrapper = document.createElement('span');
        buttonWrapper.className = 'deepshare-gemini-docx-btn deepshare-gemini-docx-btn--new-ui';

        const docxButton = document.createElement('button');
        const nativeClass = copyBtn.getAttribute('class');
        if (nativeClass) docxButton.className = nativeClass;
        docxButton.classList.add('deepshare-gemini-new-ui-icon-btn');
        docxButton.setAttribute('type', 'button');
        docxButton.setAttribute('tabindex', copyBtn.getAttribute('tabindex') || '0');
        docxButton.setAttribute('aria-label', chrome.i18n?.getMessage('docxButton') || 'Save as Word');
        docxButton.setAttribute('title', chrome.i18n?.getMessage('docxButton') || 'Save as Word');
        docxButton.setAttribute('data-test-id', 'docx-button');
        docxButton.innerHTML = createLumiMatIconHtml('docs');

        buttonWrapper.appendChild(docxButton);
        copyBtn.insertAdjacentElement('afterend', buttonWrapper);

        docxButton.addEventListener('click', handleDocxButtonClick);
        console.debug('DOCX button successfully injected for Gemini new UI');
    }

    function createLumiMatIconHtml(fontIcon) {
        return `<mat-icon role="img" fonticon="${fontIcon}" class="mat-icon notranslate lumi-symbols mat-ligature-font mat-icon-no-color ng-star-inserted lm-icon-l" aria-hidden="true" data-mat-icon-type="font" data-mat-icon-name="${fontIcon}" data-mat-icon-namespace="lumi-symbols"></mat-icon>`;
    }

    function createAdaptiveMatIconHtml(anchor, fontIcon) {
        const existingIcon = anchor.querySelector?.('mat-icon');
        if (existingIcon?.classList.contains('lumi-symbols')) {
            const sizeClass = Array.from(existingIcon.classList).find(className => /^lm-icon-/.test(className)) || 'lm-icon-l';
            return `<mat-icon role="img" fonticon="${fontIcon}" class="mat-icon notranslate lumi-symbols mat-ligature-font mat-icon-no-color ng-star-inserted ${sizeClass}" aria-hidden="true" data-mat-icon-type="font" data-mat-icon-name="${fontIcon}" data-mat-icon-namespace="lumi-symbols"></mat-icon>`;
        }

        const iconClass = existingIcon?.classList.contains('gds-icon-l') ? 'gds-icon-l' : 'menu-icon';
        return `<mat-icon role="img" fonticon="${fontIcon}" class="mat-icon notranslate ${iconClass} google-symbols mat-ligature-font mat-icon-no-color" aria-hidden="true" data-mat-icon-type="font" data-mat-icon-name="${fontIcon}"></mat-icon>`;
    }

    async function handleDocxButtonClick(e) {
        e.stopPropagation();
        e.preventDefault();

        const sourceButton = e.currentTarget;

        try {
            console.debug('DOCX button clicked for Gemini');
            sourceButton.setAttribute('disabled', 'true');
            sourceButton.style.opacity = '0.6';

            let messageContent = getGeminiContent(sourceButton);

            if (messageContent && messageContent.trim()) {
                console.debug('Successfully extracted content from Gemini DOM');

                const data = await chrome.storage.sync.get(['includeGeminiChatLink']);
                if (data.includeGeminiChatLink === true) {
                    messageContent += `\n\n*${chrome.i18n?.getMessage('sourceConversationLabel')}: ${window.location.href}*\n*${chrome.i18n?.getMessage('exportedViaDeepShare')}*\n`;
                }

                const conversationData = {
                    role: 'assistant',
                    content: messageContent,
                };

                const event = new CustomEvent('deepshare:convertToDocx', {
                    detail: {
                        messages: conversationData,
                        sourceButton: sourceButton,
                    },
                });
                document.dispatchEvent(event);
            } else {
                console.warn('Extracted content was empty');
                window.showToastNotification(chrome.i18n?.getMessage('getClipboardError') || 'Content extraction failed', 'error');
            }
        } catch (error) {
            console.error('Error getting content from Gemini:', error);
            window.showToastNotification(`${chrome.i18n?.getMessage('getClipboardError') || 'Error'}: ${error.message}`, 'error');
        } finally {
            sourceButton.removeAttribute('disabled');
            sourceButton.style.opacity = '1';
        }
    }

    function injectMdButtonToMenu() {
        // 查找弹出的菜单内容
        const menuContents = document.querySelectorAll('.mat-mdc-menu-panel .mat-mdc-menu-content, gem-menu[role="menu"], [role="menu"]');

        menuContents.forEach(menuContent => {
            // 检查是否已经注入过按钮
            if (menuContent.querySelector('.deepshare-menu-md-button')) {
                return;
            }

            if (menuContent.tagName === 'GEM-MENU') {
                injectMdButtonToGemMenu(menuContent);
                return;
            }

            // 查找 "导出到 Google 文档" 按钮或者 "导出为 Gmail" 按钮
            const menuItems = Array.from(menuContent.querySelectorAll('button, [role="menuitem"], [role="menuitemradio"], [role="option"], div, li'));
            const findMenuItemByText = (pattern) => menuItems.find(item => {
                const text = item.textContent || '';
                if (!pattern.test(text)) return false;
                return !Array.from(item.children || []).some(child => pattern.test(child.textContent || ''));
            });
            const exportToDocsButton = menuContent.querySelector('button[aria-label*="Google 文档"], button[aria-label*="Google Docs"]') ||
                findMenuItemByText(/Google 文档|Google Docs/);
            const exportToGmailButton = menuContent.querySelector('button[aria-label*="Gmail"]') ||
                findMenuItemByText(/Gmail/);

            const targetAnchor = exportToDocsButton || exportToGmailButton;
            if (!targetAnchor) {
                return;
            }

            console.debug('DeepShare: Injecting Markdown button into More menu');

            // 创建按钮元素
            const useNativeButton = targetAnchor.tagName === 'BUTTON';
            const mdButton = document.createElement(useNativeButton ? 'button' : 'div');
            mdButton.className = `${targetAnchor.getAttribute('class') || 'mat-mdc-menu-item mat-focus-indicator'} deepshare-menu-md-button deepshare-gemini-menu-item`;
            if (useNativeButton) mdButton.setAttribute('type', 'button');
            mdButton.setAttribute('role', 'menuitem');
            mdButton.setAttribute('tabindex', '0');
            mdButton.setAttribute('aria-disabled', 'false');
            mdButton.setAttribute('aria-label', chrome.i18n?.getMessage('saveAsMarkdown') || 'Save as Markdown');

            // 创建按钮内容
            mdButton.innerHTML = `
                ${createAdaptiveMatIconHtml(targetAnchor, 'article')}
                <span class="mat-mdc-menu-item-text"> ${chrome.i18n?.getMessage('saveAsMarkdown') || 'Save as Markdown'}</span>
                <div matripple="" class="mat-ripple mat-mdc-menu-ripple"></div>
            `;

            // 在菜单顶部插入
            targetAnchor.parentNode.insertBefore(mdButton, targetAnchor);

            // 点击事件
            mdButton.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (!activeMessageContainer) {
                    console.error('DeepShare: No active message container found');
                    return;
                }

                // Precisely select the main response content (not thoughts)
                // Main response is inside: structured-content-container.model-response-text > message-content
                let markdown = getGeminiContentFromContainer(activeMessageContainer);
                if (markdown) {

                    // Append URL if enabled
                    const data = await chrome.storage.sync.get(['includeGeminiChatLink']);
                    if (data.includeGeminiChatLink === true) {
                        markdown += `\n\n*${chrome.i18n?.getMessage('sourceConversationLabel')}: ${window.location.href}*\n*${chrome.i18n?.getMessage('exportedViaDeepShare')}*\n`;
                    }

                    downloadMarkdownFile(markdown);
                }

                // 关闭菜单
                const backdrop = document.querySelector('.cdk-overlay-backdrop');
                if (backdrop) backdrop.click();
            });
        });
    }

    function injectMdButtonToGemMenu(menuContent) {
        const targetAnchor = menuContent.querySelector('gem-menu-item[data-test-id="export-to-docs-button"]') ||
            menuContent.querySelector('gem-menu-item[role="menuitem"]');
        if (!targetAnchor || !activeMessageContainer) return;

        const mdButton = createGeminiMenuItemFrom(
            targetAnchor,
            'article',
            chrome.i18n?.getMessage('saveAsMarkdown') || 'Save as Markdown',
            'deepshare-menu-md-button',
            'markdown',
            'markdown-export-button'
        );

        targetAnchor.insertAdjacentElement('beforebegin', mdButton);
        mdButton.addEventListener('click', handleMarkdownMenuClick);
    }

    function createGeminiMenuItemFrom(targetAnchor, fontIcon, label, className, value, testId) {
        const item = targetAnchor.cloneNode(true);
        item.classList.add(className, 'deepshare-gemini-menu-item');
        item.setAttribute('role', 'menuitem');
        item.setAttribute('value', value);
        item.setAttribute('leadingicon', fontIcon);
        item.setAttribute('data-test-id', testId);
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
            item.querySelector('.label') ||
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

    async function handleMarkdownMenuClick(e) {
        e.stopPropagation();
        if (!activeMessageContainer) {
            console.error('DeepShare: No active message container found');
            return;
        }

        let markdown = getGeminiContentFromContainer(activeMessageContainer);
        if (markdown) {
            const data = await chrome.storage.sync.get(['includeGeminiChatLink']);
            if (data.includeGeminiChatLink === true) {
                markdown += `\n\n*${chrome.i18n?.getMessage('sourceConversationLabel')}: ${window.location.href}*\n*${chrome.i18n?.getMessage('exportedViaDeepShare')}*\n`;
            }

            downloadMarkdownFile(markdown);
        }

        closeOpenGeminiMenu();
    }

    function closeOpenGeminiMenu() {
        const backdrop = document.querySelector('.cdk-overlay-backdrop');
        if (backdrop) backdrop.click();
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
    }

    function downloadMarkdownFile(content) {
        const filename = generateFilename(content) + '.md';
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

    function generateFilename(content) {
        const now = new Date();
        const timestamp = now.toLocaleString('zh-CN', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false
        }).replace(/[\/\s:]/g, '-').replace(',', '');

        if (!content) return `gemini_${timestamp}`;
        const firstLine = content.split('\n')[0].replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '').substring(0, 15).trim();
        return `${firstLine || 'gemini'}_${timestamp}`;
    }

    function getGeminiContent(button) {
        // Traverse up to find the message container
        // Structure: model-response > ... > message-content
        const messageContainer = button.closest('model-response') ||
            button.closest('user-query') ||
            findClosestMessageContainer(button, 'assistant'); // Fallback for newer structure

        if (!messageContainer) {
            console.error('DeepShare: Could not find message container');
            return null;
        }

        // Precisely select the main response content (not thoughts)
        // Main response is inside: structured-content-container.model-response-text > message-content
        return getGeminiContentFromContainer(messageContainer);
    }

    function getGeminiContentFromContainer(messageContainer) {
        const contentElement = messageContainer.querySelector('.model-response-text message-content') ||
            messageContainer.querySelector('structured-content-container.model-response-text message-content') ||
            messageContainer.querySelector('message-content'); // Fallback for older structure

        if (contentElement) {
            return window.extractGeminiContentWithFormulas(contentElement);
        }

        const clone = messageContainer.cloneNode(true);
        clone.querySelectorAll('button, svg, menu, [role="menu"], [role="heading"], h1, h2, h3, h4, h5, h6, textarea, input, .deepshare-gemini-docx-btn, [aria-hidden="true"]').forEach(el => el.remove());
        const content = window.extractGeminiContentWithFormulas(clone).trim();

        if (!content) {
            console.error('DeepShare: Could not find content element');
            return null;
        }

        return content;
    }
})();
