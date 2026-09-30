/**
 * DeepShare ChatGPT Button Injector
 * Injects a DOCX conversion button into the ChatGPT interface.
 */

(function () {
    'use strict';

    let lastUrl = location.href;
    let activeMessageContainer = null;
    let tooltipSequence = 0;
    let tooltipWarmUntil = 0;
    let nativeTooltipVisible = false;
    const nativeTooltipSelector = '[role="tooltip"]:not(.deepshare-gpt-tooltip), [data-radix-popper-content-wrapper] [data-state$="open"][data-side]';
    function hasNativeTooltip() {
        return Array.from(document.querySelectorAll(nativeTooltipSelector)).some(node =>
            node.getBoundingClientRect().height > 0 && !node.closest('[role="menu"]'));
    }
    console.debug('DeepShare: Initializing DOCX button injection for ChatGPT');

    const legacyGroupSelector = 'div[class*="group-hover/turn-messages"]';
    const bodySelector = '.markdown, [data-markdown-text-style="assistant-message"]';

    function findMessageContainer(button) {
        const legacy = button.closest('.agent-turn');
        if (legacy) return legacy;

        // The new UI places the actions beside the content of a virtualized
        // turn, which may also contain the user's prompt. Read only assistant
        // Markdown roots, and never climb into the whole conversation.
        const turn = button.closest('[data-turn-key], [data-content-search-turn-key], article[data-testid^="conversation-turn-"]');
        return turn?.querySelector(bodySelector) ? turn : null;
    }

    function findAndInjectButtons() {
        const groups = document.querySelectorAll(`${legacyGroupSelector}, .turn-action-controls`);
        groups.forEach(group => {
            const copyButton = group.querySelector('button[data-testid="copy-turn-action-button"]')
                || Array.from(group.querySelectorAll('button')).find(button =>
                    /^(copy|copy response|复制|複製)$/i.test(button.getAttribute('aria-label') || ''));
            if (!copyButton || !findMessageContainer(copyButton)) return;
            if (!group.querySelector('.deepshare-docx-btn')) injectButton(copyButton);

            group.querySelectorAll('button[aria-haspopup="menu"]').forEach(moreButton => {
                if (moreButton.dataset.deepshareListenerAttached) return;
                moreButton.dataset.deepshareListenerAttached = 'true';
                moreButton.addEventListener('click', () => {
                    activeMessageContainer = findMessageContainer(moreButton);
                    // Use the trigger's own menu, not an unrelated open menu.
                    setTimeout(() => injectMdButtonToMenu(moreButton), 100);
                });
            });
        });
    }

    const observer = new MutationObserver(() => {
        const nativeVisible = hasNativeTooltip();
        if (nativeTooltipVisible && !nativeVisible) tooltipWarmUntil = Date.now() + 300;
        nativeTooltipVisible = nativeVisible;
        // Virtualized turns can be removed while their tooltip is open.
        document.querySelectorAll('.deepshare-gpt-tooltip').forEach(tooltip => {
            if (!document.querySelector(`[aria-describedby="${tooltip.id}"]`)) tooltip.remove();
        });
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
        docxButton.className = `${copyBtn.className} deepshare-docx-btn`;
        docxButton.type = 'button';
        docxButton.setAttribute('aria-label', chrome.i18n?.getMessage('docxButton') || 'Save as Word document');

        const span = document.createElement('span');
        span.className = 'touch:w-10 flex h-8 w-8 items-center justify-center';

        // Re-use the SVG from injectDocxButton.js for style consistency
        span.innerHTML = `
            <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 20px; height: 20px;">
                <path d="M16 18H4C3.45 18 3 17.55 3 17V3C3 2.45 3.45 2 4 2H12L17 7V17C17 17.55 16.55 18 16 18Z" stroke="currentColor" stroke-width="1.25" fill="none"/>
                <path d="M12 2V7H17" stroke="currentColor" stroke-width="1.5" fill="none"/>
                <path d="M6 10.5H14" stroke="currentColor" stroke-width="1.5"/>
                <path d="M6 14H12" stroke="currentColor" stroke-width="1.5"/>
            </svg>
        `;
        const nativeIcon = copyBtn.querySelector('svg');
        const nativeWrapper = nativeIcon?.closest('span');
        if (nativeWrapper && copyBtn.contains(nativeWrapper)) {
            span.className = nativeWrapper.className;
            docxButton.appendChild(span);
        } else {
            docxButton.appendChild(span.firstElementChild);
        }
        const icon = docxButton.querySelector('svg');
        if (nativeIcon) {
            icon.setAttribute('class', nativeIcon.getAttribute('class') || '');
            const { width, height } = nativeIcon.getBoundingClientRect();
            icon.style.width = `${width || 20}px`;
            icon.style.height = `${height || 20}px`;
        }
        icon.setAttribute('aria-hidden', 'true');

        // New ChatGPT wraps its copy trigger in a display:contents tooltip
        // host. A sibling inside that host would activate BOTH tooltips and
        // change the native trigger's positioning bounds. Keep our button
        // outside the host, while retaining the legacy direct-sibling layout.
        const copyHost = copyBtn.parentElement;
        const insertionAnchor = copyHost?.matches('span.contents[data-state]')
            ? copyHost : copyBtn;
        insertionAnchor.insertAdjacentElement('afterend', docxButton);

        // Add tooltip listeners
        let tooltip = null;
        let tooltipTimer = null;

        const hideTooltip = () => {
            clearTimeout(tooltipTimer);
            if (tooltip) tooltipWarmUntil = Date.now() + 300;
            tooltip?.remove();
            tooltip = null;
            docxButton.removeAttribute('aria-describedby');
            window.removeEventListener('scroll', hideTooltip, true);
            window.removeEventListener('resize', hideTooltip);
        };
        const renderTooltip = () => {
            if (!docxButton.isConnected || docxButton.disabled) return;
            tooltip = document.createElement('div');
            tooltip.className = 'deepshare-gpt-tooltip';
            tooltip.id = `deepshare-gpt-tooltip-${++tooltipSequence}`;
            tooltip.setAttribute('role', 'tooltip');
            tooltip.textContent = docxButton.getAttribute('aria-label');
            if (copyBtn.closest('.turn-action-controls')) {
                tooltip.style.cssText = 'background:var(--color-background-tooltip,#0d0d0d);color:var(--color-text-tooltip,#fff);border:1px solid var(--color-border-tooltip,rgba(255,255,255,.05));font-size:14px;font-weight:var(--tooltip-compact-font-weight,600);line-height:18px;letter-spacing:var(--tracking-tooltip,normal);border-radius:16px;padding:5px 12px;box-shadow:var(--shadow-tooltip,0 8px 18px rgba(15,23,42,.2));text-align:center;';
            } else {
                tooltip.classList.add('dark', 'bg-token-bg-tooltip');
                tooltip.style.cssText = 'background:var(--bg-tooltip,#1b1b1b);color:#fff;border:1px solid var(--border-tooltip,rgba(255,255,255,.05));font-size:14px;font-weight:600;line-height:18px;letter-spacing:-.15px;border-radius:9999px;padding:5px 12px;box-shadow:0 8px 18px rgba(15,23,42,.2);text-align:center;';
            }
            tooltip.style.zIndex = '10000';
            document.body.appendChild(tooltip);
            docxButton.setAttribute('aria-describedby', tooltip.id);
            window.addEventListener('scroll', hideTooltip, true);
            window.addEventListener('resize', hideTooltip);
            const rect = docxButton.getBoundingClientRect();
            const tipRect = tooltip.getBoundingClientRect();
            // Match the new toolbar's native tooltip offset; retain the legacy spacing.
            const tooltipGap = copyBtn.closest('.turn-action-controls') ? 6 : 8;
            const top = rect.bottom + tipRect.height + tooltipGap <= window.innerHeight
                ? rect.bottom + tooltipGap : rect.top - tipRect.height - tooltipGap;
            tooltip.style.top = `${Math.max(4, top)}px`;
            tooltip.style.left = `${Math.max(4, Math.min(rect.left + (rect.width - tipRect.width) / 2, window.innerWidth - tipRect.width - 4))}px`;
        };
        const showTooltip = (event) => {
            hideTooltip();
            if (docxButton.disabled || !docxButton.isConnected) return;
            // Native ChatGPT: 200 ms on first hover; focus and warm hovers are immediate.
            if (event.type === 'focus' || hasNativeTooltip() || Date.now() < tooltipWarmUntil) {
                renderTooltip();
            } else {
                tooltipTimer = setTimeout(renderTooltip, 200);
            }
        };
        docxButton.addEventListener('mouseenter', showTooltip);
        docxButton.addEventListener('mouseleave', hideTooltip);
        docxButton.addEventListener('focus', showTooltip);
        docxButton.addEventListener('blur', hideTooltip);
        docxButton.addEventListener('click', hideTooltip);
        docxButton.addEventListener('keydown', event => {
            if (event.key === 'Escape') hideTooltip();
        });

        // Add click handler
        docxButton.addEventListener('click', async (e) => {
            e.stopPropagation();
            const sourceButton = e.currentTarget;

            try {
                // Find the message content container
                const messageContainer = findMessageContainer(docxButton);

                if (!messageContainer) {
                    console.error('DeepShare: Could not find message container');
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
                    window.showToastNotification(chrome.i18n?.getMessage('getClipboardError'), 'error');
                }
            } catch (error) {
                console.error('Error getting content from ChatGPT:', error);
                window.showToastNotification(`${chrome.i18n?.getMessage('getClipboardError')}: ${error.message}`, 'error');
            }
        });
    }

    /**
     * Extract content from ChatGPT message with proper formula conversion
     * Converts KaTeX formulas to standard Markdown format
     */
    function extractContentWithFormulas(container) {
        const markdownDivs = Array.from(container.querySelectorAll(bodySelector))
            .filter(root => !root.parentElement?.closest(bodySelector));
        if (markdownDivs.length === 0) return '';

        let result = '';

        // ChatGPT moved the source LaTeX from KaTeX's annotation node to
        // attributes on the surrounding math element. Support both DOM
        // formats so DOCX/Markdown exports retain formulas after updates.
        const getFormulaSource = (element) => {
            const annotation = element.querySelector('annotation[encoding="application/x-tex"]');
            const sourceElement = element.closest('[data-math-source], [role="math"][aria-label]');

            return annotation?.textContent?.trim()
                || sourceElement?.getAttribute('data-math-source')?.trim()
                || sourceElement?.getAttribute('aria-label')?.trim()
                || '';
        };

        const getCodeBlockText = (codeNode) => {
            let text = '';

            const appendNodeText = (currentNode) => {
                if (currentNode.nodeType === Node.TEXT_NODE) {
                    text += currentNode.textContent;
                    return;
                }

                if (currentNode.nodeType !== Node.ELEMENT_NODE) {
                    return;
                }

                if (currentNode.tagName === 'BR') {
                    text += '\n';
                    return;
                }

                currentNode.childNodes.forEach(appendNodeText);
            };

            codeNode.childNodes.forEach(appendNodeText);
            return text.replace(/\n$/, '');
        };

        const normalizeCodeLanguage = (language) => {
            const normalized = (language || '').trim().toLowerCase();
            const aliases = {
                'c++': 'cpp',
                'c#': 'csharp',
                'js': 'javascript',
                'ts': 'typescript',
                'shell': 'bash',
                'zsh': 'bash',
            };

            if (aliases[normalized]) return aliases[normalized];
            return /^[a-z0-9_+-]+$/.test(normalized) ? normalized : '';
        };

        const getCodeBlockLanguage = (preNode, codeNode) => {
            const classLanguage = codeNode.className.match(/language-([a-zA-Z0-9_+-]+)/)?.[1];
            if (classLanguage) {
                return normalizeCodeLanguage(classLanguage);
            }

            const labels = Array.from(preNode.querySelectorAll('div'))
                .filter(element => !element.contains(codeNode))
                .map(element => element.textContent?.trim() || '')
                .filter(text => text && text.length <= 30 && !/复制|copy/i.test(text));

            for (const label of labels) {
                const language = normalizeCodeLanguage(label);
                if (language) return language;
            }

            return '';
        };

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
                const latexSource = getFormulaSource(node);
                if (latexSource) {
                    result += '\n$$\n' + latexSource + '\n$$\n';
                }
                return;
            }

            // Handle inline formulas
            if (node.classList && node.classList.contains('katex') && !node.closest('.katex-display')) {
                const latexSource = getFormulaSource(node);
                if (latexSource) {
                    result += '$' + latexSource + '$';
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
                    let previousSignificantWasLineBreak = false;
                    for (let i = firstIdx; i <= lastIdx && i >= 0; i++) {
                        const child = childNodes[i];
                        const trimStart = (i === firstIdx) ||
                            (previousSignificantWasLineBreak && child.nodeType === Node.TEXT_NODE);
                        const trimEnd = (i === lastIdx);
                        const needTrim = (trimStart ? 'start' : '') + (trimEnd ? 'end' : '');
                        processNode(child, indent, inListItem, needTrim || false);

                        if (child.nodeType !== Node.TEXT_NODE || child.textContent.trim()) {
                            previousSignificantWasLineBreak =
                                child.nodeType === Node.ELEMENT_NODE && child.tagName === 'BR';
                        }
                    }
                } else {
                    node.childNodes.forEach(child => processNode(child, indent, inListItem, false));
                    result += '\n\n';
                }
                return;
            }

            // Handle line breaks
            if (node.tagName === 'BR') {
                if (inListItem) {
                    result += '  \n' + '   '.repeat(indent) + '  ';
                } else {
                    result += '\n';
                }
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
                                const latexSource = getFormulaSource(n);
                                if (latexSource) {
                                    cellText += '$' + latexSource + '$';
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
                // Respect the 'start' attribute for ordered lists
                let index = (isOrdered && node.hasAttribute('start')) ? parseInt(node.getAttribute('start'), 10) : 1;
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
                    const language = getCodeBlockLanguage(node, code);
                    result += '\n```' + language + '\n';
                    result += getCodeBlockText(code);
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

        markdownDivs.forEach((markdownDiv, index) => {
            if (index > 0) result += '\n\n';
            markdownDiv.childNodes.forEach(child => processNode(child, 0, false));
        });

        // Clean up excessive newlines
        result = result.replace(/\n{3,}/g, '\n\n').trim();

        return result;
    }

    function injectMdButtonToMenu(trigger) {
        // Find the Radix menu content
        const menuId = trigger.getAttribute('aria-controls');
        const menu = menuId ? document.getElementById(menuId) : null;
        const menuContents = menu ? [menu] : [];

        menuContents.forEach(menuContent => {
            // Check if already injected
            if (menuContent.querySelector('.deepshare-menu-md-button')) {
                return;
            }

            console.debug('DeepShare: Injecting Markdown button into ChatGPT More menu');

            // Create menu item element matching ChatGPT's style
            const mdButton = document.createElement('div');
            mdButton.className = 'group __menu-item gap-1.5 deepshare-menu-md-button hover:bg-token-main-surface-secondary cursor-pointer px-3 py-2 rounded-xl';
            // The new menu's timestamp also has role=menuitem, but is
            // select-text/cursor-default rather than marked aria-disabled.
            const nativeItem = Array.from(menuContent.querySelectorAll('[role="menuitem"]'))
                .find(item => !item.matches('[aria-disabled="true"], [data-disabled], .cursor-default, .select-text'));
            if (nativeItem) mdButton.className = `${nativeItem.className} deepshare-menu-md-button`;
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
                    <div class="truncate">${chrome.i18n?.getMessage('saveAsMarkdown') || 'Save as Markdown'}</div>
                </div>
            `;

            const nativeMenuIcon = nativeItem?.querySelector('svg');
            const menuIcon = mdButton.querySelector('svg');
            if (nativeMenuIcon) {
                menuIcon.setAttribute('class', nativeMenuIcon.getAttribute('class') || '');
                const { width, height } = nativeMenuIcon.getBoundingClientRect();
                menuIcon.style.width = `${width || 20}px`;
                menuIcon.style.height = `${height || 20}px`;
            }
            const nativeRow = nativeItem?.querySelector('[data-menu-row-content]');
            if (nativeRow) {
                const row = document.createElement('div');
                row.className = nativeRow.className;
                row.setAttribute('data-menu-row-content', 'true');
                const iconWrapper = mdButton.firstElementChild;
                const label = mdButton.lastElementChild;
                iconWrapper.className = nativeMenuIcon?.parentElement?.className || '';
                const nativeLabel = Array.from(nativeRow.children)
                    .find(child => child.tagName === 'SPAN' && !child.querySelector('svg'));
                label.className = nativeLabel?.className || 'min-w-0 flex-1 truncate';
                label.textContent = chrome.i18n?.getMessage('saveAsMarkdown') || 'Save as Markdown';
                row.append(iconWrapper, label);
                mdButton.replaceChildren(row);
            }
            const highlight = () => mdButton.setAttribute('data-highlighted', '');
            const unhighlight = () => mdButton.removeAttribute('data-highlighted');
            mdButton.addEventListener('mouseenter', highlight);
            mdButton.addEventListener('mouseleave', unhighlight);
            mdButton.addEventListener('focus', highlight);
            mdButton.addEventListener('blur', unhighlight);

            // Append to the end of the menu
            menuContent.append(mdButton);

            mdButton.addEventListener('keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    mdButton.click();
                }
            });

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

                // Closing through the native trigger also restores its focus.
                trigger.click();
                trigger.focus();
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
        return window.DeepShareUtils.generateFilename(content, {
            fallbackPrefix: 'chatgpt',
            contentMaxLength: 15,
            stripMarkdownHeading: true,
            allowHyphen: false
        });
    }
})();
