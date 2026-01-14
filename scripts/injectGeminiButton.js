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
        // docxButton.setAttribute('mattooltip', chrome.i18n.getMessage('docxButton') || '保存为Word');
        // docxButton.setAttribute('aria-label', chrome.i18n.getMessage('docxButton') || '保存为Word');
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
                const messageContent = getGeminiContent(sourceButton);

                if (messageContent && messageContent.trim()) {
                    console.debug('Successfully extracted content from Gemini DOM');

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
                    window.showToastNotification(chrome.i18n.getMessage('getClipboardError') || 'Content extraction failed', 'error');
                }
            } catch (error) {
                console.error('Error getting content from Gemini:', error);
                window.showToastNotification(`${chrome.i18n.getMessage('getClipboardError') || 'Error'}: ${error.message}`, 'error');
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
                <span class="mat-mdc-menu-item-text"> ${chrome.i18n.getMessage('saveAsMarkdown') || 'Save as Markdown'}</span>
                <div matripple="" class="mat-ripple mat-mdc-menu-ripple"></div>
            `;

            // 在菜单顶部插入
            targetAnchor.parentNode.prepend(mdButton);

            // 点击事件
            mdButton.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!activeMessageContainer) {
                    console.error('DeepShare: No active message container found');
                    return;
                }

                const contentElement = activeMessageContainer.querySelector('message-content .model-response-text') ||
                    activeMessageContainer.querySelector('message-content');

                if (contentElement) {
                    const markdown = extractContentWithFormulas(contentElement);
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

        const contentElement = messageContainer.querySelector('message-content .model-response-text') ||
            messageContainer.querySelector('message-content');

        if (!contentElement) {
            console.error('DeepShare: Could not find content element');
            return null;
        }

        return extractContentWithFormulas(contentElement);
    }

    /**
     * Extract content from Gemini with proper formula conversion
     * Converts KaTeX formulas to standard Markdown format
     * Simplified version without citation handling
     */
    function extractContentWithFormulas(container) {
        let result = '';
        let listDepth = 0; // Track nesting level for lists

        // Process all child nodes
        const processNode = (node, indent = '') => {
            // Skip if not a valid node
            if (!node) return;

            // Handle source footnotes - IGNORED as per request
            if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'SOURCE-FOOTNOTE') {
                return;
            }

            // Handle sources-carousel-inline - IGNORED
            if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'SOURCES-CAROUSEL-INLINE') {
                return;
            }

            // Handle response-element wrappers
            if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'RESPONSE-ELEMENT') {
                node.childNodes.forEach(n => processNode(n, indent));
                return;
            }

            // Handle block-level math formulas
            if (node.nodeType === Node.ELEMENT_NODE && node.classList && node.classList.contains('math-block')) {
                // Priority 1: Use data-math attribute
                const dataMath = node.getAttribute('data-math') ||
                    node.querySelector('.math-src')?.textContent ||
                    node.querySelector('annotation[encoding="application/x-tex"]')?.textContent;

                if (dataMath) {
                    const mathContent = dataMath.trim();
                    // For multi-line math or when indented, each line should have the indent
                    const indentedContent = indent ? mathContent.split('\n').map(line => indent + line).join('\n') : mathContent;

                    // 只有在列表缩进中且前面紧跟空格（列表标记）时，才取消换行
                    const isAfterListMarker = indent && result.endsWith(' ');
                    const prefix = isAfterListMarker ? '' : '\n' + indent;

                    result += prefix + '$$\n' + (indent ? indentedContent : mathContent) + '\n' + indent + '$$\n\n';
                    return;
                }
            }

            // Handle inline math formulas
            if (node.nodeType === Node.ELEMENT_NODE && node.classList && node.classList.contains('math-inline')) {
                // Priority 1: Use data-math attribute
                const dataMath = node.getAttribute('data-math');
                if (dataMath) {
                    result += '$' + dataMath.trim() + '$';
                    return;
                }
                // Priority 2: Try .math-src element
                const mathSrc = node.querySelector('.math-src');
                if (mathSrc && mathSrc.textContent && mathSrc.textContent.trim()) {
                    result += '$' + mathSrc.textContent.trim() + '$';
                    return;
                }
                // Priority 3: Fallback to KaTeX annotation
                const mathML = node.querySelector('annotation[encoding="application/x-tex"]');
                if (mathML && mathML.textContent) {
                    result += '$' + mathML.textContent.trim() + '$';
                    return;
                }
            }

            // Handle headings
            if (node.tagName && /^H[1-6]$/.test(node.tagName)) {
                const level = node.tagName[1];
                const headingMark = '#'.repeat(parseInt(level));
                result += '\n' + headingMark + ' ';
                node.childNodes.forEach(n => processNode(n, indent));
                result += '\n\n';
                return;
            }

            // Handle paragraphs
            if (node.tagName === 'P') {
                node.childNodes.forEach(n => processNode(n, indent));
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
                node.childNodes.forEach(n => processNode(n, indent));
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

            // Handle table footer (skip "Export to Google Sheets" button)
            if (node.nodeType === Node.ELEMENT_NODE && node.classList && node.classList.contains('table-footer')) {
                return; // Skip table footer which contains export buttons
            }

            // Handle tables
            if (node.tagName === 'TABLE') {
                result += '\n';
                const thead = node.querySelector('thead');
                const tbody = node.querySelector('tbody');

                // Helper function to extract text from a cell
                const extractCellText = (cell) => {
                    let cellText = '';
                    const processCellNode = (n) => {
                        if (!n) return;

                        // Handle math formulas in cells
                        if (n.nodeType === Node.ELEMENT_NODE && n.classList) {
                            if (n.classList.contains('math-inline')) {
                                const dataMath = n.getAttribute('data-math');
                                if (dataMath) {
                                    cellText += '$' + dataMath.trim() + '$';
                                    return;
                                }
                            }
                            if (n.classList.contains('math-block')) {
                                const dataMath = n.getAttribute('data-math');
                                if (dataMath) {
                                    cellText += '$$' + dataMath.trim() + '$$';
                                    return;
                                }
                            }
                        }

                        // Handle strong/bold
                        if (n.tagName === 'STRONG') {
                            cellText += '**';
                            n.childNodes.forEach(processCellNode);
                            cellText += '**';
                            return;
                        }

                        // Handle emphasis/italic
                        if (n.tagName === 'EM') {
                            cellText += '*';
                            n.childNodes.forEach(processCellNode);
                            cellText += '*';
                            return;
                        }

                        // Handle inline code
                        if (n.tagName === 'CODE' && !n.closest('pre')) {
                            cellText += '`' + n.textContent + '`';
                            return;
                        }

                        // Handle links
                        if (n.tagName === 'A') {
                            const href = n.getAttribute('href');
                            const text = n.textContent;
                            if (href && href !== text) {
                                cellText += '[' + text + '](' + href + ')';
                            } else {
                                cellText += text;
                            }
                            return;
                        }

                        // Handle paragraphs in cells
                        if (n.tagName === 'P') {
                            n.childNodes.forEach(processCellNode);
                            return;
                        }

                        // Handle text nodes
                        if (n.nodeType === Node.TEXT_NODE) {
                            cellText += n.textContent;
                            return;
                        }

                        // Handle other elements with children
                        if (n.childNodes && n.childNodes.length > 0) {
                            n.childNodes.forEach(processCellNode);
                        }
                    };

                    cell.childNodes.forEach(processCellNode);
                    return cellText.trim();
                };

                let headerProcessed = false;

                // Process header from thead
                if (thead) {
                    const headerRow = thead.querySelector('tr');
                    if (headerRow) {
                        // Check for both th and td elements (Gemini sometimes uses td in thead)
                        let headers = Array.from(headerRow.querySelectorAll('th'));
                        if (headers.length === 0) {
                            headers = Array.from(headerRow.querySelectorAll('td'));
                        }
                        if (headers.length > 0) {
                            const headerTexts = headers.map(cell => extractCellText(cell));
                            result += '| ' + headerTexts.join(' | ') + ' |\n';
                            result += '| ' + headerTexts.map(() => '---').join(' | ') + ' |\n';
                            headerProcessed = true;
                        }
                    }
                }

                // Process body
                if (tbody) {
                    const rows = tbody.querySelectorAll('tr');
                    rows.forEach((row, index) => {
                        // If no thead, check if first row contains th elements (header row)
                        if (!headerProcessed && index === 0) {
                            const thCells = row.querySelectorAll('th');
                            if (thCells.length > 0) {
                                const headerTexts = Array.from(thCells).map(th => extractCellText(th));
                                result += '| ' + headerTexts.join(' | ') + ' |\n';
                                result += '| ' + headerTexts.map(() => '---').join(' | ') + ' |\n';
                                headerProcessed = true;
                                return; // Skip this row, it's the header
                            }
                        }

                        // Process data cells
                        const cells = Array.from(row.querySelectorAll('td'));
                        if (cells.length > 0) {
                            const cellTexts = cells.map(td => extractCellText(td));
                            result += '| ' + cellTexts.join(' | ') + ' |\n';
                        }
                    });
                }

                result += '\n';
                return;
            }

            // Handle lists
            if (node.tagName === 'UL' || node.tagName === 'OL') {
                // Add newline before list if it's not nested (depth 0)
                if (listDepth === 0 && result.length > 0 && !result.endsWith('\n\n')) {
                    result += '\n';
                }

                const isOrdered = node.tagName === 'OL';
                const listItems = node.querySelectorAll(':scope > li');

                listDepth++;
                const listIndent = '   '.repeat(listDepth - 1); // 3 spaces per level

                listItems.forEach((li, idx) => {
                    const prefix = isOrdered ? `${idx + 1}. ` : '- ';
                    result += listIndent + prefix;

                    // Process list item content
                    let isFirstNode = true;
                    li.childNodes.forEach(childNode => {
                        // Skip nested lists for now, process them separately
                        if (childNode.tagName === 'UL' || childNode.tagName === 'OL') {
                            result += '\n';
                            processNode(childNode, listIndent + '  ');
                            return;
                        }

                        // For block elements inside list items, add proper indentation
                        if (childNode.tagName === 'P') {
                            if (!isFirstNode) {
                                result += '\n' + listIndent + '  ';
                            }
                            childNode.childNodes.forEach(n => processNode(n, listIndent + '  '));
                        } else {
                            processNode(childNode, listIndent + '  ');
                        }
                        isFirstNode = false;
                    });

                    result += '\n';
                });

                listDepth--;

                // Add newline after top-level list
                if (listDepth === 0) {
                    result += '\n';
                }
                return;
            }

            // Handle list items (when not already processed by parent UL/OL)
            if (node.tagName === 'LI') {
                node.childNodes.forEach(n => processNode(n, indent));
                return;
            }

            // Handle code blocks
            if (node.tagName === 'PRE') {
                const codeBlock = node.querySelector('code');
                let language = '';

                // Try to find language class
                if (codeBlock) {
                    const classes = Array.from(codeBlock.classList);
                    const match = classes.find(c => c.startsWith('language-'));
                    if (match) {
                        language = match.replace('language-', '');
                    }
                }

                // If not found, try to get it from the decoration header
                if (!language) {
                    const codeBar = node.previousElementSibling;
                    if (codeBar && (codeBar.classList.contains('code-block-decoration') || codeBar.getAttribute('class')?.includes('code-block-decoration'))) {
                        const langSpan = codeBar.querySelector('span:not(.mat-mdc-button-persistent-ripple)');
                        if (langSpan) {
                            language = langSpan.textContent.trim().toLowerCase();
                        }
                    }
                }

                const content = (codeBlock ? codeBlock.textContent : node.textContent).replace(/\n$/, '');
                const indentedContent = indent ? content.split('\n').map(line => indent + line).join('\n') : content;

                const isAfterListMarker = indent && result.endsWith(' ');
                const prefix = isAfterListMarker ? '' : '\n' + indent;

                result += prefix + '```' + language + '\n' + (indent ? indentedContent : content) + '\n' + indent + '```\n\n';
                return;
            }

            // Handle inline code
            if (node.tagName === 'CODE') {
                result += '`' + node.textContent + '`';
                return;
            }

            // Skip code block decoration
            if (node.nodeType === Node.ELEMENT_NODE &&
                (node.classList.contains('code-block-decoration') ||
                    node.getAttribute('class')?.includes('code-block-decoration'))) {
                return;
            }

            // Handle bold/strong
            if (node.tagName === 'B' || node.tagName === 'STRONG') {
                result += '**';
                node.childNodes.forEach(n => processNode(n, indent));
                result += '**';
                return;
            }

            // Handle italic/emphasis
            if (node.tagName === 'I' || node.tagName === 'EM') {
                result += '*';
                node.childNodes.forEach(n => processNode(n, indent));
                result += '*';
                return;
            }

            // Handle links
            if (node.tagName === 'A') {
                const href = node.getAttribute('href');
                if (href) {
                    // Check if it's a citation link (skip if it points to #ref-...)
                    if (href.startsWith('#ref-')) {
                        return;
                    }
                    result += '[';
                    node.childNodes.forEach(n => processNode(n, indent));
                    result += '](' + href + ')';
                } else {
                    node.childNodes.forEach(n => processNode(n, indent));
                }
                return;
            }

            // Handle text nodes
            if (node.nodeType === Node.TEXT_NODE) {
                result += node.textContent;
                return;
            }

            // Recursively process children
            if (node.childNodes && node.childNodes.length > 0) {
                node.childNodes.forEach(n => processNode(n, indent));
            }
        };

        // Start processing
        processNode(container);

        return result.trim();
    }
})();
