let messages = [];

const handleShareClick = async () => {
    messages = getMessages();
    const modal = document.querySelector('.deepseek-share-modal');
    if (!modal) {
        injectShare(handleShareClick);
        return;
    }

    // 默认显示图片模式
    modal.style.display = 'block';
    
    // 确保切换到图片面板
    const imageTab = modal.querySelector('.tab-btn[data-tab="image"]');
    const imagePanel = modal.querySelector('#image-panel');
    
    modal.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
    modal.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    
    imageTab.classList.add('active');
    imagePanel.classList.add('active');

    // 立即开始生成截图
    const img = modal.querySelector('#conversation-image');
    const loadingEl = modal.querySelector('.image-loading');
    img.style.display = 'none';
    loadingEl.style.display = 'block';

    try {
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
};

// URL 变化监听
let lastUrl = location.href;
const urlObserver = new MutationObserver(() => {
    if (location.href !== lastUrl) {
        lastUrl = location.href;
        console.log('URL changed:', lastUrl);
        // 移除旧的模态框和按钮
        document.querySelector('.deepseek-share-modal')?.remove();
        document.querySelector('.deepseek-share-btn')?.remove();
        // 重新注入
        if (location.pathname.includes('/chat/')) {
            injectShare(handleShareClick);
        }
    }
});

// 监听 URL 变化
urlObserver.observe(document.body, {
    childList: true,
    subtree: true
});

// DOM 变化监听
const observer = new MutationObserver((mutations) => {
    if (location.pathname.includes('/chat/')) {
        const shareBtn = document.querySelector('.deepseek-share-btn');
        if (!shareBtn) {
            injectShare(handleShareClick);
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
    document.addEventListener('DOMContentLoaded', () => injectShare(handleShareClick));
} else {
    injectShare(handleShareClick);
}


