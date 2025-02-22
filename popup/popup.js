// 加载保存的设置
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get(['customWatermark', 'hideDefaultWatermark'], (data) => {
    document.getElementById('watermark').value = data.customWatermark || '';
    document.getElementById('hideDefaultWatermark').checked = !!data.hideDefaultWatermark;
  });

  // Set all i18n text
  document.getElementById('extensionDescription').textContent = chrome.i18n.getMessage('extensionDescription');
  document.getElementById('hideDefaultWatermarkLabel').textContent = chrome.i18n.getMessage('hideDefaultWatermarkLabel');
  document.getElementById('customWatermarkLabel').textContent = chrome.i18n.getMessage('customWatermarkLabel');
  document.getElementById('watermark').placeholder = chrome.i18n.getMessage('customWatermarkPlaceholder');
  document.getElementById('save').textContent = chrome.i18n.getMessage('saveSettings');
  document.getElementById('sponsorTitle').textContent = chrome.i18n.getMessage('sponsorTitle');
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
    button.textContent = chrome.i18n.getMessage('settingsSaved');

    // Show sponsor section
    document.getElementById('sponsorSection').style.display = 'block';

    setTimeout(() => {
      button.textContent = chrome.i18n.getMessage('saveSettings');
    }, 1000);
  });
});
