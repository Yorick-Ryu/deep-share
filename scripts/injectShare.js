// Inject share
function injectShare(onClickHandler) {
    // 检查是否在对话页面
    if (!location.pathname.includes('/chat/')) return;

    // 清理旧的元素
    document.querySelector('.deepseek-share-modal')?.remove();
    const existingBtn = document.querySelector('.deepseek-share-btn');
    if (existingBtn) {
        existingBtn.remove();
    }

    // 更新modal内容 - 在 modal-header 中添加设置按钮
    const modal = document.createElement('div');
    modal.className = 'deepseek-share-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${chrome.i18n.getMessage('modalTitle')}</h3>
                <div class="header-buttons">
                    <button class="header-btn settings-btn" title="${chrome.i18n.getMessage('settingsButton')}">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" stroke-width="2"/>
                            <path d="M19.4 15C19.1277 15.6171 19.2583 16.3378 19.73 16.82L19.79 16.88C20.1656 17.2551 20.3766 17.7642 20.3766 18.295C20.3766 18.8258 20.1656 19.3349 19.79 19.71C19.4149 20.0856 18.9058 20.2966 18.375 20.2966C17.8442 20.2966 17.3351 20.0856 16.96 19.71L16.9 19.65C16.4178 19.1783 15.6971 19.0477 15.08 19.32C14.4785 19.5855 14.0951 20.1672 14.09 20.82V21C14.09 22.1046 13.1946 23 12.09 23C10.9854 23 10.09 22.1046 10.09 21V20.91C10.0766 20.2309 9.66814 19.6353 9.02999 19.37C8.41285 19.0977 7.69218 19.2283 7.20999 19.7L7.14999 19.76C6.77488 20.1356 6.26575 20.3466 5.73499 20.3466C5.20422 20.3466 4.69509 20.1356 4.31999 19.76C3.94437 19.3849 3.73338 18.8758 3.73338 18.345C3.73338 17.8142 3.94437 17.3051 4.31999 16.93L4.37999 16.87C4.85167 16.3878 4.98231 15.6671 4.70999 15.05C4.44447 14.4485 3.86279 14.0651 3.20999 14.06H2.99999C1.89542 14.06 0.999992 13.1646 0.999992 12.06C0.999992 10.9554 1.89542 10.06 2.99999 10.06H3.08999C3.76908 10.0466 4.36469 9.63819 4.62999 9C4.90231 8.38285 4.77167 7.66218 4.29999 7.18L4.23999 7.12C3.86437 6.74488 3.65338 6.23575 3.65338 5.70499C3.65338 5.17422 3.86437 4.66509 4.23999 4.28999C4.61509 3.91437 5.12422 3.70338 5.65499 3.70338C6.18575 3.70338 6.69488 3.91437 7.06999 4.28999L7.12999 4.34999C7.61218 4.82167 8.33285 4.95231 8.94999 4.67999H8.99999C9.60154 4.41447 9.98491 3.83279 9.98999 3.17999V2.99999C9.98999 1.89542 10.8854 0.999992 11.99 0.999992C13.0946 0.999992 13.99 1.89542 13.99 2.99999V3.08999C13.9951 3.74279 14.3785 4.32447 14.98 4.58999C15.5971 4.86231 16.3178 4.73167 16.8 4.25999L16.86 4.19999C17.2351 3.82437 17.7442 3.61338 18.275 3.61338C18.8058 3.61338 19.3149 3.82437 19.69 4.19999C20.0656 4.57509 20.2766 5.08422 20.2766 5.61499C20.2766 6.14575 20.0656 6.65488 19.69 7.02999L19.63 7.08999C19.1583 7.57218 19.0277 8.29285 19.3 8.90999V8.99999C19.5655 9.60154 20.1472 9.98491 20.8 9.98999H21C22.1046 9.98999 23 10.8854 23 11.99C23 13.0946 22.1046 13.99 21 13.99H20.91C20.2572 13.9951 19.6755 14.3785 19.41 14.98L19.4 15Z" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </button>
                    <button class="header-btn close-btn" title="${chrome.i18n.getMessage('closeButton')}">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="modal-body">
                <div class="tab-header">
                    <div class="tab-container">
                        <button class="tab-btn active" data-tab="image">${chrome.i18n.getMessage('imageTab')}</button>
                        <button class="tab-btn" data-tab="text">${chrome.i18n.getMessage('textTab')}</button>
                    </div>
                    <div class="action-buttons">
                        <div class="format-dropdown-container">
                            <select class="format-select" title="${chrome.i18n.getMessage('formatSelect') || '选择格式'}">
                                <option value="docx" selected>Word(Docx)</option>
                                <option value="md">Markdown</option>
                                <option value="txt">TXT</option>
                            </select>
                        </div>
                        <button class="download-btn">${chrome.i18n.getMessage('downloadButton')}</button>
                        <button class="copy-btn">${chrome.i18n.getMessage('copyButton')}</button>
                    </div>
                </div>
                <div class="tab-panels">
                    <div class="tab-panel active" id="image-panel">
                        <div class="image-container">
                            <div class="image-loading">${chrome.i18n.getMessage('generatingImage')}</div>
                            <img id="conversation-image" style="display: none" alt="对话截图">
                        </div>
                    </div>
                    <div class="tab-panel" id="text-panel">
                        <pre id="conversation-content"></pre>
                    </div>
                    <div class="tab-panel" id="word-panel">
                        <div class="word-info">
                            <p>${chrome.i18n.getMessage('wordExportInfo') || '点击下载或复制按钮将仅导出AI回答内容为Word文档'}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Close button handler
    modal.querySelector('.close-btn').addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // 添加点击外部关闭功能
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // 绑定标签切换事件
    const tabs = modal.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', async () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const panels = modal.querySelectorAll('.tab-panel');
            panels.forEach(p => p.classList.remove('active'));

            const targetPanel = modal.querySelector(`#${tab.dataset.tab}-panel`);
            targetPanel.classList.add('active');

            // 控制格式选择器的显示/隐藏
            const formatDropdown = modal.querySelector('.format-dropdown-container');
            if (tab.dataset.tab === 'text') {
                // 切换到文本标签时渲染文本内容和显示格式选择器
                formatDropdown.style.display = 'inline-block';
                const contentArea = modal.querySelector('#conversation-content');
                contentArea.textContent = formatAsText(messages);
            } else {
                // 其它标签隐藏格式选择器
                formatDropdown.style.display = 'none';

                if (tab.dataset.tab === 'image') {
                    const img = modal.querySelector('#conversation-image');
                    const loadingEl = modal.querySelector('.image-loading');
                    img.style.display = 'none';
                    loadingEl.style.display = 'block';

                    try {
                        if (typeof window.captureMessages !== 'function') {
                            throw new Error('Screenshot function not available');
                        }

                        const imageUrl = await window.captureMessages();
                        if (imageUrl) {
                            img.onload = () => {
                                img.style.display = 'block';
                                loadingEl.style.display = 'none';
                            };
                            img.src = imageUrl;
                        } else {
                            throw new Error('Failed to generate image');
                        }
                    } catch (error) {
                        console.error('Screenshot failed:', error);
                        loadingEl.textContent = chrome.i18n.getMessage('generateFailed');
                    }
                }
            }
        });
    });

    // 下载按钮事件
    const downloadBtn = modal.querySelector('.download-btn');
    downloadBtn.addEventListener('click', () => {
        const activeTab = modal.querySelector('.tab-btn.active').dataset.tab;
        const link = document.createElement('a');

        const aiResponses = messages.filter(msg => msg.role === 'assistant');
        const firstAiResponse = aiResponses[0].content

        if (activeTab === 'image') {
            const img = modal.querySelector('#conversation-image');
            // 对于图片也使用一致的命名规则，从消息内容生成文件名
            link.download = generateConsistentFilename(firstAiResponse, '.png');
            link.href = img.src;
            link.click();
        } else if (activeTab === 'text') {
            const formatSelect = modal.querySelector('.format-select');
            const selectedFormat = formatSelect.value;
            const text = formatAsText(messages);

            if (selectedFormat === 'docx') {
                
                if (aiResponses.length === 0) {
                    window.showToastNotification(chrome.i18n.getMessage('noAiResponses') || '没有找到AI回答内容', 'error');
                    return;
                }

                // 合并AI回答内容
                const aiText = aiResponses.map(msg => msg.content).join('\n\n');

                // 触发Word转换
                const event = new CustomEvent('deepshare:convertToDocx', {
                    detail: {
                        messages: {
                            role: 'assistant',
                            content: aiText
                        },
                        sourceButton: downloadBtn // 传递按钮引用以处理加载状态
                    }
                });
                document.dispatchEvent(event);
            } else if (selectedFormat === 'md') {
                // 导出为Markdown格式
                const blob = new Blob([text], { type: 'text/markdown' });
                link.download = generateConsistentFilename(firstAiResponse, '.md');
                link.href = URL.createObjectURL(blob);
                link.click();
                // 清理
                URL.revokeObjectURL(link.href);
            } else { // txt或默认格式
                const blob = new Blob([text], { type: 'text/plain' });
                link.download = generateConsistentFilename(firstAiResponse, '.txt');
                link.href = URL.createObjectURL(blob);
                link.click();
                // 清理
                URL.revokeObjectURL(link.href);
            }
        }
    });

    // 复制按钮事件
    const copyBtn = modal.querySelector('.copy-btn');
    copyBtn.addEventListener('click', async () => {
        const activeTab = modal.querySelector('.tab-btn.active').dataset.tab;
        const originalText = copyBtn.textContent;

        try {
            if (activeTab === 'text') {
                const text = formatAsText(messages);
                // 对于markdown和txt格式，直接复制文本
                await navigator.clipboard.writeText(text);
                
            } else if (activeTab === 'image') {
                const img = modal.querySelector('#conversation-image');
                if (img.src) {
                    const blob = await fetch(img.src).then(r => r.blob());
                    await navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': blob })
                    ]);
                } else {
                    throw new Error('Image not ready');
                }
            }

            copyBtn.textContent = chrome.i18n.getMessage('copied');
            setTimeout(() => {
                copyBtn.textContent = originalText;
            }, 2000);
        } catch (error) {
            console.error('Copy failed:', error);
            copyBtn.textContent = chrome.i18n.getMessage('copyFailed');
            setTimeout(() => {
                copyBtn.textContent = originalText;
            }, 2000);
        }
    });

    // 添加设置按钮点击事件
    modal.querySelector('.settings-btn').addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'openPopup' });
    });

    // 将 isAllSelected 变量移到外层作用域
    let isAllSelected = false;

    // 重新组织按钮注入逻辑为独立函数
    function injectButton() {
        const buttonTitle = chrome.i18n.getMessage('shareButton');
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'deepseek-share-btn';

        buttonContainer.innerHTML = `
            <button class="select-all-btn" style="display: none;">
                ${chrome.i18n.getMessage('selectAllButton')}
            </button>
            <button class="select-all-responses-btn" style="display: none;">
                ${chrome.i18n.getMessage('selectAllResponsesButton')}
            </button>
            <button title="${chrome.i18n.getMessage('selectButton')}" class="select-button">
                <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
                    <path d="M855.9 63.5H171.7c-54.8 0-99.8 43.3-102.5 97.4v694.5c2.7 54.1 47.7 97.4 102.5 97.4h684.2c56.5 0 102.6-46.1 102.6-102.6V166.1c0-56.5-46-102.6-102.6-102.6z m34.2 786.8c0 18.9-15.3 34.1-34.2 34.2H171.7c-18.8 0-34.2-15.3-34.2-34.2V166.1c0.1-18.8 15.3-34.1 34.2-34.2h684.2c18.9 0 34.1 15.3 34.2 34.2v684.2z" fill="currentColor"/>
                    <path d="M442.8 323.1h342.9c19.8 0 30.8-11.7 30.8-32.9s-10.9-32.9-30.8-32.9H442.8c-19.8 0-30.8 11.7-30.8 32.9s11 32.9 30.8 32.9zM785.7 480.7H442.8c-19.8 0-30.8 11.7-30.8 32.9s10.9 32.9 30.8 32.9h342.9c19.8 0 30.8-11.7 30.8-32.9s-11-32.9-30.8-32.9zM780.2 704.2H442.4c-19.6 0-30.4 11.7-30.4 32.9s10.8 32.9 30.4 32.9h337.8c19.6 0 30.4-11.7 30.4-32.9s-10.8-32.9-30.4-32.9zM363.5 446.5v3.5-3.5c-7 0-13.8 2.6-18.7 7.3L275 520.2l-31.7-30.4c-4.9-4.7-11.7-7.4-18.6-7.5-10.7 0-20.3 6.1-24.4 15.6-1 2.4-1.7 4.9-1.9 7.5v4.4c0.5 6.1 3.3 11.7 7.8 16l50.4 48c4.9 4.7 11.6 7.4 18.6 7.4 6.9 0 13.7-2.7 18.5-7.4l88.4-84.2c4.9-4.8 7.6-11.2 7.6-17.9 0-6.7-2.7-13.1-7.7-17.9-4.9-4.6-11.6-7.3-18.5-7.3zM363.4 219.6c-6.9 0-13.7 2.7-18.6 7.4L275 293.4 243.3 263c-5-4.8-11.6-7.4-18.6-7.4-10.7 0-20.2 6.1-24.3 15.6-1.3 2.9-2 6-2 9.3v0.1c-0.1 6.9 2.7 13.6 7.8 18.4l50.5 48.1c4.9 4.7 11.5 7.3 18.4 7.3h0.1c6.9 0 13.6-2.7 18.4-7.4l88.5-84.2c5-4.8 7.7-11.2 7.7-18 0-6.8-2.7-13.2-7.7-18-5.1-4.6-11.7-7.2-18.7-7.2zM363.4 658.7c-6.9 0-13.7 2.7-18.6 7.4L275 732.5l-31.7-30.4c-5-4.7-11.5-7.3-18.5-7.3h-0.2c-6.9 0-13.6 2.7-18.5 7.3-5 4.7-7.8 11.1-7.8 17.9v0.3c0.1 6.7 2.8 13.1 7.8 17.8l50.5 48.1c5 4.7 11.5 7.3 18.5 7.3s13.6-2.6 18.5-7.3l88.4-84.4c4.9-4.8 7.6-11.2 7.6-17.9 0-6.7-2.7-13.1-7.7-17.9-4.9-4.6-11.5-7.3-18.5-7.3z" fill="currentColor"/>
                </svg>
            </button>
            <button title="${buttonTitle}" class="share-button">
                <svg width="24" height="24" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
                    <path d="M911.6 651.6l0 209.2c0 36-30.4 66.2-66.2 66.2l-699.6 1.2c-35.8 0-65-29.2-65-65.2l1.2-699.6c0-35.8 30.4-66.2 66.2-66.2l387 0L535.2 20.2 148.2 20.2c-81.8 0-143 82.8-143 156.8l0 686c0 77.6 63 140.8 140.8 140.8l686 0c82 0 156.6-68.2 156.6-143L988.6 651.6 911.6 651.6 911.6 651.6zM730.2 60.8l288.6 289.2L730.2 639l0-165.2c0 0-286.4-31.8-453.6 206.6 0 0 52.6-454.4 453.6-454.4L730.2 60.8 730.2 60.8z" fill="currentColor"/>
                </svg>
            </button>
        `;

        const targetElement = document.querySelector('.f8d1e4c0');
        if (targetElement) {
            // 移除旧的按钮
            document.querySelector('.deepseek-share-btn')?.remove();

            // 视图保持不变
            targetElement.appendChild(buttonContainer);

            // 绑定点击事件
            buttonContainer.addEventListener('click', onClickHandler);

            // 绑定选择按钮事件处理
            const selectBtn = buttonContainer.querySelector('.select-button');
            selectBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // 阻止事件冒泡，防止触发父元素的click
                toggleSelectionMode(buttonContainer);
            });

            // 修改全选按钮的点击事件处理
            const selectAllBtn = buttonContainer.querySelector('.select-all-btn');
            selectAllBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const checkboxes = document.querySelectorAll('.message-checkbox');
                isAllSelected = !isAllSelected;
                checkboxes.forEach(checkbox => {
                    checkbox.checked = isAllSelected;
                });
                selectAllBtn.textContent = chrome.i18n.getMessage(
                    isAllSelected ? 'unselectAllButton' : 'selectAllButton'
                );
            });
        }
    }

    function toggleSelectionMode(buttonContainer) {
        const selectAllBtn = buttonContainer.querySelector('.select-all-btn');
        const selectAllResponsesBtn = buttonContainer.querySelector('.select-all-responses-btn');
        const existingCheckboxes = document.querySelectorAll('.message-checkbox-wrapper');

        if (existingCheckboxes.length > 0) {
            // 如果存在复选框，清除它们并隐藏按钮
            existingCheckboxes.forEach(el => el.remove());
            selectAllBtn.style.display = 'none';
            selectAllResponsesBtn.style.display = 'none';
            isAllSelected = false; // 重置状态
            return;
        }

        const container = document.querySelector('.dad65929');
        if (container) {
            const scrollToTop = () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
                document.body.scrollTo({ top: 0, behavior: 'smooth' });
                container.scrollTo({ top: 0, behavior: 'smooth' });

                let parent = container.parentElement;
                while (parent) {
                    parent.scrollTo({ top: 0, behavior: 'smooth' });
                    parent = parent.parentElement;
                }
            };

            scrollToTop();
        }

        // 显示全选按钮并重置选中状态
        selectAllBtn.style.display = '';
        selectAllBtn.textContent = chrome.i18n.getMessage('selectAllButton');
        selectAllResponsesBtn.style.display = '';
        selectAllResponsesBtn.textContent = chrome.i18n.getMessage('selectAllResponsesButton');
        isAllSelected = false; // 重置状态

        // 为每个消息添加复选框，使用与getMessages.js相同的选择器
        document.querySelectorAll('._9663006, ._4f9bf79._43c05b5, ._4f9bf79.d7dc56a8._43c05b5').forEach(messageDiv => {
            const checkboxWrapper = document.createElement('div');
            checkboxWrapper.className = 'message-checkbox-wrapper';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'message-checkbox';
            checkbox.checked = false;

            // 标记AI回答的消息
            if (messageDiv.classList.contains('_4f9bf79') ||
                messageDiv.classList.contains('_43c05b5') ||
                messageDiv.classList.contains('d7dc56a8')) {
                checkbox.dataset.isAiResponse = 'true';
            }

            checkboxWrapper.appendChild(checkbox);
            messageDiv.appendChild(checkboxWrapper);

            if (!messageDiv.style.position) {
                messageDiv.style.position = 'relative';
            }
        });

        // 移除旧的事件监听器
        const newSelectAllBtn = selectAllBtn.cloneNode(true);
        selectAllBtn.parentNode.replaceChild(newSelectAllBtn, selectAllBtn);

        // 添加全选按钮的点击事件处理
        newSelectAllBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const checkboxes = document.querySelectorAll('.message-checkbox');
            isAllSelected = !isAllSelected;
            checkboxes.forEach(checkbox => {
                checkbox.checked = isAllSelected;
            });
            newSelectAllBtn.textContent = chrome.i18n.getMessage(
                isAllSelected ? 'unselectAllButton' : 'selectAllButton'
            );
        });

        // 移除旧的事件监听器
        const newSelectAllResponsesBtn = selectAllResponsesBtn.cloneNode(true);
        selectAllResponsesBtn.parentNode.replaceChild(newSelectAllResponsesBtn, selectAllResponsesBtn);

        // 添加选择全部AI回答按钮的点击事件处理
        newSelectAllResponsesBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const checkboxes = document.querySelectorAll('.message-checkbox');
            const aiResponseCheckboxes = Array.from(checkboxes).filter(
                checkbox => checkbox.dataset.isAiResponse === 'true'
            );

            // 检查当前是否所有AI回答均已选中
            const allAiResponsesSelected = aiResponseCheckboxes.every(checkbox => checkbox.checked);

            // 切换选择状态
            aiResponseCheckboxes.forEach(checkbox => {
                checkbox.checked = !allAiResponsesSelected;
            });
        });
    }

    // 初始注入
    injectButton();

    // 添加响应式监听
    const resizeObserver = new ResizeObserver((entries) => {
        injectButton();
    });

    // 监听 body 元素的大小变化
    resizeObserver.observe(document.body);

    // 在组件卸载时清理观察器
    return () => {
        resizeObserver.disconnect();
    };
}

