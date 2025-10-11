// Placeholder for captureDeepSeek.js
console.log("captureDeepSeek.js loaded");

function injectSaveAsImageButton() {
    const targetNode = document.body;

    const observer = new MutationObserver(mutationsList => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                const shareContainer = document.querySelector('._43d222b');
                if (shareContainer && !document.getElementById('save-as-image-btn')) {
                    const buttonContainer = shareContainer.querySelector('.fab07e97');
                    const createLinkButton = buttonContainer.querySelector('.ds-basic-button--primary');

                    if (buttonContainer && createLinkButton) {
                        const saveAsImageButton = createLinkButton.cloneNode(true);
                        saveAsImageButton.id = 'save-as-image-btn';
                        saveAsImageButton.querySelector('span').textContent = chrome.i18n.getMessage('saveAsImageButton');
                        
                        // Remove existing icon
                        const iconContainer = saveAsImageButton.querySelector('.ds-icon');
                        if (iconContainer) {
                            iconContainer.remove();
                        }

                        saveAsImageButton.addEventListener('click', async () => {
                            console.log('Save as long image clicked');
                            const dataUrl = await captureDeepSeekMessages();
                            if (dataUrl) {
                                const link = document.createElement('a');
                                link.href = dataUrl;
                                const now = new Date();
                                const timestamp = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}-${now.getHours().toString().padStart(2, '0')}-${now.getMinutes().toString().padStart(2, '0')}-${now.getSeconds().toString().padStart(2, '0')}`;
                                link.download = `deepseek-chat-${timestamp}.png`;
                                link.click();
                            }
                        });

                        buttonContainer.insertBefore(saveAsImageButton, createLinkButton);
                    }
                }
            }
        }
    });

    observer.observe(targetNode, { childList: true, subtree: true });
}

async function captureDeepSeekMessages(customWatermark) {
    const container = document.querySelector('.dad65929');
    if (!container) return null;

    const messages = document.querySelectorAll('.dad65929 > div[class]');
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

    // If in selection mode, hide unselected messages
    if (selectionMode) {
        messages.forEach((messageDiv, index) => {
            if (!selectedIndices.has(index)) {
                messageDiv.style.display = 'none';
            }
        });
    }

    // Click cancel button to hide selection UI
    const cancelButton = Array.from(document.querySelectorAll('._43d222b button')).find(btn => btn.textContent.includes('取消') || btn.textContent.toLowerCase().includes('cancel'));
    if (cancelButton) {
        cancelButton.click();
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
    defaultWatermark.innerHTML = chrome.i18n.getMessage('defaultWatermark');

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

        let dataUrl;

        // Use html2canvas
        if (typeof html2canvas === 'undefined') {
            throw new Error('html2canvas not loaded');
        }
        
        const canvas = await html2canvas(container, {
            backgroundColor: backgroundColor,
            useCORS: true,
            scale: window.devicePixelRatio,
            allowTaint: true,
            ignoreElements: (element) => {
                return element.classList.contains('fab07e97') || element.classList.contains('ds-checkbox-wrapper');
            }
        });
        dataUrl = canvas.toDataURL('image/png');
        

        // Restore hidden conversations
        if (selectionMode) {
            messages.forEach(messageDiv => {
                messageDiv.style.display = '';
            });
        }

        container.removeChild(watermarkContainer);
        container.style.position = originalPosition;
        container.style.padding = originalPadding;

        return dataUrl;
    } catch (error) {
        if (watermarkContainer.parentNode) {
            container.removeChild(watermarkContainer);
        }
        container.style.position = originalPosition;
        container.style.padding = originalPadding;
        console.error('Screenshot failed:', error);
        return null;
    }
}


injectSaveAsImageButton();
