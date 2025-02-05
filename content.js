// Inject share button
function injectShareButton() {
  if (document.querySelector('.deepseek-share-btn')) return;

  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'deepseek-share-btn';
  buttonContainer.innerHTML = `
    <button title="分享对话" class="share-button">
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
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

  // 修改点击处理程序
  buttonContainer.addEventListener('click', () => {
    const conversations = getConversationContent();
    // 显示模态框
    const modal = document.querySelector('.deepseek-share-modal');
    modal.style.display = 'block';
    generatePreview(conversations);
  });
}

// 使用 MutationObserver 监听 DOM 变化
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.addedNodes.length) {
      injectShareButton();
    }
  }
});

// 开始观察
observer.observe(document.body, {
  childList: true,
  subtree: true
});

// 确保在DOM加载完成后执行
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectShareButton);
} else {
  injectShareButton();
}

// 定期检查是否需要重新注入按钮
setInterval(() => {
  if (!document.querySelector('.deepseek-share-btn')) {
    injectShareButton();
  }
}, 1000);

// 存储最新的对话数据
let latestChatData = {
  messages: []
};

// 拦截 fetch 请求
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  const response = await originalFetch.apply(this, args);
  
  // 克隆响应以便多次读取
  const clone = response.clone();
  const url = args[0].toString();

  try {
    if (url.includes('/api/v0/chat/history_messages')) {
      // 处理历史记录请求
      const data = await clone.json();
      if (data?.data?.messages) {
        latestChatData.messages = data.data.messages;
      }
    } else if (url.includes('/api/chat')) {
      // 处理实时对话请求
      const data = await clone.json();
      if (data?.data?.biz_data?.chat_messages) {
        latestChatData.messages = data.data.biz_data.chat_messages;
      }
    }
  } catch (e) {
    console.error('解析对话数据失败:', e);
  }

  return response;
};

// 获取对话内容
function getConversationContent() {
  console.log('开始获取对话内容');
  
  // 获取所有对话组（注意这里改为直接从 document 查找）
  const dialogGroups = document.querySelectorAll('.fa81');
  console.log('对话组数量:', dialogGroups.length);
  
  return Array.from(dialogGroups).map((group, index) => {
    console.log(`处理第 ${index + 1} 组对话`);
    
    // 获取用户问题 - 直接从文本节点获取
    const userElement = group.querySelector('.fbb737a4');
    const userText = Array.from(userElement?.childNodes || [])
      .find(node => node.nodeType === Node.TEXT_NODE)?.textContent?.trim() || '';
    console.log('用户问题:', userText);
    
    // AI 回复容器 - 在外层查找
    const aiContainer = document.querySelector(`.f9bf7997[data-conversation-id="${group.dataset.conversationId}"]`) || 
                       group.nextElementSibling;
    console.log('AI容器:', aiContainer);
    
    if (!aiContainer?.classList.contains('f9bf7997')) {
      console.log('未找到有效的AI回复容器');
      return null;
    }

    // 思考状态和时间
    const thinkTime = aiContainer.querySelector('.a6d716f5.db5991dd')?.textContent.trim() || '';
    console.log('思考时间:', thinkTime);
    
    // 思考内容
    const thinkingContent = Array.from(aiContainer.querySelectorAll('.e1675d8b .ba94db8a'))
      .map(p => p.textContent.trim())
      .filter(Boolean)
      .join('\n');
    console.log('思考内容长度:', thinkingContent.length);

    // 最终回复
    const response = aiContainer.querySelector('.ds-markdown--block')?.textContent.trim() || '';
    console.log('回复长度:', response.length);

    const result = {
      user: userText,
      ai: {
        thinking: {
          content: thinkingContent,
          time: thinkTime
        },
        response
      }
    };
    
    console.log('处理结果:', result);
    return result;
  }).filter(Boolean);
}

// 移除多余的消息监听器，因为我们现在直接在按钮点击时处理
chrome.runtime.onMessage.removeListener();

// 图片配置选项
const IMAGE_CONFIGS = {
  default: { width: 1200, height: 1600, name: '小红书 3:4' },
  douyin: { width: 1080, height: 1920, name: '抖音 9:16' },
  weibo: { width: 1000, height: 1000, name: '微博 1:1' },
  custom: { width: 800, height: 800, name: '自定义' }
};

// 修改模态框 HTML 结构
function injectModal() {
  const modal = document.createElement('div');
  modal.className = 'deepseek-share-modal';
  modal.innerHTML = `
    <div class="modal-wrapper">
      <div class="modal-content">
        <div class="modal-header">
          <h3>生成分享图片</h3>
          <button class="close-btn">&times;</button>
        </div>
        <div class="modal-scroll-container">
          <div class="option-group">
            <h4>图片格式</h4>
            <select id="imageFormat">
              ${Object.entries(IMAGE_CONFIGS).map(([key, config]) => 
                `<option value="${key}">${config.name} (${config.width}x${config.height})</option>`
              ).join('')}
            </select>
            
            <h4>内容选项</h4>
            <label>
              <input type="checkbox" id="includeThinking" checked> 
              包含思考过程
            </label>
            <label>
              <input type="checkbox" id="includeTime" checked> 
              包含思考时间
            </label>
          </div>
          <div class="preview-area">
            <div class="loading">正在生成预览...</div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="generate-btn">生成图片</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // 绑定关闭事件
  modal.querySelector('.close-btn').onclick = () => modal.style.display = 'none';
  modal.onclick = (e) => {
    if (e.target === modal) modal.style.display = 'none';
  };

  // 添加生成按钮点击事件
  modal.querySelector('.generate-btn').onclick = () => {
    const conversations = getConversationContent();
    const imageType = modal.querySelector('input[name="imageType"]:checked').value;
    
    if (imageType === 'single') {
      downloadImage();
    } else {
      // TODO: 处理多张图片的情况
    }
  };
  
  // 添加选项切换事件
  modal.querySelectorAll('input[name="imageType"]').forEach(radio => {
    radio.onchange = () => {
      const conversations = getConversationContent();
      generatePreview(conversations);
    };
  });
}

