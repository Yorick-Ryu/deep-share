// Initialize and load settings
document.addEventListener('DOMContentLoaded', () => {
  // Check for action parameters in the URL
  const urlParams = new URLSearchParams(window.location.search);
  const action = urlParams.get('action');
  const highlightApiKey = action === 'apiKeyMissing';

  // Load saved settings
  loadSettings(highlightApiKey);

  // Set up tab switching
  setupTabs();

  // Set up auto-save functionality
  setupAutoSave();

  // Set up other UI elements
  setupUIElements();

  // Set all i18n text
  loadI18nText();
});

// Function to load saved settings
function loadSettings(highlightApiKey = false) {
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
    document.getElementById('docxServerUrl').value = data.docxServerUrl || 'https://api.ds.rick216.cn';
    
    const apiKeyInput = document.getElementById('docxApiKey');
    apiKeyInput.value = data.docxApiKey || '';
    
    // Always set docx mode to API
    document.getElementById('modeApi').checked = true;

    // If API key is set, check quota
    if (data.docxApiKey) {
      checkQuota();
    }
    
    // If API key is missing and we should highlight it, add highlighting and focus
    if (highlightApiKey || (!data.docxApiKey && highlightApiKey !== false)) {
      // Add highlight class to API key input
      apiKeyInput.classList.add('highlight-required');
      
      // Ensure the API key tab is active
      document.querySelector('.tab-btn[data-tab="docx-tab"]').click();
      
      // Focus on API key input
      setTimeout(() => {
        apiKeyInput.focus();
        
        // Remove highlight when user starts typing
        apiKeyInput.addEventListener('input', function onInput() {
          apiKeyInput.classList.remove('highlight-required');
          apiKeyInput.removeEventListener('input', onInput);
        });
      }, 100);
    }
  });
}

// Set up tab switching functionality
function setupTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTabId = button.getAttribute('data-tab');
      
      // Update active tab button
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
      });
      button.classList.add('active');
      
      // Show the selected tab content
      document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
      });
      document.getElementById(targetTabId).classList.add('active');
    });
  });
}

// Set up auto-save functionality
function setupAutoSave() {
  // Get all input elements that need auto-save
  const inputs = [
    document.getElementById('watermark'),
    document.getElementById('hideDefaultWatermark'),
    document.getElementById('docxServerUrl'),
    document.getElementById('docxApiKey'),
    document.getElementById('modeApi'),
    document.getElementById('modeLocal')
  ];
  
  // Add change event listeners to each input
  inputs.forEach(input => {
    input.addEventListener('change', saveSettings);
    // For text inputs, also listen for 'input' with small delay
    if (input.type === 'text' || input.type === 'password') {
      input.addEventListener('input', debounce(saveSettings, 500));
    }
  });
}

// Debounce function to prevent too many saves on text input
function debounce(func, delay) {
  let timeout;
  return function() {
    const context = this;
    const args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), delay);
  };
}

// Set up other UI elements
function setupUIElements() {
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

  // Set up quota refresh button event
  document.getElementById('refreshQuota').addEventListener('click', () => {
    checkQuota(true);
  });
}

// Load all i18n text
function loadI18nText() {
  // Tab labels
  document.getElementById('docxTabLabel').textContent = chrome.i18n.getMessage('docxSettings') || 'Document Conversion';
  document.getElementById('watermarkTabLabel').textContent = chrome.i18n.getMessage('watermarkSettings') || 'Watermark';
  document.getElementById('sponsorTabLabel').textContent = chrome.i18n.getMessage('sponsorTabLabel') || 'Sponsor';
  document.getElementById('sponsorTabTitle').textContent = chrome.i18n.getMessage('sponsorTabLabel') || 'Sponsor';
  
  // Document Conversion tab
  document.getElementById('docxSettingsTitle').textContent = chrome.i18n.getMessage('docxSettings') || 'Word (DOCX) Conversion';
  document.getElementById('docxModeLabel').textContent = chrome.i18n.getMessage('docxModeLabel') || 'Conversion Mode';
  document.getElementById('modeLocalLabel').textContent = chrome.i18n.getMessage('modeLocalLabel') || 'Local';
  document.getElementById('modeApiLabel').textContent = chrome.i18n.getMessage('modeApiLabel') || 'API';
  document.getElementById('docxServerUrlLabel').textContent = chrome.i18n.getMessage('docxServerUrlLabel') || 'Server URL';
  document.getElementById('docxApiKeyLabel').textContent = chrome.i18n.getMessage('docxApiKeyLabel') || 'API Key';
  
  // Watermark tab
  document.getElementById('watermarkSettingsTitle').textContent = chrome.i18n.getMessage('watermarkSettings') || 'Watermark Settings';
  document.getElementById('hideDefaultWatermarkLabel').textContent = chrome.i18n.getMessage('hideDefaultWatermarkLabel') || 'Hide Default Watermark';
  document.getElementById('customWatermarkLabel').textContent = chrome.i18n.getMessage('customWatermarkLabel') || 'Custom Watermark Text (Optional)';
  document.getElementById('watermark').placeholder = chrome.i18n.getMessage('customWatermarkPlaceholder') || 'Enter custom watermark here';

  // Sponsor tab
  document.getElementById('sponsorTitle').textContent = chrome.i18n.getMessage('sponsorTitle');
}

// Function to save settings
function saveSettings() {
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
    console.log('Settings saved automatically');
    
    const apiKey = document.getElementById('docxApiKey').value;
    if (apiKey) {
      // Check quota after saving if API key is provided
      setTimeout(checkQuota, 500);
    }
  });
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
