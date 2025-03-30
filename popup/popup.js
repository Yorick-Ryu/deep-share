// 加载保存的设置
document.addEventListener('DOMContentLoaded', () => {
  // Load saved settings
  chrome.storage.sync.get([
    'customWatermark', 
    'hideDefaultWatermark',
    'docxServerUrl',
    'docxApiKey',
    'docxMode'
  ], (data) => {
    // Watermark settings
    document.getElementById('watermark').value = data.customWatermark || '';
    document.getElementById('hideDefaultWatermark').checked = !!data.hideDefaultWatermark;
    
    // DOCX conversion settings
    document.getElementById('docxServerUrl').value = data.docxServerUrl || 'http://127.0.0.1:8000';
    document.getElementById('docxApiKey').value = data.docxApiKey || '';
    
    // Always set docx mode to API
    document.getElementById('modeApi').checked = true;
    
    // Always show server URL field
    const serverUrlGroup = document.querySelector('label[for="docxServerUrl"]').parentNode;
    serverUrlGroup.style.display = 'block';

    // If API key is set, check quota
    if (data.docxApiKey) {
      checkQuota();
    }
  });

  // Set all i18n text
  document.getElementById('extensionDescription').textContent = chrome.i18n.getMessage('extensionDescription');
  document.getElementById('watermarkSettingsTitle').textContent = chrome.i18n.getMessage('watermarkSettings') || 'Watermark Settings';
  document.getElementById('hideDefaultWatermarkLabel').textContent = chrome.i18n.getMessage('hideDefaultWatermarkLabel');
  document.getElementById('customWatermarkLabel').textContent = chrome.i18n.getMessage('customWatermarkLabel');
  document.getElementById('watermark').placeholder = chrome.i18n.getMessage('customWatermarkPlaceholder');
  document.getElementById('docxSettingsTitle').textContent = chrome.i18n.getMessage('docxSettings') || 'Word (DOCX) Conversion';
  document.getElementById('docxModeLabel').textContent = chrome.i18n.getMessage('docxModeLabel') || 'Conversion Mode';
  document.getElementById('modeLocalLabel').textContent = chrome.i18n.getMessage('modeLocalLabel') || 'Local';
  document.getElementById('modeApiLabel').textContent = chrome.i18n.getMessage('modeApiLabel') || 'API';
  document.getElementById('docxServerUrlLabel').textContent = chrome.i18n.getMessage('docxServerUrlLabel') || 'Server URL';
  document.getElementById('docxApiKeyLabel').textContent = chrome.i18n.getMessage('docxApiKeyLabel') || 'API Key';
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

  // Set up quota refresh button event
  document.getElementById('refreshQuota').addEventListener('click', () => {
    checkQuota(true);
  });

  // Set up API key visibility toggle
  const toggleApiKeyBtn = document.getElementById('toggleApiKeyVisibility');
  const apiKeyInput = document.getElementById('docxApiKey');
  const eyeIcon = toggleApiKeyBtn.querySelector('.eye-icon');
  const eyeOffIcon = toggleApiKeyBtn.querySelector('.eye-off-icon');
  
  toggleApiKeyBtn.addEventListener('click', () => {
    if (apiKeyInput.type === 'password') {
      apiKeyInput.type = 'text';
      eyeIcon.style.display = 'none';
      eyeOffIcon.style.display = 'block';
    } else {
      apiKeyInput.type = 'password';
      eyeIcon.style.display = 'block';
      eyeOffIcon.style.display = 'none';
    }
  });
  
  // Set up API key copy button
  const copyApiKeyBtn = document.getElementById('copyApiKey');
  
  copyApiKeyBtn.addEventListener('click', () => {
    const apiKey = apiKeyInput.value.trim();
    
    if (!apiKey) {
      return;
    }
    
    // Copy to clipboard
    navigator.clipboard.writeText(apiKey).then(() => {
      // Show success tooltip
      const tooltip = document.createElement('span');
      tooltip.className = 'copy-tooltip';
      tooltip.textContent = '已复制!';
      copyApiKeyBtn.appendChild(tooltip);
      
      // Remove tooltip after animation completes
      setTimeout(() => {
        if (tooltip.parentNode === copyApiKeyBtn) {
          copyApiKeyBtn.removeChild(tooltip);
        }
      }, 1500);
    });
  });
});

