// 获取对话内容
function getMessages() {
    
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
    
    console.log('messages:', messages);
    return messages;
}