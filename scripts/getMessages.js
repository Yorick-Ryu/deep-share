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

                    const thinkTime = messageDiv.querySelector('._58a6d71._19db599')?.textContent.trim() || '';
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
    const userMessageContainers = document.querySelectorAll('._9663006');
    let messages = [];

    Array.from(userMessageContainers).forEach((userContainer) => {
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
            // 思考内容和时间
            const thinkingContent = Array.from(aiContainer.querySelectorAll('.e1675d8b .ba94db8a'))
                .map(p => p.textContent.trim())
                .filter(Boolean)
                .join('\n');

            // 解析思考时间，只保留数字
            const thinkTime = aiContainer.querySelector('._58a6d71._19db599')?.textContent.trim() || '';
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