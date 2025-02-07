// 加载保存的设置
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get(['customWatermark', 'hideDefaultWatermark'], (data) => {
    document.getElementById('watermark').value = data.customWatermark || '';
    document.getElementById('hideDefaultWatermark').checked = !!data.hideDefaultWatermark;
  });
});

// 保存设置
document.getElementById('save').addEventListener('click', () => {
  const watermark = document.getElementById('watermark').value;
  const hideDefaultWatermark = document.getElementById('hideDefaultWatermark').checked;
  
  chrome.storage.sync.set({ 
    customWatermark: watermark,
    hideDefaultWatermark: hideDefaultWatermark 
  }, () => {
    const button = document.getElementById('save');
    button.textContent = '已保存';
    setTimeout(() => {
      button.textContent = '保存设置';
    }, 1000);
  });
});
