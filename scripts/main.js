let messages = [];

const handleShareClick = () => {
    messages = getMessages();
    const modal = document.querySelector('.deepseek-share-modal');
    const contentArea = modal.querySelector('#conversation-content');
    contentArea.textContent = JSON.stringify(messages, null, 2);
    modal.style.display = 'block';
};

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
    document.addEventListener('DOMContentLoaded', () => injectShareButton(handleShareClick));
} else {
    injectShareButton(handleShareClick);
}


