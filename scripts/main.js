let messages = [];

const handleShareClick = () => {
    messages = getMessages();
    const modal = document.querySelector('.deepseek-share-modal');
    if (!modal) {
        injectShare(handleShareClick);
        return;
    }
    const contentArea = modal.querySelector('#conversation-content');
    contentArea.textContent = JSON.stringify(messages, null, 2);
    modal.style.display = 'block';
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


