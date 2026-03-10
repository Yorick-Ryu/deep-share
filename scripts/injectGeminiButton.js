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
            const moreButton = container.querySelector('button[data-test-id="more-menu-button"]');
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
        // docxButton.setAttribute('mattooltip', chrome.i18n?.getMessage('docxButton') || '保存为Word');
        // docxButton.setAttribute('aria-label', chrome.i18n?.getMessage('docxButton') || '保存为Word');
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

    function injectMdButtonToMenu() {
        // 查找弹出的菜单内容
        const menuContents = document.querySelectorAll('.mat-mdc-menu-panel .mat-mdc-menu-content');

        menuContents.forEach(menuContent => {
            // 检查是否已经注入过按钮
            if (menuContent.querySelector('.deepshare-menu-md-button')) {
                return;
            }

            // 查找 "导出到 Google 文档" 按钮或者 "导出为 Gmail" 按钮
            const exportToDocsButton = menuContent.querySelector('button[aria-label*="Google 文档"], button[aria-label*="Google Docs"]');
            const exportToGmailButton = menuContent.querySelector('button[aria-label*="Gmail"]');

            const targetAnchor = exportToDocsButton || exportToGmailButton;
            if (!targetAnchor) {
                return;
            }

            console.debug('DeepShare: Injecting Markdown button into More menu');

            // 创建按钮元素
            const mdButton = document.createElement('button');
            mdButton.className = 'mat-mdc-menu-item mat-focus-indicator deepshare-menu-md-button';
            mdButton.setAttribute('role', 'menuitem');
            mdButton.setAttribute('tabindex', '0');
            mdButton.setAttribute('aria-disabled', 'false');

            // 创建按钮内容
            mdButton.innerHTML = `
                <mat-icon role="img" fonticon="file_download" class="mat-icon notranslate google-symbols mat-ligature-font mat-icon-no-color" aria-hidden="true" data-mat-icon-type="font" data-mat-icon-name="file_download">
                    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style="width: 20px; height: 20px;">
                        <path d="M20.56 18H3.44C2.65 18 2 17.37 2 16.59V7.41C2 6.63 2.65 6 3.44 6H20.56C21.35 6 22 6.63 22 7.41V16.59C22 17.37 21.35 18 20.56 18M6.81 15.19V11.53L8.73 13.88L10.65 11.53V15.19H12.58V8.81H10.65L8.73 11.16L6.81 8.81H4.89V15.19H6.81M19.69 12H17.77V8.81H15.85V12H13.92L16.81 15.28L19.69 12Z"/>
                    </svg>
                </mat-icon>
                <span class="mat-mdc-menu-item-text"> ${chrome.i18n?.getMessage('saveAsMarkdown') || 'Save as Markdown'}</span>
                <div matripple="" class="mat-ripple mat-mdc-menu-ripple"></div>
            `;

            // 在菜单顶部插入
            targetAnchor.parentNode.prepend(mdButton);

            // 点击事件
            mdButton.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (!activeMessageContainer) {
                    console.error('DeepShare: No active message container found');
                    return;
                }

                // Precisely select the main response content (not thoughts)
                // Main response is inside: structured-content-container.model-response-text > message-content
                const contentElement = activeMessageContainer.querySelector('.model-response-text message-content') ||
                    activeMessageContainer.querySelector('structured-content-container.model-response-text message-content') ||
                    activeMessageContainer.querySelector('message-content'); // Fallback for older structure
                if (contentElement) {
                    let markdown = window.extractGeminiContentWithFormulas(contentElement);

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
            button.closest('user-query'); // Fallback though likely always model-response

        if (!messageContainer) {
            console.error('DeepShare: Could not find message container');
            return null;
        }

        // Precisely select the main response content (not thoughts)
        // Main response is inside: structured-content-container.model-response-text > message-content
        const contentElement = messageContainer.querySelector('.model-response-text message-content') ||
            messageContainer.querySelector('structured-content-container.model-response-text message-content') ||
            messageContainer.querySelector('message-content'); // Fallback for older structure

        if (!contentElement) {
            console.error('DeepShare: Could not find content element');
            return null;
        }

        return window.extractGeminiContentWithFormulas(contentElement);
    }
})();
