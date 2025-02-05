chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'capture') {
    chrome.tabs.captureVisibleTab(null, {}, (dataUrl) => {
      // Process the captured image and handle longImage option
      // ...existing code...
    });
  } else if (request.action === 'process_capture') {
    const conversations = request.data;
    const longImage = request.longImage;
    
    // 处理对话内容，生成图片
    // TODO: 实现图片生成逻辑
    console.log('Captured conversations:', conversations);
  }
});
