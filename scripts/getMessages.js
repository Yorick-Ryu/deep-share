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
    const messages = [];
    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            const messageDiv = checkbox.closest('._9663006, ._4f9bf79._43c05b5, ._4f9bf79.d7dc56a8._43c05b5');
            if (messageDiv) {
                // 提取消息内容
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
                    // 查找复制按钮
                    const copyButtonContainer = messageDiv.querySelector('.ds-flex[style*="margin-top: 12px"][style*="height: 20px"][style*="align-items: center"]');
                    if (copyButtonContainer) {
                        const buttonGroup = copyButtonContainer.querySelector('.ds-flex[style*="align-items: center"][style*="gap: 16px"], .ds-flex[style*="align-items: center"][style*="gap: 12px"], .ds-flex._965abe9');
                        if (buttonGroup) {
                            const copyButton = buttonGroup.querySelector('.ds-icon-button:first-child');
                            if (copyButton) {
                                // 创建一个临时元素用于存储复制按钮点击后的文本
                                const tempTextarea = document.createElement('textarea');
                                tempTextarea.style.position = 'fixed';
                                tempTextarea.style.left = '-999px';
                                document.body.appendChild(tempTextarea);

                                // 保存当前剪贴板内容（如果需要）
                                let originalClipboard = '';
                                try {
                                    originalClipboard = navigator.clipboard.readText();
                                } catch (error) {
                                    console.error('无法读取当前剪贴板内容:', error);
                                }

                                // 点击复制按钮
                                copyButton.click();
                                
                                // 在这里我们需要一个小延迟，确保复制操作完成
                                setTimeout(async () => {
                                    try {
                                        // 从剪贴板获取文本
                                        const clipboardContent = await navigator.clipboard.readText();
                                        
                                        // 创建AI消息对象
                                        if (clipboardContent) {
                                            const assistantMessage = {
                                                role: "assistant",
                                                content: clipboardContent
                                            };

                                            messages.push(assistantMessage);
                                        }
                                        
                                        // 如果需要，恢复原来的剪贴板内容
                                        if (originalClipboard) {
                                            navigator.clipboard.writeText(originalClipboard);
                                        }
                                    } catch (error) {
                                        console.error('无法从剪贴板获取文本:', error);
                                        
                                        // 失败时回退到旧方法
                                        const response = messageDiv.querySelector('.ds-markdown--block')?.textContent.trim() || '';
                                        if (response) {
                                            const assistantMessage = {
                                                role: "assistant",
                                                content: response
                                            };

                                            messages.push(assistantMessage);
                                        }
                                    } finally {
                                        // 移除临时元素
                                        document.body.removeChild(tempTextarea);
                                    }
                                }, 500);
                            } else {
                                // 如果找不到复制按钮，回退到旧方法
                                fallbackToOldMethod();
                            }
                        } else {
                            // 如果找不到按钮组，回退到旧方法
                            fallbackToOldMethod();
                        }
                    } else {
                        // 如果找不到按钮容器，回退到旧方法
                        fallbackToOldMethod();
                    }
                    
                    // 回退到旧方法的辅助函数
                    function fallbackToOldMethod() {
                        const response = messageDiv.querySelector('.ds-markdown--block')?.textContent.trim() || '';

                        if (response) {
                            const assistantMessage = {
                                role: "assistant",
                                content: response
                            };

                            messages.push(assistantMessage);
                        }
                    }
                }
            }
        }
    });

    return messages;
}

// 获取所有对话的函数
function getAllMessages() {
    const userMessageContainers = document.querySelectorAll('._9663006');
    let messages = [];

    Array.from(userMessageContainers).forEach((userContainer) => {
        // 获取用户问题 - 保持不变
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
                        // 创建一个临时元素用于存储复制按钮点击后的文本
                        const tempTextarea = document.createElement('textarea');
                        tempTextarea.style.position = 'fixed';
                        tempTextarea.style.left = '-999px';
                        document.body.appendChild(tempTextarea);

                        // 保存当前剪贴板内容（如果需要）
                        let originalClipboard = '';
                        try {
                            originalClipboard = navigator.clipboard.readText();
                        } catch (error) {
                            console.error('无法读取当前剪贴板内容:', error);
                        }

                        // 点击复制按钮
                        copyButton.click();
                        
                        // 在这里我们需要一个小延迟，确保复制操作完成
                        setTimeout(async () => {
                            try {
                                // 从剪贴板获取文本
                                const clipboardContent = await navigator.clipboard.readText();
                                
                                // 创建AI消息对象
                                if (clipboardContent) {
                                    const assistantMessage = {
                                        role: "assistant",
                                        content: clipboardContent
                                    };

                                    messages.push(assistantMessage);
                                }
                                
                                // 如果需要，恢复原来的剪贴板内容
                                if (originalClipboard) {
                                    navigator.clipboard.writeText(originalClipboard);
                                }
                            } catch (error) {
                                console.error('无法从剪贴板获取文本:', error);
                                
                                // 失败时回退到旧方法
                                fallbackToOldMethod();
                            } finally {
                                // 移除临时元素
                                document.body.removeChild(tempTextarea);
                            }
                        }, 500);
                    } else {
                        // 如果找不到复制按钮，回退到旧方法
                        fallbackToOldMethod();
                    }
                } else {
                    // 如果找不到按钮组，回退到旧方法
                    fallbackToOldMethod();
                }
            } else {
                // 如果找不到按钮容器，回退到旧方法
                fallbackToOldMethod();
            }
            
            // 回退到旧方法的辅助函数
            function fallbackToOldMethod() {
                // 最终回复
                const response = aiContainer.querySelector('.ds-markdown--block')?.textContent.trim() || '';

                if (response) {
                    const assistantMessage = {
                        role: "assistant",
                        content: response
                    };

                    messages.push(assistantMessage);
                }
            }
        }
    });

    return messages;
}