function formatAsText(messages) {
    // Check if messages is valid and an array
    if (!messages || !Array.isArray(messages)) {
        console.warn('Invalid messages format:', messages);
        return messages?.content || messages?.toString() || 'No content available';
    }

    // 分组用户问题和AI回答
    const userMessages = messages.filter(msg => msg.role === 'user');
    const aiMessages = messages.filter(msg => msg.role === 'assistant');

    // 合并用户问题
    let userText = '';
    if (userMessages.length > 0) {
        userText = '用户：\n' + userMessages.map(msg => msg.content).join('\n');
    }

    // 合并AI回答
    let aiText = '';
    if (aiMessages.length > 0) {
        aiText = 'AI：\n' + aiMessages.map(msg => {
            let content = msg.content;
            // 如果有思考过程，添加到内容中
            if (msg.reasoning_content) {
                content += `\n思考过程 (${msg.reasoning_time}s):\n${msg.reasoning_content}`;
            }
            return content;
        }).join('\n');
    }

    // 拼接用户问题和AI回答
    return userText + (userText && aiText ? '\n\n' : '') + aiText;
}

// Helper function to generate a consistent filename across formats
function generateConsistentFilename(content, extension) {
    // Helper function to get China time zone timestamp
    function getChinaTimestamp() {
        const now = new Date();
        // Format date in China timezone (UTC+8)
        const options = {
            timeZone: 'Asia/Shanghai',
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false
        };
        const chinaTime = now.toLocaleString('zh-CN', options)
            .replace(/[\/\s:]/g, '-')
            .replace(',', '');
        return chinaTime;
    }

    // Default filename generation
    if (!content || typeof content !== 'string') {
        // Fallback if no valid content
        const timestamp = getChinaTimestamp();
        return `document_${timestamp}${extension}`;
    }

    // Extract the first line or first few words for the filename
    const firstLine = content.split('\n')[0] || '';
    let filename = firstLine.trim();

    // If first line is too long, truncate it
    filename = filename.substring(0, 10).trim();

    // Remove special characters that aren't allowed in filenames
    filename = filename.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '');

    // If filename is still empty after cleaning, use a default
    if (!filename) {
        filename = 'document';
    }

    // Add timestamp with China timezone
    const timestamp = getChinaTimestamp();
    return `${filename}_${timestamp}${extension}`;
}