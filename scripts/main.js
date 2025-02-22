let messages = [];

const handleShareClick = async () => {
    // 先获取容器并执行滚动
    const container = document.querySelector('.dad65929');
    if (container) {
        const scrollToTop = () => {
            window.scrollTo(0, 0);
            document.documentElement.scrollTo(0, 0);
            document.body.scrollTo(0, 0);
            container.scrollTo(0, 0);

            window.scrollTop = 0;
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
            container.scrollTop = 0;

            let parent = container.parentElement;
            while (parent) {
                parent.scrollTop = 0;
                parent = parent.parentElement;
            }
        };

        scrollToTop();
        await new Promise(resolve => setTimeout(resolve, 200));
    }

    // 然后再处理对话框和截图
    messages = getMessages();
    const modal = document.querySelector('.deepseek-share-modal');
    if (!modal) {
        injectShare(handleShareClick);
        return;
    }

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
        // 获取保存的自定义水印
        const { customWatermark } = await chrome.storage.sync.get('customWatermark');
        const imageUrl = await window.captureMessages(customWatermark);
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
};

// URL 变化监听
let lastUrl = location.href;
const urlObserver = new MutationObserver(() => {
    if (location.href !== lastUrl) {
        lastUrl = location.href;
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