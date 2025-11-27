/**
 * DeepShare Gemini Canvas Button Injector
 * Injects a "导出为Word" button into the Gemini Canvas share menu
 */

(function() {
    'use strict';

    let lastUrl = location.href;
    console.debug('DeepShare: Initializing Canvas DOCX button injection for Gemini');

    // 监听分享按钮的点击，等待菜单弹出
    function attachShareButtonListener() {
        // 查找Canvas界面中的分享按钮
        const shareButtons = document.querySelectorAll('share-button[data-test-id="consolidated-share-button"] button[data-test-id="share-button"]');
        
        shareButtons.forEach(shareButton => {
            if (!shareButton.dataset.deepshareListenerAttached) {
                shareButton.dataset.deepshareListenerAttached = 'true';
                
                shareButton.addEventListener('click', () => {
                    console.debug('DeepShare: Share button clicked, waiting for menu...');
                    // 等待菜单加载
                    setTimeout(() => {
                        injectDocxButtonToMenu();
                    }, 100);
                });
            }
        });
    }

    function injectDocxButtonToMenu() {
        // 查找弹出的菜单内容
        const menuContents = document.querySelectorAll('.mat-mdc-menu-panel .mat-mdc-menu-content');
        
        menuContents.forEach(menuContent => {
            // 检查是否已经注入过按钮
            if (menuContent.querySelector('.deepshare-canvas-docx-button') || 
                menuContent.querySelector('.deepshare-canvas-md-button')) {
                console.debug('DeepShare: Buttons already exist in menu');
                return;
            }

            // 首先检查是否存在"导出到 Google 文档"按钮
            const exportToDocsButton = menuContent.querySelector('button[data-test-id="export-to-docs-button"]');
            
            if (!exportToDocsButton) {
                console.debug('DeepShare: Export to Google Docs button not found, skipping injection');
                return;
            }

            // 查找复制按钮，我们将在它后面插入
            const copyButton = menuContent.querySelector('copy-button');
            
            if (!copyButton) {
                console.debug('DeepShare: Copy button not found in menu');
                return;
            }

            console.debug('DeepShare: Injecting DOCX button into Canvas menu');

            // 创建导出为Word按钮的容器
            const docxButtonWrapper = document.createElement('deepshare-docx-button');
            docxButtonWrapper.className = 'deepshare-canvas-docx-button ng-star-inserted';
            docxButtonWrapper.setAttribute('data-test-id', 'deepshare-docx-button');
            docxButtonWrapper.setAttribute('aria-label', chrome.i18n.getMessage('docxButton') || '导出为 Word');

            // 创建按钮元素
            const docxButton = document.createElement('button');
            docxButton.className = 'mat-mdc-menu-item mat-focus-indicator menu-item-button';
            docxButton.setAttribute('mat-menu-item', '');
            docxButton.setAttribute('role', 'menuitem');
            docxButton.setAttribute('tabindex', '0');
            docxButton.setAttribute('aria-disabled', 'false');

            // 创建按钮内容
            docxButton.innerHTML = `
                <mat-icon role="img" data-test-id="docx-icon" fonticon="description" class="mat-icon notranslate google-symbols mat-ligature-font mat-icon-no-color" aria-hidden="true" data-mat-icon-type="font" data-mat-icon-name="description">
                    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style="width: 20px; height: 20px;">
                        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                    </svg>
                </mat-icon>
                <span class="mat-mdc-menu-item-text"> ${chrome.i18n.getMessage('docxButton') || 'Save as Word'}</span>
                <div matripple="" class="mat-ripple mat-mdc-menu-ripple"></div>
            `;

            docxButtonWrapper.appendChild(docxButton);

            // 创建保存为Markdown按钮的容器
            const mdButtonWrapper = document.createElement('deepshare-md-button');
            mdButtonWrapper.className = 'deepshare-canvas-md-button ng-star-inserted';
            mdButtonWrapper.setAttribute('data-test-id', 'deepshare-md-button');
            mdButtonWrapper.setAttribute('aria-label', chrome.i18n.getMessage('saveAsMarkdown') || 'Save as Markdown');

            // 创建Markdown按钮元素
            const mdButton = document.createElement('button');
            mdButton.className = 'mat-mdc-menu-item mat-focus-indicator menu-item-button';
            mdButton.setAttribute('mat-menu-item', '');
            mdButton.setAttribute('role', 'menuitem');
            mdButton.setAttribute('tabindex', '0');
            mdButton.setAttribute('aria-disabled', 'false');

            // 创建Markdown按钮内容
            mdButton.innerHTML = `
                <mat-icon role="img" data-test-id="md-icon" fonticon="file_download" class="mat-icon notranslate google-symbols mat-ligature-font mat-icon-no-color" aria-hidden="true" data-mat-icon-type="font" data-mat-icon-name="file_download">
                    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style="width: 20px; height: 20px;">
                        <path d="M20.56 18H3.44C2.65 18 2 17.37 2 16.59V7.41C2 6.63 2.65 6 3.44 6H20.56C21.35 6 22 6.63 22 7.41V16.59C22 17.37 21.35 18 20.56 18M6.81 15.19V11.53L8.73 13.88L10.65 11.53V15.19H12.58V8.81H10.65L8.73 11.16L6.81 8.81H4.89V15.19H6.81M19.69 12H17.77V8.81H15.85V12H13.92L16.81 15.28L19.69 12Z"/>
                    </svg>
                </mat-icon>
                <span class="mat-mdc-menu-item-text"> ${chrome.i18n.getMessage('saveAsMarkdown') || 'Save as Markdown'}</span>
                <div matripple="" class="mat-ripple mat-mdc-menu-ripple"></div>
            `;

            mdButtonWrapper.appendChild(mdButton);

            // 在复制按钮后面插入两个按钮
            copyButton.parentNode.insertBefore(docxButtonWrapper, copyButton.nextSibling);
            copyButton.parentNode.insertBefore(mdButtonWrapper, docxButtonWrapper.nextSibling);

            // 添加点击事件
            docxButton.addEventListener('click', async (e) => {
                e.stopPropagation();
                e.preventDefault();
                
                try {
                    console.debug('DeepShare: Canvas DOCX button clicked');

                    // 禁用按钮
                    docxButton.setAttribute('disabled', 'true');
                    docxButton.style.opacity = '0.6';

                    // 获取Canvas内容
                    const canvasContent = await getCanvasContent();

                    if (canvasContent && canvasContent.trim()) {
                        console.debug('DeepShare: Successfully got Canvas content');
                        
                        const conversationData = {
                            role: 'assistant',
                            content: canvasContent,
                        };

                        // 触发转换为DOCX的事件
                        const event = new CustomEvent('deepshare:convertToDocx', {
                            detail: {
                                messages: conversationData,
                                sourceButton: docxButton,
                            },
                        });
                        document.dispatchEvent(event);

                        // 关闭菜单
                        setTimeout(() => {
                            const backdrop = document.querySelector('.cdk-overlay-backdrop');
                            if (backdrop) {
                                backdrop.click();
                            }
                        }, 100);
                    } else {
                        console.warn('DeepShare: Canvas content was empty');
                        window.showToastNotification(chrome.i18n.getMessage('getClipboardError') || '无法获取内容', 'error');
                    }
                } catch (error) {
                    console.error('DeepShare: Error getting Canvas content:', error);
                    window.showToastNotification(`${chrome.i18n.getMessage('getClipboardError') || '获取内容失败'}: ${error.message}`, 'error');
                } finally {
                    // 重新启用按钮
                    docxButton.removeAttribute('disabled');
                    docxButton.style.opacity = '1';
                }
            });

            // 添加Markdown按钮点击事件
            mdButton.addEventListener('click', async (e) => {
                e.stopPropagation();
                e.preventDefault();
                
                try {
                    console.debug('DeepShare: Canvas Markdown button clicked');

                    // 禁用按钮
                    mdButton.setAttribute('disabled', 'true');
                    mdButton.style.opacity = '0.6';

                    // 获取Canvas内容
                    const canvasContent = await getCanvasContent();

                    if (canvasContent && canvasContent.trim()) {
                        console.debug('DeepShare: Successfully got Canvas content for Markdown');
                        
                        // 直接下载为 Markdown 文件
                        downloadMarkdownFile(canvasContent);

                        // 关闭菜单
                        setTimeout(() => {
                            const backdrop = document.querySelector('.cdk-overlay-backdrop');
                            if (backdrop) {
                                backdrop.click();
                            }
                        }, 100);
                    } else {
                        console.warn('DeepShare: Canvas content was empty');
                        window.showToastNotification(chrome.i18n.getMessage('getClipboardError') || '无法获取内容', 'error');
                    }
                } catch (error) {
                    console.error('DeepShare: Error getting Canvas content:', error);
                    window.showToastNotification(`${chrome.i18n.getMessage('getClipboardError') || '获取内容失败'}: ${error.message}`, 'error');
                } finally {
                    // 重新启用按钮
                    mdButton.removeAttribute('disabled');
                    mdButton.style.opacity = '1';
                }
            });

            console.debug('DeepShare: Canvas DOCX and Markdown buttons successfully injected into menu');
        });
    }

    /**
     * 下载 Markdown 文件
     */
    function downloadMarkdownFile(content) {
        const filename = generateFilename(content) + '.md';
        
        // 创建 Blob 对象
        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
        
        // 创建下载链接
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        
        // 触发下载
        document.body.appendChild(link);
        link.click();
        
        // 清理
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        console.debug(`DeepShare: Markdown file downloaded as ${filename}`);
    }

    /**
     * 生成文件名
     * 基于内容的第一行和本地时间戳生成文件名
     */
    function generateFilename(content) {
        // 获取本地时区时间戳
        function getLocalTimestamp() {
            const now = new Date();
            const options = {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit',
                hour12: false
            };
            const localTime = now.toLocaleString('zh-CN', options)
                .replace(/[\/\s:]/g, '-')
                .replace(',', '');
            return localTime;
        }

        // 默认文件名
        if (!content || typeof content !== 'string') {
            const timestamp = getLocalTimestamp();
            return `document_${timestamp}`;
        }

        // 提取第一行作为文件名
        const firstLine = content.split('\n')[0] || '';
        let filename = firstLine.trim();

        // 截取前10个字符
        filename = filename.substring(0, 10).trim();

        // 移除文件名中不允许的特殊字符，保留中文和字母数字
        filename = filename.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '');

        // 如果清理后为空，使用默认名
        if (!filename) {
            filename = 'document';
        }

        // 添加本地时区时间戳
        const timestamp = getLocalTimestamp();
        return `${filename}_${timestamp}`;
    }

    async function getCanvasContent() {
        // 从Canvas编辑器中解析Markdown内容
        const editorElement = document.querySelector('#extended-response-markdown-content');
        
        if (!editorElement) {
            throw new Error('无法找到Canvas编辑器');
        }
        
        console.debug('DeepShare: Extracting content from Canvas DOM');
        
        // 获取导出来源的设置
        const settings = await new Promise(resolve => {
            chrome.storage.sync.get({ exportGeminiSources: true }, resolve);
        });
        const shouldExportSources = settings.exportGeminiSources;
        
        // 先构建来源索引映射
        const sourceIndexMap = shouldExportSources ? buildSourceIndexMap() : new Map();
        
        let content = extractContentWithFormulas(editorElement, sourceIndexMap);
        
        // 根据设置决定是否提取并附加深度研究来源
        if (shouldExportSources) {
            const sources = extractDeepResearchSources(sourceIndexMap);
            if (sources) {
                content += sources;
            }
        }
        
        return content;
    }

    /**
     * 构建来源索引映射
     * Build a mapping from turn-source-index to source info
     * data-turn-source-index 从 1 开始，直接对应来源列表的顺序
     */
    function buildSourceIndexMap() {
        const sourceMap = new Map();
        const sourceListContainer = document.querySelector('deep-research-source-lists');
        if (!sourceListContainer) {
            return sourceMap;
        }

        const usedSourcesDiv = sourceListContainer.querySelector('.source-list.used-sources');
        if (!usedSourcesDiv) {
            return sourceMap;
        }

        // 获取所有来源项，按顺序对应 data-turn-source-index（从1开始）
        const items = usedSourcesDiv.querySelectorAll('browse-web-item');
        
        items.forEach((item, index) => {
            const linkEl = item.querySelector('a[href]');
            if (!linkEl) return;
            
            const url = linkEl.getAttribute('href');
            if (!url) return;
            
            const domainEl = item.querySelector('.display-name');
            const titleEl = item.querySelector('.sub-title');
            
            // data-turn-source-index 从 1 开始，所以用 index + 1 作为 key
            const sourceIndex = index + 1;
            sourceMap.set(sourceIndex, {
                displayIndex: sourceIndex,
                url: url,
                domain: domainEl ? domainEl.textContent.trim() : '',
                title: titleEl ? titleEl.textContent.trim() : ''
            });
        });
        
        return sourceMap;
    }

    /**
     * 提取 Gemini 深度研究报告中使用的来源
     * Extract sources from Gemini deep research report
     */
    function extractDeepResearchSources(sourceIndexMap) {
        const sourceListContainer = document.querySelector('deep-research-source-lists');
        if (!sourceListContainer) {
            console.debug('DeepShare: No deep research sources found');
            return null;
        }

        let result = '';
        
        // 查找"报告中使用的来源"区域
        const usedSourcesDiv = sourceListContainer.querySelector('.source-list.used-sources');
        if (usedSourcesDiv && sourceIndexMap && sourceIndexMap.size > 0) {
            const referenceTitle = chrome.i18n.getMessage('referenceSources') || 'References';
            result += `\n\n### ${referenceTitle}\n\n`;
            // 使用 sourceIndexMap 中的来源，按 displayIndex 排序
            const sortedSources = Array.from(sourceIndexMap.values())
                .sort((a, b) => a.displayIndex - b.displayIndex);
            
            sortedSources.forEach(source => {
                // 添加锚点 ID，用于文内引用跳转
                // 使用尖括号包裹 URL 以处理 URL 中可能包含的括号
                result += `<a id="ref-${source.displayIndex}"></a>${source.displayIndex}. [${source.title || source.domain}](<${source.url}>)`;
                if (source.title && source.domain) {
                    result += ` - *${source.domain}*`;
                }
                result += '\n\n';
            });
        }

        // 查找"已查阅但未在报告中使用的来源"区域（可选）
        const unusedSourcesDiv = sourceListContainer.querySelector('.source-list.unused-sources');
        if (unusedSourcesDiv) {
            const unusedSources = extractSourcesFromList(unusedSourcesDiv);
            if (unusedSources.length > 0) {
                const unusedTitle = chrome.i18n.getMessage('unusedSources') || 'Sources Reviewed but Not Used';
                result += `\n### ${unusedTitle}\n\n`;
                unusedSources.forEach((source, index) => {
                    // 使用尖括号包裹 URL 以处理 URL 中可能包含的括号
                    result += `${index + 1}. [${source.title || source.domain}](<${source.url}>)`;
                    if (source.title && source.domain) {
                        result += ` - *${source.domain}*`;
                    }
                    result += '\n';
                });
            }
        }

        if (result) {
            console.debug('DeepShare: Successfully extracted deep research sources');
        }
        
        return result;
    }

    /**
     * 从来源列表中提取链接信息
     */
    function extractSourcesFromList(listElement) {
        const sources = [];
        const items = listElement.querySelectorAll('browse-web-item a[href]');
        
        items.forEach(item => {
            const url = item.getAttribute('href');
            if (!url) return;
            
            // 跳过包含片段标识符的重复链接 (如 #:~:text=...)
            if (url.includes('#:~:text=')) return;
            
            const domainEl = item.querySelector('.display-name');
            const titleEl = item.querySelector('.sub-title');
            
            const domain = domainEl ? domainEl.textContent.trim() : '';
            const title = titleEl ? titleEl.textContent.trim() : '';
            
            // 避免重复添加相同URL
            if (!sources.some(s => s.url === url)) {
                sources.push({
                    url: url,
                    domain: domain,
                    title: title
                });
            }
        });
        
        return sources;
    }

    /**
     * Extract content from Gemini Canvas with proper formula conversion
     * Converts KaTeX formulas to standard Markdown format
     */
    function extractContentWithFormulas(container, sourceIndexMap = new Map()) {
        let result = '';
        let listDepth = 0; // Track nesting level for lists

        // Process all child nodes
        const processNode = (node, indent = '') => {
            // Skip if not a valid node
            if (!node) return;

            // Handle source footnotes (引用上标)
            if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'SOURCE-FOOTNOTE') {
                const supElement = node.querySelector('sup[data-turn-source-index]');
                if (supElement) {
                    const turnIndex = parseInt(supElement.getAttribute('data-turn-source-index'), 10);
                    const sourceInfo = sourceIndexMap.get(turnIndex);
                    if (sourceInfo) {
                        // 插入可点击的上标链接
                        result += `<sup>[[${sourceInfo.displayIndex}]](#ref-${sourceInfo.displayIndex})</sup>`;
                    } else {
                        // 如果找不到映射，直接使用 turnIndex（已经是从1开始）
                        result += `<sup>[${turnIndex}]</sup>`;
                    }
                }
                return;
            }

            // Handle sources-carousel-inline (跳过来源轮播)
            if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'SOURCES-CAROUSEL-INLINE') {
                return; // 跳过这个元素
            }

            // Handle response-element wrappers (处理响应元素包装器)
            if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'RESPONSE-ELEMENT') {
                node.childNodes.forEach(n => processNode(n, indent));
                return;
            }

            // Handle block-level math formulas
            if (node.nodeType === Node.ELEMENT_NODE && node.classList && node.classList.contains('math-block')) {
                // Priority 1: Use data-math attribute
                const dataMath = node.getAttribute('data-math');
                if (dataMath) {
                    // If in a list, add indent to the markers, but not the formula content
                    if (indent) {
                        result += '\n' + indent + '$$\n' + dataMath.trim() + '\n' + indent + '$$\n\n';
                    } else {
                        result += '\n$$\n' + dataMath.trim() + '\n$$\n\n';
                    }
                    return;
                }
                // Priority 2: Try .math-src element
                const mathSrc = node.querySelector('.math-src');
                if (mathSrc && mathSrc.textContent && mathSrc.textContent.trim()) {
                    if (indent) {
                        result += '\n' + indent + '$$\n' + mathSrc.textContent.trim() + '\n' + indent + '$$\n\n';
                    } else {
                        result += '\n$$\n' + mathSrc.textContent.trim() + '\n$$\n\n';
                    }
                    return;
                }
                // Priority 3: Fallback to KaTeX annotation
                const mathML = node.querySelector('annotation[encoding="application/x-tex"]');
                if (mathML && mathML.textContent) {
                    if (indent) {
                        result += '\n' + indent + '$$\n' + mathML.textContent.trim() + '\n' + indent + '$$\n\n';
                    } else {
                        result += '\n$$\n' + mathML.textContent.trim() + '\n$$\n\n';
                    }
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

            // Handle images
            if (node.tagName === 'IMG') {
                const src = node.getAttribute('src');
                const alt = node.getAttribute('alt') || '';
                result += '![' + alt + '](' + src + ')';
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

        container.childNodes.forEach(processNode);

        // Clean up excessive newlines
        result = result.replace(/\n{3,}/g, '\n\n').trim();

        return result;
    }

    // MutationObserver 监听DOM变化
    const observer = new MutationObserver(() => {
        // 检查分享按钮
        attachShareButtonListener();
        
        // 检查菜单是否已打开
        const openMenus = document.querySelectorAll('.mat-mdc-menu-panel .mat-mdc-menu-content');
        if (openMenus.length > 0) {
            injectDocxButtonToMenu();
        }

        // 检查URL变化
        const currentUrl = location.href;
        if (currentUrl !== lastUrl) {
            console.debug(`DeepShare: URL changed to ${currentUrl}`);
            lastUrl = currentUrl;
            setTimeout(() => {
                attachShareButtonListener();
            }, 500);
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });

    // 初始检查
    setTimeout(() => {
        attachShareButtonListener();
    }, 1000);

    console.debug('DeepShare: Canvas button injector initialized');
})();