// 生成预览图片的函数
function generatePreview(conversations) {
  const previewArea = document.querySelector('.preview-area');
  const format = document.getElementById('imageFormat').value;
  const includeThinking = document.getElementById('includeThinking').checked;
  const includeTime = document.getElementById('includeTime').checked;
  
  const config = IMAGE_CONFIGS[format];
  const canvas = document.createElement('canvas');
  canvas.id = 'previewCanvas';
  canvas.width = config.width;
  canvas.height = config.height;
  canvas.style.width = '100%';
  canvas.style.height = 'auto';
  
  const ctx = canvas.getContext('2d');
  
  // 设置白色背景
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // 添加水印
  ctx.fillStyle = '#f0f0f0';
  ctx.font = '14px Arial';
  ctx.fillText('Generated by DeepSeek Share', canvas.width - 200, canvas.height - 20);
  
  // 绘制对话内容
  let y = 60;
  const margin = 40;
  const maxWidth = canvas.width - (margin * 2);
  
  conversations.forEach((conv, index) => {
    // 用户问题
    y = drawTextBlock(ctx, `Q${index + 1}: ${conv.user}`, y, {
      margin,
      maxWidth,
      font: 'bold 18px Arial',
      color: '#1a73e8'
    });
    
    // 思考过程（可选）
    if (includeThinking && conv.ai.thinking.content) {
      y = drawTextBlock(ctx, conv.ai.thinking.content, y, {
        margin,
        maxWidth,
        font: '14px Arial',
        color: '#666666',
        bgColor: '#f8f9fa'
      });
    }
    
    // 思考时间（可选）
    if (includeTime && conv.ai.thinking.time) {
      y = drawTextBlock(ctx, conv.ai.thinking.time, y, {
        margin,
        maxWidth,
        font: '12px Arial',
        color: '#999999'
      });
    }
    
    // AI回答
    y = drawTextBlock(ctx, conv.ai.response, y, {
      margin,
      maxWidth,
      font: '16px Arial',
      color: '#333333'
    });
    
    y += 40; // 对话间距
  });
  
  previewArea.innerHTML = '';
  previewArea.appendChild(canvas);
}

// 辅助函数：绘制文本块
function drawTextBlock(ctx, text, startY, options) {
  const {
    margin = 40,
    maxWidth,
    font,
    color,
    bgColor
  } = options;
  
  ctx.font = font;
  ctx.fillStyle = color;
  
  const lines = getTextLines(ctx, text, maxWidth);
  let y = startY;
  
  if (bgColor) {
    const blockHeight = lines.length * 20 + 20;
    ctx.fillStyle = bgColor;
    ctx.fillRect(margin - 10, y - 10, maxWidth + 20, blockHeight);
    ctx.fillStyle = color;
  }
  
  lines.forEach(line => {
    ctx.fillText(line, margin, y);
    y += 20;
  });
  
  return y + 10;
}

// 辅助函数：获取文本行
function getTextLines(ctx, text, maxWidth) {
  const words = text.split('');
  const lines = [];
  let currentLine = '';
  
  words.forEach(char => {
    const testLine = currentLine + char;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth) {
      lines.push(currentLine);
      currentLine = char;
    } else {
      currentLine = testLine;
    }
  });
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
}

// 下载图片
function downloadImage() {
  const canvas = document.getElementById('previewCanvas');
  const link = document.createElement('a');
  link.download = 'deepseek-conversation.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

// 确保模态框优先注入
injectModal();

// 修改 injectShareButton 函数
function injectShareButton() {
  if (document.querySelector('.deepseek-share-btn')) return;

  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'deepseek-share-btn';
  buttonContainer.innerHTML = `
    <button title="分享对话" class="share-button">
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path d="M18 8C19.6569 8 21 6.65685 21 5C21 3.34315 19.6569 2 18 2C16.3431 2 15 3.34315 15 5C15 6.65685 16.3431 8 18 8Z" fill="currentColor"/>
        <path d="M6 15C7.65685 15 9 13.6569 9 12C9 10.3431 7.65685 9 6 9C4.34315 9 3 10.3431 3 12C3 13.6569 4.34315 15 6 15Z" fill="currentColor"/>
        <path d="M18 22C19.6569 22 21 20.6569 21 19C21 17.3431 19.6569 16 18 16C16.3431 16 15 17.3431 15 19C15 20.6569 16.3431 22 18 22Z" fill="currentColor"/>
        <path d="M8.59 13.51L15.42 17.49M15.41 6.51L8.59 10.49" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
  `;

  const targetElement = document.querySelector('.f8d1e4c0');
  if (targetElement) {
    targetElement.appendChild(buttonContainer);
  }

  // 修改点击处理程序，确保模态框存在
  buttonContainer.addEventListener('click', () => {
    const modal = document.querySelector('.deepseek-share-modal');
    if (!modal) {
      injectModal();
    }
    const conversations = getConversationContent();
    document.querySelector('.deepseek-share-modal').style.display = 'block';
    generatePreview(conversations);
  });
}
