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
        // 使用更通用的选择器来定位消息容器
        const messageDiv = checkbox.closest('._9663006, [class*="_4f9bf79"]');
        if (messageDiv) {
            // 用户消息容器包含 '_9663006' 类或内部有 '.d29f3d7d' 
            if (messageDiv.matches('._9663006') || messageDiv.querySelector('.d29f3d7d')) {
                // 用户问题 - 提取逻辑保持不变
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
                // AI 回复 - 使用更可靠的方式定位复制按钮
                const copyButton = messageDiv.querySelector('svg path[d*="M6.14926"]')?.closest('[role="button"]');
                if (copyButton) {
                    try {
                        // 通过模拟点击复制按钮来获取内容
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
                    // 如果找不到复制按钮，则回退到旧的提取方法
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
    const messages = [];
    // 选择页面上所有的消息容器
    const allMessageDivs = document.querySelectorAll('._9663006, [class*="_4f9bf79"]');

    for (const messageDiv of allMessageDivs) {
        // 判断是否为用户消息
        if (messageDiv.matches('._9663006') || messageDiv.querySelector('.d29f3d7d')) {
            const userElement = messageDiv.querySelector('.fbb737a4');
            const userText = Array.from(userElement?.childNodes || [])
                .find(node => node.nodeType === Node.TEXT_NODE)?.textContent?.trim();

            if (userText) {
                messages.push({
                    role: "user",
                    content: userText
                });
            }
        } 
        // 判断是否为AI回答
        else if (messageDiv.matches('[class*="_4f9bf79"]')) {
            // 使用更可靠的方式定位复制按钮
            const copyButton = messageDiv.querySelector('svg path[d*="M6.14926"]')?.closest('[role="button"]');
            if (copyButton) {
                try {
                    // 通过模拟点击复制按钮来获取内容
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
                // 如果找不到复制按钮，则回退到旧的提取方法
                fallbackToOldMethod(messageDiv, messages);
            }
        }
    }

    return messages;
}