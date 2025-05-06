function getMessages() {
    // 检查是否存在复选框
    const checkboxes = document.querySelectorAll('.message-checkbox');
    if (checkboxes.length === 0) {
        // 如果没有复选框，获取所有对话
        return getAllMessages();
    }

    // 检查是否有选中的对话
    const hasSelectedMessages = Array.from(checkboxes).some(checkbox => checkbox.checked);
    if (!hasSelectedMessages) {
        throw new Error('NO_SELECTION');
    }

    // 如果存在复选框，只获取选中的对话
    return processSelectedMessages(checkboxes);
}

// 处理选中消息的异步函数
async function processSelectedMessages(checkboxes) {
    const messages = [];
    // 转换为数组并过滤出选中的复选框
    const selectedCheckboxes = Array.from(checkboxes).filter(checkbox => checkbox.checked);
    
    // 按顺序处理每个选中的复选框
    for (const checkbox of selectedCheckboxes) {
        const messageDiv = checkbox.closest('._9663006, ._4f9bf79._43c05b5, ._4f9bf79.d7dc56a8._43c05b5');
        if (messageDiv) {
            if (messageDiv.classList.contains('_9663006')) {
                // 用户问题 - 保持不变
                const userElement = messageDiv.querySelector('.fbb737a4');
                const userText = Array.from(userElement?.childNodes || [])
                    .find(node => node.nodeType === Node.TEXT_NODE)?.textContent?.trim();
                if (userText) {
                    messages.push({
                        role: "user",
                        content: userText
                    });
                }
            } else {
                // AI 回复 - 使用复制按钮方法获取内容
                const copyButtonContainer = messageDiv.querySelector('.ds-flex[style*="margin-top: 12px"][style*="height: 20px"][style*="align-items: center"]');
                if (copyButtonContainer) {
                    const buttonGroup = copyButtonContainer.querySelector('.ds-flex[style*="align-items: center"][style*="gap: 16px"], .ds-flex[style*="align-items: center"][style*="gap: 12px"], .ds-flex._965abe9');
                    if (buttonGroup) {
                        const copyButton = buttonGroup.querySelector('.ds-icon-button:first-child');
                        if (copyButton) {
                            try {
                                // 使用异步函数获取消息内容
                                const content = await getContentViaCopyButton(copyButton);
                                if (content) {
                                    messages.push({
                                        role: "assistant",
                                        content: content
                                    });
                                }
                            } catch (error) {
                                console.error('使用复制按钮获取内容失败:', error);
                                fallbackToOldMethod(messageDiv, messages);
                            }
                        } else {
                            fallbackToOldMethod(messageDiv, messages);
                        }
                    } else {
                        fallbackToOldMethod(messageDiv, messages);
                    }
                } else {
                    fallbackToOldMethod(messageDiv, messages);
                }
            }
        }
    }
    
    return messages;
}

// 通过复制按钮获取内容的Promise函数
function getContentViaCopyButton(copyButton) {
    return new Promise(async (resolve, reject) => {
        try {
            // 保存当前剪贴板内容
            let originalClipboard = '';
            try {
                originalClipboard = await navigator.clipboard.readText();
            } catch (clipError) {
                console.log('无法读取当前剪贴板内容:', clipError);
            }
            
            // 点击复制按钮
            copyButton.click();
            
            // 等待复制操作完成
            setTimeout(async () => {
                try {
                    // 从剪贴板获取文本
                    const clipboardContent = await navigator.clipboard.readText();
                    
                    // 恢复原来的剪贴板内容
                    if (originalClipboard) {
                        await navigator.clipboard.writeText(originalClipboard);
                    }
                    
                    resolve(clipboardContent);
                } catch (error) {
                    reject(error);
                }
            }, 300);
        } catch (error) {
            reject(error);
        }
    });
}

// 回退到旧方法的辅助函数
function fallbackToOldMethod(messageDiv, messages) {
    const response = messageDiv.querySelector('.ds-markdown--block')?.textContent.trim() || '';
    if (response) {
        messages.push({
            role: "assistant",
            content: response
        });
    }
}

// 获取所有对话的函数
async function getAllMessages() {
    const userMessageContainers = document.querySelectorAll('._9663006');
    const messages = [];

    // 按顺序处理每个用户消息和AI响应
    for (const userContainer of Array.from(userMessageContainers)) {
        // 获取用户问题
        const userElement = userContainer.querySelector('.fbb737a4');
        const userText = Array.from(userElement?.childNodes || [])
            .find(node => node.nodeType === Node.TEXT_NODE)?.textContent?.trim();

        if (userText) {
            messages.push({
                role: "user",
                content: userText
            });
        }

        // AI 回复容器 - 在用户消息后面的元素
        const aiContainer = userContainer.nextElementSibling;
        if (aiContainer && (aiContainer.classList.contains('_4f9bf79') ||
            aiContainer.classList.contains('_43c05b5'))) {
            
            // 查找复制按钮
            const copyButtonContainer = aiContainer.querySelector('.ds-flex[style*="margin-top: 12px"][style*="height: 20px"][style*="align-items: center"]');
            if (copyButtonContainer) {
                const buttonGroup = copyButtonContainer.querySelector('.ds-flex[style*="align-items: center"][style*="gap: 16px"], .ds-flex[style*="align-items: center"][style*="gap: 12px"], .ds-flex._965abe9');
                if (buttonGroup) {
                    const copyButton = buttonGroup.querySelector('.ds-icon-button:first-child');
                    if (copyButton) {
                        try {
                            // 使用异步函数获取消息内容
                            const content = await getContentViaCopyButton(copyButton);
                            if (content) {
                                messages.push({
                                    role: "assistant",
                                    content: content
                                });
                            }
                        } catch (error) {
                            console.error('使用复制按钮获取内容失败:', error);
                            fallbackToOldMethod(aiContainer, messages);
                        }
                    } else {
                        fallbackToOldMethod(aiContainer, messages);
                    }
                } else {
                    fallbackToOldMethod(aiContainer, messages);
                }
            } else {
                fallbackToOldMethod(aiContainer, messages);
            }
        }
    }

    return messages;
}