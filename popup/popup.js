// 加载保存的水印
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get('customWatermark', (data) => {
    document.getElementById('watermark').value = data.customWatermark || '';
  });
});

// 保存设置
document.getElementById('save').addEventListener('click', () => {
  const watermark = document.getElementById('watermark').value;
  chrome.storage.sync.set({ customWatermark: watermark }, () => {
    const button = document.getElementById('save');
    button.textContent = '已保存';
    setTimeout(() => {
      button.textContent = '保存设置';
    }, 1000);
  });
});
