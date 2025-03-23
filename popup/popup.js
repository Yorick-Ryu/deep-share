// 加载保存的设置
document.addEventListener('DOMContentLoaded', () => {
  // Load saved settings
  chrome.storage.sync.get([
    'customWatermark', 
    'hideDefaultWatermark',
    /* Temporarily commented out
    'docxServerUrl',
    'docxMode'
    */
  ], (data) => {
    // Watermark settings
    document.getElementById('watermark').value = data.customWatermark || '';
    document.getElementById('hideDefaultWatermark').checked = !!data.hideDefaultWatermark;
    
    /* Temporarily commented out
    // DOCX conversion settings
    document.getElementById('docxServerUrl').value = data.docxServerUrl || 'http://127.0.0.1:8000';
    
    // Set docx mode - default to local if not set
    const mode = data.docxMode || 'local';
    document.querySelector(`input[name="docxMode"][value="${mode}"]`).checked = true;
    
    // Handle server URL field visibility based on mode
    toggleServerUrlVisibility(mode);
    */
  });

  // Set all i18n text
  document.getElementById('extensionDescription').textContent = chrome.i18n.getMessage('extensionDescription');
  document.getElementById('watermarkSettingsTitle').textContent = chrome.i18n.getMessage('watermarkSettings') || 'Watermark Settings';
  document.getElementById('hideDefaultWatermarkLabel').textContent = chrome.i18n.getMessage('hideDefaultWatermarkLabel');
  document.getElementById('customWatermarkLabel').textContent = chrome.i18n.getMessage('customWatermarkLabel');
  document.getElementById('watermark').placeholder = chrome.i18n.getMessage('customWatermarkPlaceholder');
  /* Temporarily commented out
  document.getElementById('docxSettingsTitle').textContent = chrome.i18n.getMessage('docxSettings') || 'Word (DOCX) Conversion';
  document.getElementById('docxModeLabel').textContent = chrome.i18n.getMessage('docxModeLabel') || 'Conversion Mode';
  document.getElementById('modeLocalLabel').textContent = chrome.i18n.getMessage('modeLocalLabel') || 'Local';
  document.getElementById('modeApiLabel').textContent = chrome.i18n.getMessage('modeApiLabel') || 'API';
  document.getElementById('docxServerUrlLabel').textContent = chrome.i18n.getMessage('docxServerUrlLabel') || 'Server URL';
  */
  document.getElementById('save').textContent = chrome.i18n.getMessage('saveSettings');
  document.getElementById('sponsorTitle').textContent = chrome.i18n.getMessage('sponsorTitle');
  
  // Toggle card expansion when header is clicked
  document.querySelectorAll('.card-header').forEach(header => {
    header.addEventListener('click', () => {
      const parent = header.parentElement;
      const body = parent.querySelector('.card-body');
      
      if (header.classList.contains('collapsed')) {
        // Expand
        header.classList.remove('collapsed');
        body.style.display = 'block';
      } else {
        // Collapse
        header.classList.add('collapsed');
        body.style.display = 'none';
      }
    });
  });
  
  /* Temporarily commented out
  // Add event listeners for docx mode radio buttons
  document.querySelectorAll('input[name="docxMode"]').forEach(radio => {
    radio.addEventListener('change', function() {
      toggleServerUrlVisibility(this.value);
    });
  });
  */
});

/* Temporarily commented out
// Toggle server URL field visibility based on selected mode
function toggleServerUrlVisibility(mode) {
  const serverUrlGroup = document.querySelector('label[for="docxServerUrl"]').parentNode;
  serverUrlGroup.style.display = mode === 'api' ? 'block' : 'none';
}
*/

// 保存设置
document.getElementById('save').addEventListener('click', () => {
  /* Temporarily commented out
  // Get selected docx mode
  const docxMode = document.querySelector('input[name="docxMode"]:checked').value;
  */
  
  // Collect all settings
  const settings = {
    // Watermark settings
    customWatermark: document.getElementById('watermark').value,
    hideDefaultWatermark: document.getElementById('hideDefaultWatermark').checked,
    
    /* Temporarily commented out
    // DOCX settings
    docxServerUrl: document.getElementById('docxServerUrl').value,
    docxMode: docxMode
    */
  };

  // Save all settings at once
  chrome.storage.sync.set(settings, () => {
    const button = document.getElementById('save');
    button.textContent = chrome.i18n.getMessage('settingsSaved');

    // Show sponsor section
    document.getElementById('sponsorSection').style.display = 'block';

    setTimeout(() => {
      button.textContent = chrome.i18n.getMessage('saveSettings');
    }, 1000);
  });
});
