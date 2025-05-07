let messages = [];
// 添加一个变量用于缓存上一次处理的消息，以便比较消息是否变化
let previousMessagesHash = '';
// 创建一个全局变量来跟踪是否需要屏蔽复制成功通知
let shouldBlockCopyNotifications = false;

// 用于生成消息数组的哈希值，以便比较消息是否发生变化
function generateMessagesHash(msgArray) {
    if (!msgArray || !Array.isArray(msgArray) || msgArray.length === 0) {
        return '';
    }
    
    // 提取关键数据以生成一个代表消息内容的字符串
    const contentStr = msgArray.map(msg => {
        return `${msg.role}:${msg.content}${msg.reasoning_content || ''}`;
    }).join('|');
    
    // 返回一个简单的哈希值
    let hash = 0;
    for (let i = 0; i < contentStr.length; i++) {
        const char = contentStr.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
}

// 创建一个函数来检查和移除所有"复制成功"通知
function removeAllCopySuccessNotifications() {
    if (!shouldBlockCopyNotifications) return;
    
    // 方法1：直接查找所有已存在的复制成功通知
    document.querySelectorAll('.ds-toast.ds-toast--success').forEach(toast => {
        const contentEl = toast.querySelector('.ds-toast__content');
        if (contentEl && (
            contentEl.textContent === '复制成功' || 
            contentEl.textContent === 'Copied' || 
            contentEl.textContent === chrome.i18n.getMessage('copied')
        )) {
            if (toast.parentNode) {
                console.log('移除已存在的复制成功通知');
                toast.parentNode.removeChild(toast);
            }
        }
    });
    
    // 方法2：查找可能的toast容器
    document.querySelectorAll('.ds-toast-container, [class*="toast"]').forEach(container => {
        if (container) {
            container.querySelectorAll('.ds-toast--success, [class*="success"]').forEach(toast => {
                const contentEl = toast.querySelector('.ds-toast__content, [class*="content"]');
                if (contentEl && (
                    contentEl.textContent === '复制成功' || 
                    contentEl.textContent === 'Copied!' || 
                    contentEl.textContent.includes('copy') || 
                    contentEl.textContent.includes('复制') || 
                    contentEl.textContent === chrome.i18n.getMessage('copied')
                )) {
                    if (toast.parentNode) {
                        console.log('移除容器中的复制成功通知');
                        toast.parentNode.removeChild(toast);
                    }
                }
            });
        }
    });
}

// 创建一个MutationObserver来监听并移除复制成功toast
const toastObserver = new MutationObserver((mutations) => {
    // 只有当shouldBlockCopyNotifications为true时才执行移除操作
    if (!shouldBlockCopyNotifications) return;
    
    // 先处理变化的节点
    let hasToastAdded = false;
    
    for (const mutation of mutations) {
        if (mutation.addedNodes.length) {
            hasToastAdded = true;
            mutation.addedNodes.forEach(node => {
                // 检查是否是复制成功的toast通知
                if (node.nodeType === Node.ELEMENT_NODE) {
                    // 直接检查这个节点
                    if (node.classList && 
                        node.classList.contains('ds-toast') &&
                        node.classList.contains('ds-toast--success')) {
                        
                        const contentEl = node.querySelector('.ds-toast__content');
                        if (contentEl && (
                            contentEl.textContent === '复制成功' || 
                            contentEl.textContent === 'Copied' || 
                            contentEl.textContent === chrome.i18n.getMessage('copied')
                        )) {
                            if (node.parentNode) {
                                console.log('拦截到了复制成功通知，已移除');
                                node.parentNode.removeChild(node);
                            }
                        }
                    }
                    
                    // 检查它的子元素
                    if (node.querySelector) {
                        const toasts = node.querySelectorAll('.ds-toast--success, [class*="toast"][class*="success"]');
                        toasts.forEach(toast => {
                            const contentEl = toast.querySelector('.ds-toast__content, [class*="content"]');
                            if (contentEl && (
                                contentEl.textContent === '复制成功' || 
                                contentEl.textContent === 'Copied' || 
                                contentEl.textContent.includes('copy') || 
                                contentEl.textContent.includes('复制') || 
                                contentEl.textContent === chrome.i18n.getMessage('copied')
                            )) {
                                if (toast.parentNode) {
                                    console.log('拦截到子元素中的复制成功通知，已移除');
                                    toast.parentNode.removeChild(toast);
                                }
                            }
                        });
                    }
                }
            });
        }
    }
    
    // 如果有节点添加，执行全面检查，以防有些通知是分步骤添加的
    if (hasToastAdded) {
        // 延迟一小段时间确保DOM更新完成
        setTimeout(removeAllCopySuccessNotifications, 10);
    }
});

// 开始监听整个文档以捕获toast通知
toastObserver.observe(document.body, {
    childList: true,
    subtree: true
});

const handleShareClick = async () => {
    try {
        // 设置标记，启用拦截"复制成功"通知
        shouldBlockCopyNotifications = true;
        
        // 立即执行一次检查，移除可能已存在的通知
        removeAllCopySuccessNotifications();
        
        // 5秒后恢复允许显示通知
        setTimeout(() => {
            shouldBlockCopyNotifications = false;
        }, 3000);

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

        // 获取消息数据（移动到这里，避免延迟显示模态框）
        messages = await getMessages();

        // 生成当前消息的哈希值
        const currentMessagesHash = generateMessagesHash(messages);

        // 如果消息没有变化，则不重新生成截图
        if (currentMessagesHash === previousMessagesHash) {
            console.log('消息没有变化，使用缓存的截图');
            return;
        }

        // 更新缓存的哈希值
        previousMessagesHash = currentMessagesHash;

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
    } catch (error) {
        if (error.message === 'NO_SELECTION') {
            alert(chrome.i18n.getMessage('noMessageSelected'));
            return;
        }
        console.error('Share failed:', error);
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

// 在页面卸载时清理observer
window.addEventListener('beforeunload', () => {
    toastObserver.disconnect();
    observer.disconnect();
    urlObserver.disconnect();
});