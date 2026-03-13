// Placeholder for captureDeepSeek.js
console.log("captureDeepSeek.js loaded");

document.addEventListener('deepshare:saveAsImage', async () => {
    let notificationId = null;
    let blobUrl = null;
    try {
        console.log('Save as long image clicked');
        notificationId = window.showToastNotification(chrome.i18n?.getMessage('screenshotInitiated'), 'loading', 30000);

        // captureDeepSeekMessages 现在返回 Blob 而非 data URL，避免生成巨大的 base64 字符串
        const blob = await captureDeepSeekMessages();

        if (notificationId !== null) {
            window.dismissToastNotification(notificationId);
        }

        if (blob) {
            // 使用 URL.createObjectURL 代替 data URL，避免主线程处理巨大的 base64 字符串
            blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            const now = new Date();
            const timestamp = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}-${now.getHours().toString().padStart(2, '0')}-${now.getMinutes().toString().padStart(2, '0')}-${now.getSeconds().toString().padStart(2, '0')}`;
            link.download = `deepseek-chat-${timestamp}.png`;
            link.click();
            window.showToastNotification(chrome.i18n?.getMessage('screenshotSuccess'), 'success');

            try {
                // Wait for focus before clipboard write to avoid NotAllowedError.
                await copyImageToClipboard(blob);
                window.showToastNotification(chrome.i18n?.getMessage('imageCopied'), 'success');
            } catch (copyError) {
                console.error('Failed to copy image to clipboard:', copyError);
                window.showToastNotification(chrome.i18n?.getMessage('imageCopyFailed'), 'error');
            }
        } else {
            // The error is already logged in captureDeepSeekMessages, just show notification
            window.showToastNotification(chrome.i18n?.getMessage('screenshotFailed'), 'error');
        }
    } catch (error) {
        console.error('Error during save as image:', error);
        if (notificationId !== null) {
            window.dismissToastNotification(notificationId);
        }
        window.showToastNotification(chrome.i18n?.getMessage('screenshotFailed'), 'error');
    } finally {
        // 释放 blob URL 避免内存泄漏
        if (blobUrl) {
            URL.revokeObjectURL(blobUrl);
        }
    }
});

async function copyImageToClipboard(blob) {
    await waitForDocumentFocus(300);
    await writeImageToClipboard(blob);
}

async function writeImageToClipboard(blob) {
    await navigator.clipboard.write([
        new ClipboardItem({
            [blob.type]: blob
        })
    ]);
}

function waitForDocumentFocus(timeoutMs) {
    if (document.hasFocus()) return Promise.resolve(true);

    return new Promise((resolve) => {
        const onFocus = () => {
            cleanup();
            resolve(true);
        };
        const timer = setTimeout(() => {
            cleanup();
            resolve(document.hasFocus());
        }, timeoutMs);
        const cleanup = () => {
            window.removeEventListener('focus', onFocus, true);
            clearTimeout(timer);
        };

        window.addEventListener('focus', onFocus, true);
    });
}

async function captureDeepSeekMessages(customWatermark) {
    const messageSelector = '._9663006, ._4f9bf79._43c05b5, ._4f9bf79.d7dc56a8._43c05b5';
    const messageNodes = Array.from(document.querySelectorAll(messageSelector));
    const container = document.querySelector('.dad65929') || messageNodes[0]?.parentElement || null;

    if (!container) {
        console.error('Screenshot failed: conversation container not found');
        return null;
    }

    if (messageNodes.length === 0) {
        console.error('Screenshot failed: no messages found');
        return null;
    }

    const messages = messageNodes;
    const selectedIndices = new Set();
    let selectionMode = false;

    // Determine which messages are selected
    const messageCheckboxes = document.querySelectorAll('.d30139ff .ds-checkbox');
    if (messageCheckboxes.length > 0) {
        selectionMode = true;
        messageCheckboxes.forEach((checkbox, index) => {
            if (checkbox.classList.contains('ds-checkbox--active')) {
                selectedIndices.add(index);
            }
        });
    }

    // If at least one message is selected, hide unselected messages.
    // If none selected, keep full conversation to avoid empty captures.
    if (selectionMode && selectedIndices.size > 0) {
        messages.forEach((messageDiv, index) => {
            if (!selectedIndices.has(index)) {
                messageDiv.style.display = 'none';
            }
        });
    }

    // Click the "Select All" checkbox to unselect all messages and hide the selection UI
    const selectAllCheckbox = document.querySelector('.ds-checkbox-wrapper .ds-checkbox');
    if (selectAllCheckbox && selectAllCheckbox.classList.contains('ds-checkbox--active')) {
        selectAllCheckbox.click();
        // Wait for UI to update
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Get watermark and screenshot method settings
    const { hideDefaultWatermark, screenshotMethod } = await chrome.storage.sync.get(['hideDefaultWatermark', 'screenshotMethod']);
    // ... rest of the function is the same
    const originalPosition = container.style.position;
    const originalPadding = container.style.padding;
    container.style.position = 'relative';
    container.style.padding = '20px';

    // Create watermark container
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

    // Create default and custom watermarks
    const defaultWatermark = document.createElement('div');
    defaultWatermark.style.cssText = `
        padding: 2px 16px;
        border-radius: 4px;
        font-size: 13px;
        color: #666;
    `;
    defaultWatermark.innerHTML = chrome.i18n?.getMessage('defaultWatermark');

    if (customWatermark) {
        const customWatermarkEl = document.createElement('div');
        customWatermarkEl.style.cssText = `
            padding: 2px 16px;
            border-radius: 4px;
            font-size: 13px;
            color: #666;
            font-weight: bold;
        `;
        customWatermarkEl.textContent = customWatermark;
        watermarkContainer.appendChild(customWatermarkEl);
        if (!hideDefaultWatermark) {
            watermarkContainer.appendChild(defaultWatermark);
        }
    } else if (!hideDefaultWatermark) {
        watermarkContainer.appendChild(defaultWatermark);
    }

    try {
        let backgroundColor = getComputedStyle(container).backgroundColor;
        if (backgroundColor === 'transparent' || backgroundColor === 'rgba(0, 0, 0, 0)') {
            backgroundColor = getComputedStyle(document.body).backgroundColor;
            if (backgroundColor === 'transparent' || backgroundColor === 'rgba(0, 0, 0, 0)') {
                backgroundColor = document.documentElement.classList.contains('dark') ? '#1E1E1E' : '#FFFFFF';
            }
        }

        container.appendChild(watermarkContainer);

        if (document.documentElement.classList.contains('dark')) {
            watermarkContainer.querySelectorAll('div').forEach(el => {
                el.style.color = '#aaa';
            });
        }

        await new Promise(resolve => setTimeout(resolve, 100));

        let blob;

        // 根据设置选择截图方法
        if (screenshotMethod === 'domtoimage' && typeof domtoimage !== 'undefined') {
            try {
                const dataUrl = await domtoimage.toPng(container, {
                    bgcolor: backgroundColor,
                    style: {
                        'margin': '0',
                        'transform': 'none'
                    },
                    filter: (node) => {
                        // 过滤掉不需要的元素
                        return !(node.classList &&
                            (node.classList.contains('fab07e97') ||
                                node.classList.contains('ds-checkbox-wrapper')));
                    },
                    skipAutoScale: true
                });
                // 将 data URL 转为 Blob
                if (dataUrl) {
                    blob = await (await fetch(dataUrl)).blob();
                }
            } catch (e) {
                console.error('dom-to-image failed, falling back to html2canvas', e);
                // Fallback to html2canvas if dom-to-image fails
            }
        } else if (screenshotMethod === 'snapdom' && typeof snapdom !== 'undefined') {
            try {
                const result = await snapdom(container, {
                    backgroundColor: backgroundColor,
                    embedFonts: true,
                    filter: (element) => {
                        if (!element.classList) return true;
                        return !(element.classList.contains('fab07e97') ||
                            element.classList.contains('ds-checkbox-wrapper'));
                    }
                });
                const img = await result.toPng();
                // 将 data URL 转为 Blob
                if (img && img.src) {
                    blob = await (await fetch(img.src)).blob();
                }
            } catch (e) {
                console.error('SnapDOM failed', e);
            }
        }

        // 如果其他方法失败或未选择，则使用 html2canvas
        if (!blob) {
            if (typeof html2canvas === 'undefined') {
                throw new Error('html2canvas not loaded');
            }

            const canvas = await html2canvas(container, {
                backgroundColor: backgroundColor,
                useCORS: true,
                scale: window.devicePixelRatio,
                allowTaint: true,
                ignoreElements: (element) => {
                    return element.classList.contains('fab07e97') ||
                        element.classList.contains('ds-checkbox-wrapper');
                }
            });
            // 使用异步的 toBlob 替代同步的 toDataURL，避免主线程阻塞
            blob = await new Promise((resolve, reject) => {
                canvas.toBlob((b) => {
                    if (b) {
                        resolve(b);
                        return;
                    }
                    reject(new Error('canvas.toBlob returned null'));
                }, 'image/png');
            });
        }


        return blob;
    } catch (error) {
        console.error('Screenshot failed:', error);
        return null;
    } finally {
        // Restore hidden conversations even when capture fails.
        if (selectionMode) {
            messages.forEach(messageDiv => {
                messageDiv.style.display = '';
            });
        }
        if (watermarkContainer.parentNode) {
            container.removeChild(watermarkContainer);
        }
        container.style.position = originalPosition;
        container.style.padding = originalPadding;
    }
}


// This function is now standalone and not called directly by an event listener in this file.
// It's called by the event listener for 'deepshare:saveAsImage'

