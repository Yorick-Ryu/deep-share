window.captureMessages = async function(customWatermark) {
    const container = document.querySelector('.dad65929');
    if (!container) return null;

    // 获取水印设置
    const { hideDefaultWatermark } = await chrome.storage.sync.get('hideDefaultWatermark');

    // 设置容器为相对定位以支持水印的绝对定位
    const originalPosition = container.style.position;
    container.style.position = 'relative';

    // 创建水印容器
    const watermarkContainer = document.createElement('div');
    watermarkContainer.style.cssText = `
        position: absolute;
        bottom: 20px;
        right: 20px;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 2px;
        z-index: 9999;
        pointer-events: none;
        user-select: none;
    `;

    // 创建默认水印和自定义水印
    const defaultWatermark = document.createElement('div');
    defaultWatermark.style.cssText = `
        padding: 2px 16px;
        border-radius: 4px;
        font-size: 13px;
        color: #666;
    `;
    defaultWatermark.innerHTML = '内容由 <strong>DeepSeek AI</strong> 生成，图片由 <strong>DeepShare</strong> 插件截取';

    if (customWatermark) {
        const customWatermarkEl = document.createElement('div');
        customWatermarkEl.style.cssText = `
            padding: 2px 16px;
            border-radius: 4px;
            font-size: 13px;
            color: #666;
            font-weight: bold;  // 添加加粗样式
        `;
        customWatermarkEl.textContent = customWatermark;
        watermarkContainer.appendChild(customWatermarkEl);
        // 只在未隐藏默认水印时添加
        if (!hideDefaultWatermark) {
            watermarkContainer.appendChild(defaultWatermark);
        }
    } else if (!hideDefaultWatermark) {
        // 没有自定义水印且未隐藏默认水印时添加
        watermarkContainer.appendChild(defaultWatermark);
    }

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

        // 在截图前添加水印
        container.appendChild(watermarkContainer);

        // 调整水印样式以适应深色主题
        if (document.documentElement.classList.contains('dark')) {
            watermarkContainer.querySelectorAll('div').forEach(el => {
                el.style.color = '#aaa';
            });
        }

        // 等待一小段时间确保水印渲染完成
        await new Promise(resolve => setTimeout(resolve, 100));

        const canvas = await html2canvas(container, {
            backgroundColor: backgroundColor,
            useCORS: true,
            scale: window.devicePixelRatio,
            allowTaint: true,
            ignoreElements: (element) => {
                return element.classList.contains('deepseek-share-btn');
            }
        });
        
        // 移除水印并恢复容器原始定位
        container.removeChild(watermarkContainer);
        container.style.position = originalPosition;
        
        return canvas.toDataURL('image/png');
    } catch (error) {
        // 确保发生错误时也清理现场
        if (watermarkContainer.parentNode) {
            container.removeChild(watermarkContainer);
        }
        container.style.position = originalPosition;
        console.error('Screenshot failed:', error);
        return null;
    }
};
