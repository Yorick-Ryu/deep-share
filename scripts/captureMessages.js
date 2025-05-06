window.captureMessages = async function (customWatermark) {
    const container = document.querySelector('.dad65929');
    if (!container) return null;

    // 检查是否存在复选框
    const checkboxes = document.querySelectorAll('.message-checkbox');
    if (checkboxes.length > 0) {
        // 如果存在复选框，隐藏未选中的对话
        checkboxes.forEach(checkbox => {
            const messageDiv = checkbox.closest('._9663006, ._4f9bf79._43c05b5, ._4f9bf79.d7dc56a8._43c05b5');
            if (messageDiv) {
                messageDiv.style.display = checkbox.checked ? '' : 'none';
            }
        });
    }

    // 获取水印设置和截图方法设置
    const { hideDefaultWatermark, screenshotMethod } = await chrome.storage.sync.get(['hideDefaultWatermark', 'screenshotMethod']);

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
    defaultWatermark.innerHTML = chrome.i18n.getMessage('defaultWatermark');

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

        let dataUrl;

        console.log(screenshotMethod)
        
        // 根据设置选择截图方法
        if (screenshotMethod === 'html2canvas' && typeof html2canvas !== 'undefined') {
            // 使用html2canvas
            const canvas = await html2canvas(container, {
                backgroundColor: backgroundColor,
                useCORS: true,
                scale: window.devicePixelRatio,
                allowTaint: true,
                ignoreElements: (element) => {
                    return element.classList.contains('deepseek-share-btn') ||
                        element.classList.contains('message-checkbox-wrapper');
                }
            });
            dataUrl = canvas.toDataURL('image/png');
        } else {
            // 使用domtoimage（默认或fallback）
            if (typeof domtoimage === 'undefined') {
                throw new Error('domtoimage not loaded');
            }
            
            dataUrl = await domtoimage.toPng(container, {
                bgcolor: backgroundColor,
                style: {
                    'margin': '0',
                    'padding': '0',
                    'transform': 'none'
                },
                filter: (node) => {
                    // 过滤掉不需要的元素
                    return !(node.classList && 
                            (node.classList.contains('deepseek-share-btn') || 
                             node.classList.contains('message-checkbox-wrapper')));
                }
            });
        }

        // 恢复被隐藏的对话
        if (checkboxes.length > 0) {
            checkboxes.forEach(checkbox => {
                const messageDiv = checkbox.closest('._9663006, ._4f9bf79._43c05b5, ._4f9bf79.d7dc56a8._43c05b5');
                if (messageDiv) {
                    messageDiv.style.display = '';
                }
            });
        }

        // 移除水印并恢复容器原始定位
        container.removeChild(watermarkContainer);
        container.style.position = originalPosition;

        return dataUrl;
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