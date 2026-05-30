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

        // Returns inline markdown string for a node and its children
        function extractInline(node) {
            if (node.nodeType === Node.TEXT_NODE) return node.textContent;

            if (node.nodeType !== Node.ELEMENT_NODE) return '';

            // Skip UI chrome
            if (node.classList && (
                node.classList.contains('message-checkbox-wrapper') ||
                node.classList.contains('ds-checkbox-wrapper')
            )) return '';

            // KaTeX inline
            if (node.classList && node.classList.contains('katex')) {
                if (node.closest('.katex-display')) return ''; // handled at block level
                const ann = node.querySelector('annotation[encoding="application/x-tex"]');
                return ann ? '$' + ann.textContent.trim() + '$' : node.textContent;
            }
            // Skip the MathML sibling inside katex-display (avoid double output)
            if (node.classList && node.classList.contains('katex-mathml')) return '';

            const tag = node.tagName;

            if (tag === 'STRONG' || tag === 'B') return '**' + extractChildren(node) + '**';
            if (tag === 'EM'     || tag === 'I') return '*'  + extractChildren(node) + '*';
            if (tag === 'S' || tag === 'DEL')   return '~~' + extractChildren(node) + '~~';
            if (tag === 'CODE' && !node.closest('pre')) return '`' + node.textContent + '`';
            if (tag === 'A') {
                const href = node.getAttribute('href');
                const text = extractChildren(node);
                return (href && href !== text) ? '[' + text + '](' + href + ')' : text;
            }
            if (tag === 'BR') return '\n';

            return extractChildren(node);
        }

        function extractChildren(node) {
            return Array.from(node.childNodes).map(extractInline).join('');
        }

        // Returns block-level markdown string (with surrounding newlines)
        function extractBlock(node, depth) {
            if (depth === undefined) depth = 0;

            if (node.nodeType === Node.TEXT_NODE) {
                const t = node.textContent;
                return t.trim() ? t : '';
            }

            if (node.nodeType !== Node.ELEMENT_NODE) return '';

            // Skip UI chrome
            if (node.classList && (
                node.classList.contains('message-checkbox-wrapper') ||
                node.classList.contains('ds-checkbox-wrapper')
            )) return '';

            const tag = node.tagName;

            // KaTeX display block
            if (node.classList && node.classList.contains('katex-display')) {
                const ann = node.querySelector('annotation[encoding="application/x-tex"]');
                if (ann) return '\n$$\n' + ann.textContent.trim() + '\n$$\n';
                return '';
            }
            if (node.classList && (node.classList.contains('katex') || node.classList.contains('katex-mathml'))) {
                return extractInline(node);
            }

            // Headings
            if (/^H[1-6]$/.test(tag)) {
                const level = '#'.repeat(parseInt(tag[1]));
                return '\n' + level + ' ' + extractChildren(node).trim() + '\n';
            }

            // Code block
            if (tag === 'PRE') {
                const code = node.querySelector('code');
                if (code) {
                    const lang = code.className.match(/language-(\w+)/)?.[1] || '';
                    return '\n```' + lang + '\n' + code.textContent.replace(/\n$/, '') + '\n```\n';
                }
                return '\n```\n' + node.textContent + '\n```\n';
            }

            // Blockquote
            if (tag === 'BLOCKQUOTE') {
                const inner = extractChildren(node).trim();
                return '\n' + inner.split('\n').map(l => '> ' + l).join('\n') + '\n';
            }

            // Horizontal rule
            if (tag === 'HR') return '\n---\n';

            // Table
            if (tag === 'TABLE') {
                let out = '\n';
                const rows = Array.from(node.querySelectorAll('tr'));
                rows.forEach((row, i) => {
                    const cells = Array.from(row.querySelectorAll('th, td'));
                    out += '| ' + cells.map(c => extractChildren(c).trim()).join(' | ') + ' |\n';
                    if (i === 0) {
                        out += '| ' + cells.map(() => '---').join(' | ') + ' |\n';
                    }
                });
                return out;
            }
            if (tag === 'THEAD' || tag === 'TBODY' || tag === 'TR' || tag === 'TH' || tag === 'TD') return '';

            // Lists
            if (tag === 'UL' || tag === 'OL') {
                return extractList(node, depth);
            }
            if (tag === 'LI') return ''; // handled inside extractList

            // Paragraph
            if (tag === 'P') {
                return '\n' + extractChildren(node).trim() + '\n';
            }

            // Inline elements inside block context — emit inline
            if (['STRONG','B','EM','I','S','DEL','CODE','A','SPAN','BR'].includes(tag)) {
                return extractInline(node);
            }

            // Generic container — recurse
            return Array.from(node.childNodes).map(c => extractBlock(c, depth)).join('');
        }

        function extractList(listNode, depth) {
            const isOrdered = listNode.tagName === 'OL';
            const indent = '   '.repeat(depth);
            let out = '\n';
            let orderedIdx = 1;
            Array.from(listNode.children).forEach(li => {
                if (li.tagName !== 'LI') return;
                const prefix = isOrdered ? (orderedIdx++) + '. ' : '* ';

                // Separate inline content from nested lists
                let inlinePart = '';
                let nestedPart = '';
                Array.from(li.childNodes).forEach(child => {
                    if (child.nodeType === Node.ELEMENT_NODE && (child.tagName === 'UL' || child.tagName === 'OL')) {
                        nestedPart += extractList(child, depth + 1);
                    } else {
                        inlinePart += extractInline(child);
                    }
                });

                out += indent + prefix + inlinePart.trim() + '\n';
                if (nestedPart) out += nestedPart;
            });
            return out;
        }

        const raw = Array.from(element.childNodes).map(c => extractBlock(c, 0)).join('');
        return raw.replace(/\n{3,}/g, '\n\n').trim();
    }

    // Save markdown content as a .md file
    function saveMarkdownFile(content) {
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
        window.showToastNotification(chrome.i18n?.getMessage('markdownSaved') || 'Saved as Markdown file', 'success');
    }

    function generateFilename(content) {
        const now = new Date();
        const timestamp = now.toLocaleString('zh-CN', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false
        }).replace(/[\/\s:]/g, '-').replace(',', '');

        if (!content) return `deepseek_${timestamp}`;
        const lines = content.split('\n').filter(l => l.trim().length > 0);
        let firstLine = '';
        if (lines.length > 0) {
            firstLine = lines[0].replace(/^#+\s*/, '').replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '').substring(0, 15).trim();
        }
        return `${firstLine || 'deepseek'}_${timestamp}`;
    }

    // Main save function
    async function saveAsMarkdown(copyButton) {
        if (!copyMarkdownSettings.enabled) {
            window.showToastNotification(chrome.i18n?.getMessage('featureDisabled') || 'Save as Markdown feature is disabled', 'info');
            return;
        }

        // Find the message container
        let messageDiv = copyButton.closest('._4f9bf79, ._9663006');
        if (!messageDiv) {
            console.error('Could not find message container');
            window.showToastNotification(chrome.i18n?.getMessage('saveFailed') || 'Failed to save', 'error');
            return;
        }

        const isAiMessage = messageDiv.matches('._4f9bf79');
        let markdownContent = '';

        if (isAiMessage) {
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
            const userContent = extractUserQuestionAsMarkdown(messageDiv);
            if (userContent) {
                markdownContent = `## User Question\n\n${userContent}`;
            }
        }

        if (markdownContent && markdownContent.trim()) {
            saveMarkdownFile(markdownContent);
        } else {
            window.showToastNotification(chrome.i18n?.getMessage('noContent') || 'No content to save', 'error');
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
    async function saveConversationAsMarkdown() {
        if (!copyMarkdownSettings.enabled) {
            window.showToastNotification(chrome.i18n?.getMessage('featureDisabled') || 'Save as Markdown feature is disabled', 'info');
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
            
            saveMarkdownFile(fullMarkdown);
        } else {
            window.showToastNotification(chrome.i18n?.getMessage('noContent') || 'No content to save', 'error');
        }
    }

    // Inject markdown copy button next to existing copy button
    function injectMarkdownButton(copyButton, container) {
        if (container.querySelector('.deepseek-markdown-copy-btn')) return;

        const mdButton = document.createElement('div');
        mdButton.className = copyButton.className + ' deepseek-markdown-copy-btn';
        mdButton.tabIndex = copyButton.tabIndex || -1;
        mdButton.setAttribute('role', 'button');
        mdButton.setAttribute('aria-label', chrome.i18n?.getMessage('saveAsMarkdown') || 'Save as Markdown');
        mdButton.title = chrome.i18n?.getMessage('saveAsMarkdown') || 'Save as Markdown';

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
            
            await saveAsMarkdown(copyButton);
            
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
        span.textContent = chrome.i18n?.getMessage('saveConversationMarkdown') || 'Save as Markdown';

        // Remove icon if exists
        const iconContainer = mdCopyButton.querySelector('.ds-icon');
        if (iconContainer) {
            iconContainer.remove();
        }

        mdCopyButton.addEventListener('click', async () => {
            await saveConversationAsMarkdown();
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