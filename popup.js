document.getElementById('capture').addEventListener('click', () => {
  const longImage = document.getElementById('longImage').checked;
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: 'capture', longImage });
  });
});