// Modify toggleServerUrlVisibility to always show the server URL
function toggleServerUrlVisibility(mode) {
  const serverUrlGroup = document.querySelector('label[for="docxServerUrl"]').parentNode;
  serverUrlGroup.style.display = 'block'; // Always show
}

// Function to check quota
function checkQuota(forceRefresh = false) {
  const quotaSection = document.getElementById('quotaSection');
  const apiKey = document.getElementById('docxApiKey').value;
  const serverUrl = document.getElementById('docxServerUrl').value;
  
  // If API key is not set, hide quota section
  if (!apiKey || !serverUrl) {
    quotaSection.style.display = 'none';
    return;
  }
  
  // First try to get cached quota data
  chrome.storage.local.get(['quotaData'], async (result) => {
    const cachedData = result.quotaData;
    const now = new Date();
    
    // If we have cached data and it's not a forced refresh, use it
    if (cachedData && !forceRefresh) {
      const lastChecked = new Date(cachedData.lastChecked);
      // Use cached data if it's less than 5 minutes old
      if ((now - lastChecked) < 5 * 60 * 1000) {
        displayQuotaData(cachedData);
        return;
      }
    }
    
    // Otherwise fetch new data
    try {
      // Show loading state
      document.getElementById('totalQuota').textContent = '...';
      document.getElementById('usedQuota').textContent = '...';
      document.getElementById('remainingQuota').textContent = '...';
      quotaSection.style.display = 'block';
      
      const response = await fetch(`${serverUrl}/auth/quota`, {
        method: 'GET',
        headers: {
          'X-API-Key': apiKey
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Store quota data with timestamp
      const quotaData = {
        total: data.total_quota,
        used: data.used_quota,
        remaining: data.remaining_quota,
        lastChecked: now.toISOString()
      };
      
      chrome.storage.local.set({ quotaData });
      displayQuotaData(quotaData);
      
    } catch (error) {
      console.error('Error checking quota:', error);
      document.getElementById('totalQuota').textContent = 'Error';
      document.getElementById('usedQuota').textContent = 'Error';
      document.getElementById('remainingQuota').textContent = 'Error';
    }
  });
}

// Function to display quota data
function displayQuotaData(data) {
  const quotaSection = document.getElementById('quotaSection');
  quotaSection.style.display = 'block';
  
  document.getElementById('totalQuota').textContent = data.total;
  document.getElementById('usedQuota').textContent = data.used;
  document.getElementById('remainingQuota').textContent = data.remaining;
  
  // Update progress bar to show remaining quota percentage instead of used
  const progressBar = document.getElementById('quotaProgress');
  const remainingPercentage = (data.remaining / data.total) * 100;
  progressBar.style.width = `${remainingPercentage}%`;
  
  // Change color if running low
  if (data.remaining < data.total * 0.2) {
    progressBar.style.backgroundColor = '#FF6B6B';
  } else {
    progressBar.style.backgroundColor = '#4D6BFE';
  }
}

// 保存设置
document.getElementById('save').addEventListener('click', () => {
  // Always use API mode
  const docxMode = 'api';
  
  // Collect all settings
  const settings = {
    // Watermark settings
    customWatermark: document.getElementById('watermark').value,
    hideDefaultWatermark: document.getElementById('hideDefaultWatermark').checked,
    
    // DOCX settings
    docxServerUrl: document.getElementById('docxServerUrl').value,
    docxApiKey: document.getElementById('docxApiKey').value,
    docxMode: docxMode
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

    const apiKey = document.getElementById('docxApiKey').value;
    if (apiKey) {
      // Check quota after saving if API key is provided
      setTimeout(checkQuota, 500);
    }
  });
});
