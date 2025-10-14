/**
 * DeepShare ChatGPT Button Injector
 * Injects a DOCX conversion button into the ChatGPT interface.
 */

(function () {
    'use strict';

    let lastUrl = location.href;
    console.debug('DeepShare: Initializing DOCX button injection for ChatGPT');

    function findAndInjectButtons() {
        // More specific selector for the button group
        const buttonGroups = document.querySelectorAll('div[class*="group-hover/turn-messages"]');

        buttonGroups.forEach(group => {
            const copyButton = group.querySelector('button[data-testid="copy-turn-action-button"]');
            if (copyButton && !group.querySelector('.deepshare-docx-btn')) {
                injectButton(copyButton);
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
    setTimeout(findAndInjectButtons, 500);

    function injectButton(copyBtn) {
        // Create the DOCX button
        const docxButton = document.createElement('button');
        docxButton.className = 'text-token-text-secondary hover:bg-token-bg-secondary rounded-lg deepshare-docx-btn';
        docxButton.setAttribute('aria-label', chrome.i18n.getMessage('docxButton') || 'Save as Word document');

        const span = document.createElement('span');
        span.className = 'touch:w-10 flex h-8 w-8 items-center justify-center';

        // Re-use the SVG from injectDocxButton.js for style consistency
        span.innerHTML = `
            <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 20px; height: 20px;">
                <path d="M16 18H4C3.45 18 3 17.55 3 17V3C3 2.45 3.45 2 4 2H12L17 7V17C17 17.55 16.55 18 16 18Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
                <path d="M12 2V7H17" stroke="currentColor" stroke-width="1.5" fill="none"/>
                <path d="M6 10.5H14" stroke="currentColor" stroke-width="1.5"/>
                <path d="M6 14H12" stroke="currentColor" stroke-width="1.5"/>
            </svg>
        `;
        docxButton.appendChild(span);

        // Insert after the copy button
        copyBtn.insertAdjacentElement('afterend', docxButton);

        // Add tooltip listeners
        let tooltip = null;

        docxButton.addEventListener('mouseenter', () => {
            if (docxButton.hasAttribute('disabled')) return;

            tooltip = document.createElement('div');
            tooltip.className = 'deepshare-gpt-tooltip';
            tooltip.textContent = docxButton.getAttribute('aria-label');
            document.body.appendChild(tooltip);

            const btnRect = docxButton.getBoundingClientRect();
            const tooltipRect = tooltip.getBoundingClientRect();

            let top = btnRect.bottom + 8;
            let left = btnRect.left + (btnRect.width / 2) - (tooltipRect.width / 2);

            if (left < 5) left = 5;
            if (left + tooltipRect.width > window.innerWidth) {
                left = window.innerWidth - tooltipRect.width - 5;
            }

            tooltip.style.top = `${top}px`;
            tooltip.style.left = `${left}px`;
        });

        docxButton.addEventListener('mouseleave', () => {
            if (tooltip) {
                tooltip.remove();
                tooltip = null;
            }
        });

        // Add click handler
        docxButton.addEventListener('click', async (e) => {
            e.stopPropagation();
            const sourceButton = e.currentTarget;

            try {
                // Find the message content container
                const messageContainer = docxButton.closest('.agent-turn');

                if (!messageContainer) {
                    console.error('DeepShare: Could not find message container (.agent-turn)');
                    throw new Error('Could not find message container');
                }

                console.debug('DeepShare: Found message container');


                // Extract content with proper formula handling
                let content = extractContentWithFormulas(messageContainer);

                if (content) {
                    console.debug('Successfully extracted AI response from ChatGPT DOM.');
                    const conversationData = {
                        role: 'assistant',
                        content: content,
                    };

                    const event = new CustomEvent('deepshare:convertToDocx', {
                        detail: {
                            messages: conversationData,
                            sourceButton: sourceButton,
                        },
                    });
                    document.dispatchEvent(event);
                } else {
                    window.showToastNotification(chrome.i18n.getMessage('getClipboardError'), 'error');
                }
            } catch (error) {
                console.error('Error getting content from ChatGPT:', error);
                window.showToastNotification(`${chrome.i18n.getMessage('getClipboardError')}: ${error.message}`, 'error');
            }
        });
    }

    /**
     * Extract content from ChatGPT message with proper formula conversion
     * Converts KaTeX formulas to standard Markdown format
     */
    function extractContentWithFormulas(container) {
        const markdownDiv = container.querySelector('.markdown');
        if (!markdownDiv) return '';

        let result = '';

        // Process all child nodes
        const processNode = (node) => {
            // Skip citation pills and other metadata elements
            if (node.nodeType === Node.ELEMENT_NODE) {
                if (node.hasAttribute('data-testid') && node.getAttribute('data-testid') === 'webpage-citation-pill') {
                    return;
                }
                // Skip other common ChatGPT UI elements
                if (node.classList && (
                    node.classList.contains('citation-pill') ||
                    node.classList.contains('browse-link')
                )) {
                    return;
                }
            }

            // Handle display formulas (block level)
            if (node.classList && node.classList.contains('katex-display')) {
                const mathML = node.querySelector('annotation[encoding="application/x-tex"]');
                if (mathML) {
                    result += '\n$$\n' + mathML.textContent.trim() + '\n$$\n';
                }
                return;
            }

            // Handle inline formulas
            if (node.classList && node.classList.contains('katex') && !node.closest('.katex-display')) {
                const mathML = node.querySelector('annotation[encoding="application/x-tex"]');
                if (mathML) {
                    result += '$' + mathML.textContent.trim() + '$';
                }
                return;
            }

            // Handle headings
            if (node.tagName && /^H[1-6]$/.test(node.tagName)) {
                const level = node.tagName[1];
                const headingMark = '#'.repeat(parseInt(level));
                result += '\n' + headingMark + ' ';
                node.childNodes.forEach(processNode);
                result += '\n\n';
                return;
            }

            // Handle paragraphs
            if (node.tagName === 'P') {
                node.childNodes.forEach(processNode);
                result += '\n\n';
                return;
            }

            // Handle line breaks
            if (node.tagName === 'BR') {
                result += '\n';
                return;
            }

            // Handle horizontal rules
            if (node.tagName === 'HR') {
                result += '\n---\n\n';
                return;
            }

            // Handle blockquotes
            if (node.tagName === 'BLOCKQUOTE') {
                const lines = [];
                const tempResult = result;
                result = '';
                node.childNodes.forEach(processNode);
                const quoteContent = result;
                result = tempResult;
                
                // Split by lines and add > prefix
                quoteContent.split('\n').forEach(line => {
                    if (line.trim()) {
                        lines.push('> ' + line.trim());
                    }
                });
                result += '\n' + lines.join('\n') + '\n\n';
                return;
            }

            // Handle tables
            if (node.tagName === 'TABLE') {
                result += '\n';
                const thead = node.querySelector('thead');
                const tbody = node.querySelector('tbody');

                // Process header
                if (thead) {
                    const headerRow = thead.querySelector('tr');
                    if (headerRow) {
                        const headers = Array.from(headerRow.querySelectorAll('th'));
                        const headerTexts = headers.map(th => {
                            let text = '';
                            th.childNodes.forEach(child => {
                                if (child.nodeType === Node.TEXT_NODE) {
                                    text += child.textContent;
                                } else if (child.tagName === 'A') {
                                    text += child.textContent;
                                }
                            });
                            return text.trim();
                        });
                        result += '| ' + headerTexts.join(' | ') + ' |\n';
                        result += '| ' + headerTexts.map(() => '---').join(' | ') + ' |\n';
                    }
                }

                // Process body
                if (tbody) {
                    const rows = tbody.querySelectorAll('tr');
                    rows.forEach(row => {
                        const cells = Array.from(row.querySelectorAll('td'));
                        const cellTexts = cells.map(td => {
                            let text = '';
                            const processCell = (n) => {
                                if (n.nodeType === Node.TEXT_NODE) {
                                    text += n.textContent;
                                } else if (n.tagName === 'A') {
                                    text += '[' + n.textContent + '](' + n.href + ')';
                                } else if (n.tagName === 'CODE') {
                                    text += '`' + n.textContent + '`';
                                } else if (n.tagName === 'STRONG') {
                                    text += '**';
                                    n.childNodes.forEach(processCell);
                                    text += '**';
                                    return;
                                } else if (n.childNodes) {
                                    n.childNodes.forEach(processCell);
                                }
                            };
                            td.childNodes.forEach(processCell);
                            return text.trim();
                        });
                        result += '| ' + cellTexts.join(' | ') + ' |\n';
                    });
                }

                result += '\n';
                return;
            }

            // Handle lists
            if (node.tagName === 'UL' || node.tagName === 'OL') {
                const isOrdered = node.tagName === 'OL';
                let index = 1;
                node.querySelectorAll(':scope > li').forEach(li => {
                    const prefix = isOrdered ? `${index}. ` : '* ';
                    result += prefix;
                    li.childNodes.forEach(processNode);
                    result += '\n';
                    index++;
                });
                result += '\n';
                return;
            }

            // Handle list items (when not already processed by parent UL/OL)
            if (node.tagName === 'LI') {
                node.childNodes.forEach(processNode);
                return;
            }

            // Handle strong/bold
            if (node.tagName === 'STRONG') {
                result += '**';
                node.childNodes.forEach(processNode);
                result += '**';
                return;
            }

            // Handle emphasis/italic
            if (node.tagName === 'EM') {
                result += '*';
                node.childNodes.forEach(processNode);
                result += '*';
                return;
            }

            // Handle code blocks
            if (node.tagName === 'PRE') {
                const code = node.querySelector('code');
                if (code) {
                    const language = code.className.match(/language-(\w+)/)?.[1] || '';
                    result += '\n```' + language + '\n';
                    result += code.textContent;
                    result += '\n```\n\n';
                }
                return;
            }

            // Handle inline code
            if (node.tagName === 'CODE' && !node.closest('pre')) {
                result += '`' + node.textContent + '`';
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

            // Handle text nodes
            if (node.nodeType === Node.TEXT_NODE) {
                result += node.textContent;
                return;
            }

            // Handle other elements with children
            if (node.childNodes && node.childNodes.length > 0) {
                node.childNodes.forEach(processNode);
            }
        };

        markdownDiv.childNodes.forEach(processNode);

        // Clean up excessive newlines
        result = result.replace(/\n{3,}/g, '\n\n').trim();

        return result;
    }
})();