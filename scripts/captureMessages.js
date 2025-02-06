window.captureMessages = async function() {
    const container = document.querySelector('.dad65929');
    if (!container) return null;

    try {
        if (typeof html2canvas === 'undefined') {
            throw new Error('html2canvas not loaded');
        }

        // 获取实际背景色，优先从对话容器获取，然后是body
        let backgroundColor = getComputedStyle(container).backgroundColor;
        
        // 如果背景色是透明的，尝试获取 body 的背景色
        if (backgroundColor === 'transparent' || backgroundColor === 'rgba(0, 0, 0, 0)') {
            backgroundColor = getComputedStyle(document.body).backgroundColor;
            
            // 如果还是透明的，使用固定的背景色
            if (backgroundColor === 'transparent' || backgroundColor === 'rgba(0, 0, 0, 0)') {
                // 根据页面主题设置默认背景色
                backgroundColor = document.documentElement.classList.contains('dark') ? '#1E1E1E' : '#FFFFFF';
            }
        }

        const canvas = await html2canvas(container, {
            backgroundColor: backgroundColor,
            useCORS: true,
            scale: window.devicePixelRatio,
            allowTaint: true,
            ignoreElements: (element) => {
                return element.classList.contains('deepseek-share-btn');
            }
        });
        
        return canvas.toDataURL('image/png');
    } catch (error) {
        console.error('Screenshot failed:', error);
        return null;
    }
};
