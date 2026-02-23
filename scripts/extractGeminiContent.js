/**
 * DeepShare Gemini Content Extractor
 * Extracts content from Gemini with proper formula conversion
 * Shared by multiple Gemini UI injection scripts
 */
window.extractGeminiContentWithFormulas = function (container) {
    let result = '';
    let listDepth = 0; // Track nesting level for lists

    // Helper to check if a node is empty or only contains Gemini markers/citations
    const isEmptyOrMarkerOnly = (node) => {
        if (!node) return true;
        if (node.nodeType === Node.TEXT_NODE) return !node.textContent.trim();
        if (node.nodeType !== Node.ELEMENT_NODE) return true;

        // Skip specific Gemini internal tags
        const skipTags = ['SOURCE-FOOTNOTE', 'SOURCES-CAROUSEL-INLINE', 'BR'];
        if (skipTags.includes(node.tagName)) return true;

        // Check if it's a paragraph or span that only contains markers or whitespace
        if (node.tagName === 'P' || node.tagName === 'SPAN') {
            return Array.from(node.childNodes).every(isEmptyOrMarkerOnly);
        }

        return false;
    };

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
                let contentWritten = false;
                li.childNodes.forEach(childNode => {
                    // Skip nested lists for now, process them separately
                    if (childNode.tagName === 'UL' || childNode.tagName === 'OL') {
                        if (contentWritten) result += '\n';
                        processNode(childNode, listIndent + '  ');
                        return;
                    }

                    // For block elements inside list items, add proper indentation
                    if (childNode.tagName === 'P') {
                        if (isEmptyOrMarkerOnly(childNode)) {
                            // Just process the nodes without adding block structure if it's empty/markers
                            childNode.childNodes.forEach(n => processNode(n, listIndent + '  '));
                            return;
                        }

                        if (contentWritten) {
                            result += '\n' + listIndent + '  ';
                        }
                        childNode.childNodes.forEach(n => processNode(n, listIndent + '  '));
                        contentWritten = true;
                    } else {
                        if (!isEmptyOrMarkerOnly(childNode)) {
                            contentWritten = true;
                        }
                        processNode(childNode, listIndent + '  ');
                    }
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
};
