/**
 * DeepSeek Markdown Copy functionality
 * Adds a button to copy AI responses as Markdown format
 */

(function() {
    'use strict';
    console.debug('DeepShare: Initializing DeepSeek Markdown copy functionality');

    // Load settings
    let copyMarkdownSettings = {
        enabled: true,
        includeUserQuestion: true,
        includeAiResponse: true
    };

    function loadSettings() {
        chrome.storage.sync.get({
            copyDeepSeekMarkdownEnabled: true,
            includeUserQuestion: true,
            includeAiResponse: true
        }, (settings) => {
            copyMarkdownSettings = {
                enabled: settings.copyDeepSeekMarkdownEnabled,
                includeUserQuestion: settings.includeUserQuestion,
                includeAiResponse: settings.includeAiResponse
            };
        });
    }

    // Function to extract AI response as markdown
    function extractAiResponseAsMarkdown(messageDiv) {
        // Find the markdown content
        const markdownDiv = messageDiv.querySelector('.ds-markdown');
        if (!markdownDiv) return null;

        // Use the same extraction logic as in injectDocxButton.js
        return extractMarkdownFromElement(markdownDiv);
    }

    // Extract user question as markdown
    function extractUserQuestionAsMarkdown(messageDiv) {
        const userElement = messageDiv.querySelector('.fbb737a4');
        if (!userElement) return null;

        // Get text content from user message
        const userText = Array.from(userElement.childNodes || [])
            .find(node => node.nodeType === Node.TEXT_NODE)?.textContent?.trim();
        
        return userText || null;
    }

    // Extract markdown from element with formula handling
    function extractMarkdownFromElement(element) {
        let result = '';

        const processNode = (node) => {
            // Skip checkboxes and selection UI
            if (node.nodeType === Node.ELEMENT_NODE) {
                if (node.classList && (
                    node.classList.contains('message-checkbox-wrapper') ||
                    node.classList.contains('ds-checkbox-wrapper')
                )) {
                    return;
                }
            }

            // Handle math formulas (KaTeX)
            if (node.classList && node.classList.contains('katex')) {
                const annotation = node.querySelector('annotation[encoding="application/x-tex"]');
                if (annotation) {
                    const isDisplay = node.closest('.katex-display');
                    const latex = annotation.textContent.trim();
                    if (isDisplay) {
                        result += '\n$$\n' + latex + '\n$$\n';
                    } else {
                        result += '$' + latex + '$';
                    }
                    return;
                }
            }

            // Handle code blocks
            if (node.tagName === 'PRE') {
                const code = node.querySelector('code');
                if (code) {
                    const language = code.className.match(/language-(\w+)/)?.[1] || '';
                    result += '\n```' + language + '\n' + code.textContent + '\n```\n';
                }
                return;
            }

            // Handle inline code
            if (node.tagName === 'CODE' && !node.closest('pre')) {
                result += '`' + node.textContent + '`';
                return;
            }

            // Handle headings
            if (node.tagName && /^H[1-6]$/.test(node.tagName)) {
                const level = node.tagName[1];
                const headingMark = '#'.repeat(parseInt(level));
                result += '\n' + headingMark + ' ' + node.textContent.trim() + '\n';
                return;
            }

            // Handle bold
            if (node.tagName === 'STRONG' || node.tagName === 'B') {
                result += '**' + node.textContent + '**';
                return;
            }

            // Handle italic
            if (node.tagName === 'EM' || node.tagName === 'I') {
                result += '*' + node.textContent + '*';
                return;
            }

            // Handle links
            if (node.tagName === 'A') {
                const href = node.getAttribute('href');
                const text = node.textContent;
                if (href && href !== text) {
                    result += '[' + text + '](' + href + ')';
                } else {
                    result += text;
                }
                return;
            }

            // Handle lists
            if (node.tagName === 'UL' || node.tagName === 'OL') {
                const items = node.querySelectorAll(':scope > li');
                const isOrdered = node.tagName === 'OL';
                items.forEach((item, idx) => {
                    const prefix = isOrdered ? `${idx + 1}. ` : '- ';
                    result += prefix + item.textContent.trim() + '\n';
                });
                return;
            }

            // Handle paragraphs
            if (node.tagName === 'P') {
                result += node.textContent.trim() + '\n\n';
                return;
            }

            // Handle line breaks
            if (node.tagName === 'BR') {
                result += '\n';
                return;
            }

            // Handle text nodes
            if (node.nodeType === Node.TEXT_NODE) {
                result += node.textContent;
                return;
            }

            // Recursively process children
            if (node.childNodes && node.childNodes.length > 0) {
                node.childNodes.forEach(processNode);
            }
        };

        processNode(element);

        // Clean up excessive newlines
        result = result.replace(/\n{3,}/g, '\n\n').trim();

        return result;
    }

    // Copy markdown to clipboard
    async function copyMarkdownToClipboard(content) {
        await navigator.clipboard.writeText(content);
        window.showToastNotification(chrome.i18n?.getMessage('markdownCopied') || 'Markdown copied to clipboard', 'success');
    }

    // Main copy function
    async function copyAsMarkdown(copyButton) {
        if (!copyMarkdownSettings.enabled) {
            window.showToastNotification(chrome.i18n?.getMessage('featureDisabled') || 'Markdown copy feature is disabled', 'info');
            return;
        }

        // Find the message container
        let messageDiv = copyButton.closest('._4f9bf79, ._9663006');
        if (!messageDiv) {
            console.error('Could not find message container');
            window.showToastNotification(chrome.i18n?.getMessage('copyFailed') || 'Failed to copy', 'error');
            return;
        }

        const isAiMessage = messageDiv.matches('._4f9bf79');
        let markdownContent = '';

        if (isAiMessage) {
            // For AI responses, only copy AI content (user question can be optionally included via selection)
            const aiContent = extractAiResponseAsMarkdown(messageDiv);
            if (aiContent) {
                markdownContent = `## AI Response\n\n${aiContent}`;
            } else {
                markdownContent = await getContentViaCopyButton(copyButton);
                if (markdownContent) {
                    markdownContent = `## AI Response\n\n${markdownContent}`;
                }
            }
        } else {
            // For user messages, copy as is
            const userContent = extractUserQuestionAsMarkdown(messageDiv);
            if (userContent) {
                markdownContent = `## User Question\n\n${userContent}`;
            }
        }

        if (markdownContent && markdownContent.trim()) {
            await copyMarkdownToClipboard(markdownContent);
        } else {
            window.showToastNotification(chrome.i18n?.getMessage('noContent') || 'No content to copy', 'error');
        }
    }

    // Fallback: use copy button to get content
    async function getContentViaCopyButton(copyButton) {
        let originalClipboardContent = null;
        try {
            // Backup original clipboard
            try {
                originalClipboardContent = await navigator.clipboard.readText();
            } catch (e) {
                // Ignore - clipboard might be empty or permission not granted
            }

            // Click copy button
            copyButton.click();
            await new Promise(resolve => setTimeout(resolve, 300));

            // Get content
            const content = await navigator.clipboard.readText();

            // Restore original
            if (originalClipboardContent !== null) {
                try {
                    await navigator.clipboard.writeText(originalClipboardContent);
                } catch (e) {}
            }

            return content;
        } catch (error) {
            console.error('Failed to get content via copy button:', error);
            return null;
        }
    }

    // Copy entire conversation as markdown
    async function copyConversationAsMarkdown() {
        if (!copyMarkdownSettings.enabled) {
            window.showToastNotification(chrome.i18n?.getMessage('featureDisabled') || 'Markdown copy feature is disabled', 'info');
            return;
        }

        // Find all messages
        const messageSelector = '._9663006, ._4f9bf79._43c05b5, ._4f9bf79.d7dc56a8._43c05b5';
        const messages = document.querySelectorAll(messageSelector);
        
        if (messages.length === 0) {
            window.showToastNotification(chrome.i18n?.getMessage('noMessages') || 'No messages found', 'error');
            return;
        }

        let conversationContent = '';
        let messageIndex = 1;

        for (const messageDiv of messages) {
            const isUserMessage = messageDiv.matches('._9663006') || messageDiv.querySelector('.d29f3d7d');
            
            if (isUserMessage && copyMarkdownSettings.includeUserQuestion) {
                const userContent = extractUserQuestionAsMarkdown(messageDiv);
                if (userContent) {
                    conversationContent += `## Message ${messageIndex}: User Question\n\n${userContent}\n\n---\n\n`;
                    messageIndex++;
                }
            } else if (!isUserMessage && copyMarkdownSettings.includeAiResponse) {
                const copyButton = messageDiv.querySelector('.ds-icon-button[role="button"]');
                let aiContent = extractAiResponseAsMarkdown(messageDiv);
                
                if (!aiContent && copyButton) {
                    aiContent = await getContentViaCopyButton(copyButton);
                }
                
                if (aiContent) {
                    conversationContent += `## Message ${messageIndex}: AI Response\n\n${aiContent}\n\n---\n\n`;
                    messageIndex++;
                }
            }
        }

        if (conversationContent.trim()) {
            // Add title
            const title = document.querySelector('.afa34042')?.textContent?.trim() || 'DeepSeek Conversation';
            const timestamp = new Date().toLocaleString();
            const fullMarkdown = `# ${title}\n\n*Exported on ${timestamp} via DeepShare*\n\n---\n\n${conversationContent}`;
            
            await copyMarkdownToClipboard(fullMarkdown);
        } else {
            window.showToastNotification(chrome.i18n?.getMessage('noContent') || 'No content to copy', 'error');
        }
    }

    // Inject markdown copy button next to existing copy button
    function injectMarkdownButton(copyButton, container) {
        if (container.querySelector('.deepseek-markdown-copy-btn')) return;

        const mdButton = document.createElement('div');
        mdButton.className = copyButton.className + ' deepseek-markdown-copy-btn';
        mdButton.tabIndex = copyButton.tabIndex || -1;
        mdButton.setAttribute('role', 'button');
        mdButton.setAttribute('aria-label', chrome.i18n?.getMessage('copyAsMarkdown') || 'Copy as Markdown');
        mdButton.title = chrome.i18n?.getMessage('copyAsMarkdown') || 'Copy as Markdown';

        // Copy styling
        const copyStyle = copyButton.getAttribute('style') || '';
        mdButton.style.cssText = copyStyle;

        // Create icon
        const iconHTML = `
            <div class="ds-icon-button__hover-bg"></div>
            <div class="ds-icon" style="font-size: 16px; width: 16px; height: 16px;">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 16px; height: 16px;">
                    <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
                    <path d="M12 11L12 17" stroke="currentColor" stroke-width="1.5"/>
                    <path d="M9 14L12 17L15 14" stroke="currentColor" stroke-width="1.5" fill="none"/>
                    <path d="M9 8L15 8" stroke="currentColor" stroke-width="1.5"/>
                    <path d="M9 11H15" stroke="currentColor" stroke-width="1.5"/>
                </svg>
            </div>
        `;
        mdButton.innerHTML = iconHTML;

        // Insert after copy button
        copyButton.parentNode.insertBefore(mdButton, copyButton.nextSibling);

        // Add tooltip
        let tooltipWrapper = null;
        let floatingContainer = null;

        mdButton.addEventListener('mouseenter', () => {
            const tooltipText = mdButton.title;
            if (!tooltipText) return;

            if (!floatingContainer) {
                floatingContainer = document.querySelector('.ds-floating-container');
                if (!floatingContainer) {
                    floatingContainer = document.createElement('div');
                    floatingContainer.className = 'ds-floating-container';
                    floatingContainer.style.zIndex = '9999';
                    document.body.appendChild(floatingContainer);
                }
            }

            tooltipWrapper = document.createElement('div');
            tooltipWrapper.className = 'ds-floating-position-wrapper ds-theme';
            tooltipWrapper.style.zIndex = '10000';

            const tooltipElement = document.createElement('div');
            tooltipElement.className = 'ds-tooltip ds-tooltip--s ds-elevated ds-theme';
            tooltipElement.textContent = tooltipText;

            tooltipWrapper.appendChild(tooltipElement);
            floatingContainer.appendChild(tooltipWrapper);

            const btnRect = mdButton.getBoundingClientRect();
            tooltipWrapper.style.opacity = '0';
            const tooltipRect = tooltipWrapper.getBoundingClientRect();
            tooltipWrapper.style.opacity = '1';

            let top = btnRect.bottom + 4;
            let left = btnRect.left + (btnRect.width / 2) - (tooltipRect.width / 2);
            tooltipWrapper.setAttribute('data-transform-origin', 'bottom');

            if (left < 5) left = 5;
            if ((left + tooltipRect.width) > (window.innerWidth - 5)) {
                left = window.innerWidth - tooltipRect.width - 5;
            }

            tooltipWrapper.style.top = `${top}px`;
            tooltipWrapper.style.left = `${left}px`;
        });

        mdButton.addEventListener('mouseleave', () => {
            if (tooltipWrapper) {
                tooltipWrapper.remove();
                tooltipWrapper = null;
            }
        });

        // Click handler
        mdButton.addEventListener('click', async (e) => {
            e.stopPropagation();
            
            // Disable button during copy
            mdButton.style.opacity = '0.5';
            mdButton.style.pointerEvents = 'none';
            
            await copyAsMarkdown(copyButton);
            
            // Re-enable
            mdButton.style.opacity = '';
            mdButton.style.pointerEvents = '';
        });
    }

    // Inject conversation markdown copy button in the share panel
    function injectConversationMarkdownButton() {
        const shareContainer = document.querySelector('._43d222b');
        if (!shareContainer) return;

        const buttonContainer = shareContainer.querySelector('.fab07e97');
        if (!buttonContainer) return;

        // Check if already injected
        if (document.getElementById('copy-conversation-md-btn')) return;

        const createLinkButton = buttonContainer.querySelector('.ds-basic-button--primary');
        if (!createLinkButton) return;

        const mdCopyButton = createLinkButton.cloneNode(true);
        mdCopyButton.id = 'copy-conversation-md-btn';
        const span = mdCopyButton.querySelector('span');
        span.textContent = chrome.i18n?.getMessage('copyConversationMarkdown') || 'Copy Markdown';

        // Remove icon if exists
        const iconContainer = mdCopyButton.querySelector('.ds-icon');
        if (iconContainer) {
            iconContainer.remove();
        }

        mdCopyButton.addEventListener('click', async () => {
            await copyConversationAsMarkdown();
        });

        buttonContainer.insertBefore(mdCopyButton, createLinkButton);
    }

    // Observe and inject buttons
    function observeAndInject() {
        loadSettings();

        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    // Inject per-message markdown buttons
                    const buttonContainers = document.querySelectorAll('.ds-flex[style*="align-items"][style*="gap"], div[class*="ds-flex"][style*="align-items: center"]');
                    
                    buttonContainers.forEach(container => {
                        const buttonGroup = container.querySelector('.ds-flex[style*="align-items"][style*="gap"], div[class*="ds-flex"][style*="align-items"]') || container;
                        
                        const copyButtons = buttonGroup.querySelectorAll('.ds-icon-button[role="button"]');
                        
                        copyButtons.forEach(copyBtn => {
                            // Check if this is an AI response (not user message)
                            const isUserMessage = copyBtn.closest('.d29f3d7d, [class*="d29f3d7d"]');
                            const isAIContainer = copyBtn.closest('._4f9bf79, [class*="_4f9bf79"]');
                            const isAIResponse = isAIContainer && !isUserMessage;
                            
                            if (isAIResponse && !copyBtn.parentNode?.querySelector('.deepseek-markdown-copy-btn')) {
                                injectMarkdownButton(copyBtn, buttonGroup);
                            }
                        });
                    });

                    // Inject conversation-level markdown button
                    injectConversationMarkdownButton();
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Listen for settings changes
        chrome.storage.onChanged.addListener((changes) => {
            if (changes.copyDeepSeekMarkdownEnabled) {
                copyMarkdownSettings.enabled = changes.copyDeepSeekMarkdownEnabled.newValue;
            }
            if (changes.includeUserQuestion) {
                copyMarkdownSettings.includeUserQuestion = changes.includeUserQuestion.newValue;
            }
            if (changes.includeAiResponse) {
                copyMarkdownSettings.includeAiResponse = changes.includeAiResponse.newValue;
            }
        });
    }

    // Initialize
    observeAndInject();
})();