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

    // 更新modal内容
    const modal = document.createElement('div');
    modal.className = 'deepseek-share-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>分享对话</h3>
                <button class="close-btn">&times;</button>
            </div>
            <div class="modal-body">
                <div class="tab-header">
                    <div class="tab-container">
                        <button class="tab-btn active" data-tab="image">截图</button>
                        <button class="tab-btn" data-tab="text">文本</button>
                    </div>
                    <div class="action-buttons">
                        <button class="download-btn">下载</button>
                        <button class="copy-btn">复制</button>
                    </div>
                </div>
                <div class="tab-panels">
                    <div class="tab-panel active" id="image-panel">
                        <div class="image-container">
                            <div class="image-loading">正在生成截图...</div>
                            <img id="conversation-image" style="display: none" alt="对话截图">
                        </div>
                    </div>
                    <div class="tab-panel" id="text-panel">
                        <pre id="conversation-content"></pre>
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

            if (tab.dataset.tab === 'text') {
                // 切换到文本标签时渲染文本内容
                const contentArea = modal.querySelector('#conversation-content');
                contentArea.textContent = formatAsText(messages);
            } else if (tab.dataset.tab === 'image') {
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
                    loadingEl.textContent = '截图生成失败，请重试';
                }
            }
        });
    });

    // 下载按钮事件
    const downloadBtn = modal.querySelector('.download-btn');
    downloadBtn.addEventListener('click', () => {
        const activeTab = modal.querySelector('.tab-btn.active').dataset.tab;
        const link = document.createElement('a');
        
        if (activeTab === 'image') {
            const img = modal.querySelector('#conversation-image');
            link.download = 'deepseek-chat.png';
            link.href = img.src;
        } else {
            const text = formatAsText(messages);
            const blob = new Blob([text], { type: 'text/plain' });
            link.download = 'deepseek-chat.txt';
            link.href = URL.createObjectURL(blob);
        }
        
        link.click();
    });

    // 复制按钮事件
    const copyBtn = modal.querySelector('.copy-btn');
    copyBtn.addEventListener('click', async () => {
        const activeTab = modal.querySelector('.tab-btn.active').dataset.tab;
        const originalText = copyBtn.textContent;
        
        try {
            if (activeTab === 'text') {
                const text = formatAsText(messages);
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
            
            copyBtn.textContent = '已复制！';
            setTimeout(() => {
                copyBtn.textContent = originalText;
            }, 2000);
        } catch (error) {
            console.error('Copy failed:', error);
            copyBtn.textContent = '复制失败！';
            setTimeout(() => {
                copyBtn.textContent = originalText;
            }, 2000);
        }
    });

    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'deepseek-share-btn';
    buttonContainer.innerHTML = `
      <button title="分享对话" class="share-button">
        <svg width="24" height="24" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
          <path d="M911.6 651.6l0 209.2c0 36-30.4 66.2-66.2 66.2l-699.6 1.2c-35.8 0-65-29.2-65-65.2l1.2-699.6c0-35.8 30.4-66.2 66.2-66.2l387 0L535.2 20.2 148.2 20.2c-81.8 0-143 82.8-143 156.8l0 686c0 77.6 63 140.8 140.8 140.8l686 0c82 0 156.6-68.2 156.6-143L988.6 651.6 911.6 651.6 911.6 651.6zM730.2 60.8l288.6 289.2L730.2 639l0-165.2c0 0-286.4-31.8-453.6 206.6 0 0 52.6-454.4 453.6-454.4L730.2 60.8 730.2 60.8z" fill="currentColor"/>
        </svg>
      </button>
    `;
  
    // 修改目标容器为 f8d1e4c0
    const targetElement = document.querySelector('.f8d1e4c0');
    if (targetElement) {
      // 添加到 f8d1e4c0 的末尾
      targetElement.appendChild(buttonContainer);
    }
  
    // Use the passed click handler
    buttonContainer.addEventListener('click', onClickHandler);
}

function formatAsText(messages) {
    return messages.map(msg => {
        const role = msg.role === 'user' ? '我' : 'AI';
        let text = `${role}: ${msg.content}`;
        if (msg.reasoning_content) {
            text += `\n思考过程 (${msg.reasoning_time}s):\n${msg.reasoning_content}`;
        }
        return text;
    }).join('\n\n');
}

function formatAsMarkdown(messages) {
    return messages.map(msg => {
        const role = msg.role === 'user' ? '### 我' : '### AI';
        let text = `${role}\n${msg.content}`;
        if (msg.reasoning_content) {
            text += `\n\n> 思考过程 (${msg.reasoning_time}s):\n> ${msg.reasoning_content}`;
        }
        return text;
    }).join('\n\n');
}

function renderAsImage(messages, canvas) {
    // TODO: Implement image rendering
    console.log('Image rendering to be implemented');
}