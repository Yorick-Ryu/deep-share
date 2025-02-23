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
            const messageDiv = checkbox.closest('.fa81, .f9bf7997.c05b5566');
            if (messageDiv) {
                // 提取消息内容
                if (messageDiv.classList.contains('fa81')) {
                    // 用户问题
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
                    // AI 回复
                    const thinkingContent = Array.from(messageDiv.querySelectorAll('.e1675d8b .ba94db8a'))
                        .map(p => p.textContent.trim())
                        .filter(Boolean)
                        .join('\n');

                    const thinkTime = messageDiv.querySelector('.a6d716f5.db5991dd')?.textContent.trim() || '';
                    const timeNumber = parseInt(thinkTime.match(/\d+/)?.[0] || '0');

                    const response = messageDiv.querySelector('.ds-markdown--block')?.textContent.trim() || '';

                    if (response) {
                        const assistantMessage = {
                            role: "assistant",
                            content: response
                        };

                        if (thinkingContent) {
                            assistantMessage.reasoning_content = thinkingContent;
                            assistantMessage.reasoning_time = timeNumber;
                        }

                        messages.push(assistantMessage);
                    }
                }
            }
        }
    });

    return messages;
}

// 获取所有对话的函数
function getAllMessages() {
    const dialogGroups = document.querySelectorAll('.fa81');
    let messages = [];

    Array.from(dialogGroups).forEach((group, index) => {

        // 获取用户问题
        const userElement = group.querySelector('.fbb737a4');
        const userText = Array.from(userElement?.childNodes || [])
            .find(node => node.nodeType === Node.TEXT_NODE)?.textContent?.trim();

        if (userText) {
            messages.push({
                role: "user",
                content: userText
            });
        }

        // AI 回复容器
        const aiContainer = document.querySelector(`.f9bf7997[data-conversation-id="${group.dataset.conversationId}"]`) ||
            group.nextElementSibling;

        if (aiContainer?.classList.contains('f9bf7997')) {
            // 思考内容和时间
            const thinkingContent = Array.from(aiContainer.querySelectorAll('.e1675d8b .ba94db8a'))
                .map(p => p.textContent.trim())
                .filter(Boolean)
                .join('\n');

            // 解析思考时间，只保留数字
            const thinkTime = aiContainer.querySelector('.a6d716f5.db5991dd')?.textContent.trim() || '';
            const timeNumber = parseInt(thinkTime.match(/\d+/)?.[0] || '0');

            // 最终回复
            const response = aiContainer.querySelector('.ds-markdown--block')?.textContent.trim() || '';

            if (response) {
                const assistantMessage = {
                    role: "assistant",
                    content: response
                };

                // 如果有思考内容，添加相应字段
                if (thinkingContent) {
                    assistantMessage.reasoning_content = thinkingContent;
                    assistantMessage.reasoning_time = timeNumber;
                }

                messages.push(assistantMessage);
            }
        }
    });

    return messages;
}