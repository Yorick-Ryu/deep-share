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

    // Inject modal first
    const modal = document.createElement('div');
    modal.className = 'deepseek-share-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>分享对话</h3>
          <button class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <pre id="conversation-content"></pre>
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

    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'deepseek-share-btn';
    buttonContainer.innerHTML = `
      <button title="分享对话" class="share-button">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 8C19.6569 8 21 6.65685 21 5C21 3.34315 19.6569 2 18 2C16.3431 2 15 3.34315 15 5C15 6.65685 16.3431 8 18 8Z" fill="currentColor"/>
          <path d="M6 15C7.65685 15 9 13.6569 9 12C9 10.3431 7.65685 9 6 9C4.34315 9 3 10.3431 3 12C3 13.6569 4.34315 15 6 15Z" fill="currentColor"/>
          <path d="M18 22C19.6569 22 21 20.6569 21 19C21 17.3431 19.6569 16 18 16C16.3431 16 15 17.3431 15 19C15 20.6569 16.3431 22 18 22Z" fill="currentColor"/>
          <path d="M8.59 13.51L15.42 17.49M15.41 6.51L8.59 10.49" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
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