/**
 * DeepShare ChatGPT Button Injector
 * Injects a DOCX conversion button into the ChatGPT interface.
 */

(function () {
    'use strict';

    let lastUrl = location.href;
    let activeMessageContainer = null;
    console.debug('DeepShare: Initializing DOCX button injection for ChatGPT');

    function findAndInjectButtons() {
        // More specific selector for the button group
        const buttonGroups = document.querySelectorAll('div[class*="group-hover/turn-messages"]');

        buttonGroups.forEach(group => {
            const copyButton = group.querySelector('button[data-testid="copy-turn-action-button"]');
            if (copyButton && !group.querySelector('.deepshare-docx-btn')) {
                injectButton(copyButton);
            }

            // Handle "More" menu listener to track active message
            const moreButtons = group.querySelectorAll('button[aria-haspopup="menu"]');
            moreButtons.forEach(moreButton => {
                if (!moreButton.dataset.deepshareListenerAttached) {
                    moreButton.dataset.deepshareListenerAttached = 'true';
                    moreButton.addEventListener('click', () => {
                        activeMessageContainer = moreButton.closest('.agent-turn');
                        console.debug('DeepShare: More menu opened, tracking message container');
                        // Wait for the menu overlay to appear
                        setTimeout(injectMdButtonToMenu, 100);
                    });
                }
            });
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
        const processNode = (node, indent = 0, inListItem = false, trimText = false) => {
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
                node.childNodes.forEach(child => processNode(child, indent, false));
                result += '\n\n';
                return;
            }

            // Handle paragraphs
            if (node.tagName === 'P') {
                // In list items, trim leading/trailing whitespace from text nodes
                if (inListItem) {
                    const childNodes = Array.from(node.childNodes);

                    // Find first and last non-whitespace-only nodes
                    let firstIdx = -1;
                    let lastIdx = -1;
                    for (let i = 0; i < childNodes.length; i++) {
                        const child = childNodes[i];
                        if (child.nodeType !== Node.TEXT_NODE || child.textContent.trim()) {
                            if (firstIdx === -1) firstIdx = i;
                            lastIdx = i;
                        }
                    }

                    // Process each node with trim flags
                    for (let i = firstIdx; i <= lastIdx && i >= 0; i++) {
                        const child = childNodes[i];
                        const trimStart = (i === firstIdx);
                        const trimEnd = (i === lastIdx);
                        const needTrim = (trimStart ? 'start' : '') + (trimEnd ? 'end' : '');
                        processNode(child, indent, inListItem, needTrim || false);
                    }
                } else {
                    node.childNodes.forEach(child => processNode(child, indent, inListItem, false));
                    result += '\n\n';
                }
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
                node.childNodes.forEach(child => processNode(child, indent, false));
                const quoteContent = result;
                result = tempResult;

                // Split by lines and add > prefix, preserving empty lines within quote
                const contentLines = quoteContent.split('\n');
                for (let i = 0; i < contentLines.length; i++) {
                    const line = contentLines[i];
                    if (line.trim()) {
                        lines.push('> ' + line.trim());
                    } else if (i > 0 && i < contentLines.length - 1 && contentLines[i + 1].trim()) {
                        // Add empty quote line only if it's between content lines
                        lines.push('>');
                    }
                }
                result += '\n' + lines.join('\n') + '\n\n';
                return;
            }

            // Handle tables
            if (node.tagName === 'TABLE') {
                result += '\n';

                const processCell = (cell) => {
                    let cellText = '';
                    const traverse = (n) => {
                        if (n.nodeType === Node.TEXT_NODE) {
                            cellText += n.textContent;
                        } else if (n.nodeType === Node.ELEMENT_NODE) {
                            if (n.classList.contains('katex')) {
                                const annotation = n.querySelector('annotation[encoding="application/x-tex"]');
                                if (annotation) {
                                    cellText += '$' + annotation.textContent.trim() + '$';
                                    return;
                                }
                            }

                            if (n.tagName === 'BR') {
                                cellText += ' ';
                            } else if (n.tagName === 'A') {
                                cellText += '[' + (n.textContent || '') + '](' + (n.href || '') + ')';
                            } else if (n.tagName === 'STRONG' || n.tagName === 'B') {
                                cellText += '**';
                                n.childNodes.forEach(traverse);
                                cellText += '**';
                            } else if (n.tagName === 'EM' || n.tagName === 'I') {
                                cellText += '*';
                                n.childNodes.forEach(traverse);
                                cellText += '*';
                            } else if (n.tagName === 'CODE') {
                                cellText += '`' + n.textContent + '`';
                            } else {
                                // Recurse for wraps like SPAN, DIV, P
                                n.childNodes.forEach(traverse);
                            }
                        }
                    };
                    cell.childNodes.forEach(traverse);
                    return cellText.replace(/\|/g, '\\|').trim();
                };

                const rows = Array.from(node.querySelectorAll('tr'));
                if (rows.length === 0) return;

                let headerRow = node.querySelector('thead > tr');
                let bodyRows = [];

                if (headerRow) {
                    bodyRows = rows.filter(r => r !== headerRow && !r.closest('tfoot'));
                } else {
                    // If no explicit thead, assume first row is header (standard for MD tables)
                    headerRow = rows[0];
                    bodyRows = rows.slice(1);
                }

                if (headerRow) {
                    const cells = Array.from(headerRow.querySelectorAll('th, td'));
                    const headers = cells.map(processCell);
                    result += '| ' + headers.join(' | ') + ' |\n';
                    result += '| ' + headers.map(() => '---').join(' | ') + ' |\n';
                }

                bodyRows.forEach(row => {
                    const cells = Array.from(row.querySelectorAll('td, th'));
                    const rowTexts = cells.map(processCell);
                    result += '| ' + rowTexts.join(' | ') + ' |\n';
                });

                result += '\n';
                return;
            }

            // Handle lists
            if (node.tagName === 'UL' || node.tagName === 'OL') {
                const isOrdered = node.tagName === 'OL';
                let index = 1;
                const listItems = Array.from(node.children).filter(child => child.tagName === 'LI');

                listItems.forEach(li => {
                    const indentation = '   '.repeat(indent);

                    // Check if this is a task list item
                    const isTaskList = li.classList && li.classList.contains('task-list-item');
                    const checkbox = isTaskList ? li.querySelector('input[type="checkbox"]') : null;

                    let prefix;
                    if (checkbox) {
                        // For task lists, use checkbox format with single space
                        prefix = checkbox.checked ? '* [x] ' : '* [ ] ';
                    } else {
                        prefix = isOrdered ? `${index}. ` : '* ';
                    }
                    result += indentation + prefix;

                    // Process the list item's content
                    let hasContent = false;
                    for (let i = 0; i < li.childNodes.length; i++) {
                        const child = li.childNodes[i];

                        // Skip whitespace-only text nodes in list items
                        if (child.nodeType === Node.TEXT_NODE && !child.textContent.trim()) {
                            continue;
                        }

                        // Skip checkbox input itself
                        if (child.tagName === 'INPUT' && child.type === 'checkbox') {
                            continue;
                        }

                        // If it's a nested list, handle it separately with increased indent
                        if (child.tagName === 'UL' || child.tagName === 'OL') {
                            if (hasContent) {
                                result += '\n';
                            }
                            processNode(child, indent + 1, false);
                        } else {
                            // Process other content (text, p tags, etc.)
                            const beforeLength = result.length;
                            processNode(child, indent, true);
                            if (result.length > beforeLength) {
                                hasContent = true;
                            }
                        }
                    }

                    result += '\n';
                    index++;
                });

                if (indent === 0) {
                    result += '\n';
                }
                return;
            }

            // Handle list items (when not already processed by parent UL/OL)
            if (node.tagName === 'LI') {
                node.childNodes.forEach(child => processNode(child, indent, inListItem));
                return;
            }

            // Handle strikethrough/delete
            if (node.tagName === 'DEL') {
                result += '~~';
                node.childNodes.forEach(child => processNode(child, indent, inListItem));
                result += '~~';
                return;
            }

            // Handle strong/bold
            if (node.tagName === 'STRONG') {
                result += '**';
                node.childNodes.forEach(child => processNode(child, indent, inListItem));
                result += '**';
                return;
            }

            // Handle emphasis/italic
            if (node.tagName === 'EM') {
                result += '*';
                node.childNodes.forEach(child => processNode(child, indent, inListItem));
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
                // Get text content but skip SVG and other decorative elements
                let text = '';
                const getTextOnly = (n) => {
                    if (n.nodeType === Node.TEXT_NODE) {
                        text += n.textContent;
                    } else if (n.tagName === 'SPAN' && n.querySelector('svg')) {
                        // Skip spans containing SVG icons
                        return;
                    } else if (n.childNodes) {
                        n.childNodes.forEach(getTextOnly);
                    }
                };
                node.childNodes.forEach(getTextOnly);
                text = text.trim();

                // Check for title attribute
                const title = node.getAttribute('title');

                if (href && href !== text) {
                    if (title) {
                        result += '[' + text + '](' + href + ' "' + title + '")';
                    } else {
                        result += '[' + text + '](' + href + ')';
                    }
                } else {
                    result += text;
                }
                return;
            }

            // Handle text nodes
            if (node.nodeType === Node.TEXT_NODE) {
                let text = node.textContent;
                if (trimText) {
                    if (trimText.includes('start')) text = text.trimStart();
                    if (trimText.includes('end')) text = text.trimEnd();
                }
                result += text;
                return;
            }

            // Handle other elements with children
            if (node.childNodes && node.childNodes.length > 0) {
                node.childNodes.forEach(child => processNode(child, indent, inListItem));
            }
        };

        markdownDiv.childNodes.forEach(child => processNode(child, 0, false));

        // Clean up excessive newlines
        result = result.replace(/\n{3,}/g, '\n\n').trim();

        return result;
    }

    function injectMdButtonToMenu() {
        // Find the Radix menu content
        const menuContents = document.querySelectorAll('div[role="menu"]');

        menuContents.forEach(menuContent => {
            // Check if already injected
            if (menuContent.querySelector('.deepshare-menu-md-button')) {
                return;
            }

            console.debug('DeepShare: Injecting Markdown button into ChatGPT More menu');

            // Create menu item element matching ChatGPT's style
            const mdButton = document.createElement('div');
            mdButton.className = 'group __menu-item gap-1.5 deepshare-menu-md-button hover:bg-token-main-surface-secondary cursor-pointer px-3 py-2 rounded-xl';
            mdButton.setAttribute('role', 'menuitem');
            mdButton.setAttribute('tabindex', '0');

            // Find an existing menu item to copy styles if needed, or just use the class
            mdButton.innerHTML = `
                <div class="flex items-center justify-center group-disabled:opacity-50 group-data-disabled:opacity-50 icon">
                    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style="width: 20px; height: 20px;">
                        <path d="M20.56 18H3.44C2.65 18 2 17.37 2 16.59V7.41C2 6.63 2.65 6 3.44 6H20.56C21.35 6 22 6.63 22 7.41V16.59C22 17.37 21.35 18 20.56 18M6.81 15.19V11.53L8.73 13.88L10.65 11.53V15.19H12.58V8.81H10.65L8.73 11.16L6.81 8.81H4.89V15.19H6.81M19.69 12H17.77V8.81H15.85V12H13.92L16.81 15.28L19.69 12Z"/>
                    </svg>
                </div>
                <div class="flex min-w-0 grow items-center gap-2.5">
                    <div class="truncate">${chrome.i18n.getMessage('saveAsMarkdown') || 'Save as Markdown'}</div>
                </div>
            `;

            // Prepend or append? Usually consistent with Gemini we prepend to the first few actions
            menuContent.prepend(mdButton);

            // Click event
            mdButton.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!activeMessageContainer) {
                    console.error('DeepShare: No active message container found');
                    return;
                }

                const markdown = extractContentWithFormulas(activeMessageContainer);
                if (markdown) {
                    downloadMarkdownFile(markdown);
                }

                // Close menu - GPT uses Radix, clicking outside or selecting works
                // We'll just let it be or try to find a backdrop if necessary
                // Most Radix menus close on selection automatically if handled right
                // But since we stopPropagation, we might need to manually close it if GPT doesn't
                document.body.click();
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

        if (!content) return `chatgpt_${timestamp}`;
        // Try to get first line (ignoring markdown headers)
        const lines = content.split('\n').filter(l => l.trim().length > 0);
        let firstLine = '';
        if (lines.length > 0) {
            firstLine = lines[0].replace(/^#+\s*/, '').replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '').substring(0, 15).trim();
        }
        return `${firstLine || 'chatgpt'}_${timestamp}`;
    }
})();