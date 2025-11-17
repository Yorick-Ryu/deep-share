// Language configuration
const lang = window.DEEPSHARE_LANG || 'zh';

// Fixed server URL
const SERVER_URL = 'https://api.deepshare.app';

// i18n text
const i18n = {
  zh: {
    emptyMarkdownError: '请输入Markdown文本',
    apiKeyMissing: '请购买或填写API-Key以使用文档转换功能',
    apiKeyInvalid: 'API Key输入错误',
    converting: '正在转换...',
    conversionSuccess: '转换成功!',
    conversionFailed: '转换失败',
    copied: '已复制!',
    unknown: '未知',
    universalTemplate: '通用模版',
    validUntil: '有效期至:',
    yourQuota: '您的转换次数',
    dateFormat: (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}年${month}月${day}日`;
    }
  },
  en: {
    emptyMarkdownError: 'Please enter Markdown text',
    apiKeyMissing: 'Please purchase or enter an API Key to use the document conversion feature',
    apiKeyInvalid: 'Invalid API Key',
    converting: 'Converting...',
    conversionSuccess: 'Conversion successful!',
    conversionFailed: 'Conversion failed',
    copied: 'Copied!',
    unknown: 'Unknown',
    universalTemplate: 'Universal Template',
    validUntil: 'Valid until:',
    yourQuota: 'Your Conversion Quota',
    dateFormat: (date) => {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  }
};

// Get text based on current language
const t = (key, ...args) => {
  const text = i18n[lang]?.[key] || i18n.zh[key];
  return typeof text === 'function' ? text(...args) : text;
};

// Notification system
function showNotification(message, type = 'error') {
  // Remove existing notification if any
  const existingNotification = document.querySelector('.notification');
  if (existingNotification) {
    existingNotification.remove();
  }

  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  
  // Create icon based on type
  let iconSVG = '';
  if (type === 'error') {
    iconSVG = `
      <svg class="notification-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="15" y1="9" x2="9" y2="15"></line>
        <line x1="9" y1="9" x2="15" y2="15"></line>
      </svg>
    `;
  } else if (type === 'success') {
    iconSVG = `
      <svg class="notification-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
    `;
  } else if (type === 'warning') {
    iconSVG = `
      <svg class="notification-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
    `;
  }

  notification.innerHTML = `
    ${iconSVG}
    <span class="notification-text">${message}</span>
    <button class="notification-close" aria-label="Close">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  `;

  // Append to body
  document.body.appendChild(notification);

  // Trigger animation
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);

  // Auto dismiss after 4 seconds
  const dismissTimeout = setTimeout(() => {
    dismissNotification(notification);
  }, 4000);

  // Close button handler
  const closeBtn = notification.querySelector('.notification-close');
  closeBtn.addEventListener('click', () => {
    clearTimeout(dismissTimeout);
    dismissNotification(notification);
  });
}

function dismissNotification(notification) {
  notification.classList.remove('show');
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 300);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  // Load saved settings
  loadSettings();

  // Set up UI elements
  setupUIElements();

  // Set up template selector
  setupTemplateSelector();

  // Set up manual conversion functionality
  setupManualConversion();

  // Set up auto-save functionality
  setupAutoSave();
});

// Function to load saved settings from localStorage
function loadSettings() {
  try {
    const settings = {
      docxApiKey: localStorage.getItem('docxApiKey') || '',
      convertMermaid: localStorage.getItem('convertMermaid') === 'true',
      removeDividers: localStorage.getItem('removeDividers') === 'true',
      removeEmojis: localStorage.getItem('removeEmojis') === 'true',
      lastUsedTemplate: localStorage.getItem('lastUsedTemplate') || 'templates',
      markdownText: localStorage.getItem('markdownText') || ''
    };

    document.getElementById('docxApiKey').value = settings.docxApiKey;
    document.getElementById('convertMermaid').checked = settings.convertMermaid;
    document.getElementById('removeDividers').checked = settings.removeDividers;
    document.getElementById('removeEmojis').checked = settings.removeEmojis;
    document.getElementById('markdownInput').value = settings.markdownText;

    // If API key is set, check quota
    if (settings.docxApiKey) {
      checkQuota();
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

// Function to save settings to localStorage
function saveSettings() {
  try {
    const settings = {
      docxApiKey: document.getElementById('docxApiKey').value,
      convertMermaid: document.getElementById('convertMermaid').checked,
      removeDividers: document.getElementById('removeDividers').checked,
      removeEmojis: document.getElementById('removeEmojis').checked,
      lastUsedTemplate: document.getElementById('wordTemplateSelect').value,
      markdownText: document.getElementById('markdownInput').value
    };

    localStorage.setItem('docxApiKey', settings.docxApiKey);
    localStorage.setItem('convertMermaid', settings.convertMermaid);
    localStorage.setItem('removeDividers', settings.removeDividers);
    localStorage.setItem('removeEmojis', settings.removeEmojis);
    localStorage.setItem('lastUsedTemplate', settings.lastUsedTemplate);
    localStorage.setItem('markdownText', settings.markdownText);

    console.log('Settings saved');

    // Check quota after saving if API key is provided
    if (settings.docxApiKey) {
      setTimeout(checkQuota, 500);
    }
  } catch (error) {
    console.error('Error saving settings:', error);
  }
}

// Set up auto-save functionality
function setupAutoSave() {
  const inputs = [
    document.getElementById('docxApiKey'),
    document.getElementById('convertMermaid'),
    document.getElementById('removeDividers'),
    document.getElementById('removeEmojis'),
    document.getElementById('wordTemplateSelect')
  ];

  inputs.forEach(input => {
    input.addEventListener('change', saveSettings);
    // For text inputs, also listen for 'input' with debounce
    if (input.type === 'text' || input.type === 'password') {
      input.addEventListener('input', debounce(saveSettings, 500));
    }
  });

  // Auto-save markdown input with debounce
  const markdownInput = document.getElementById('markdownInput');
  markdownInput.addEventListener('input', debounce(saveSettings, 1000));
}

// Debounce function
function debounce(func, delay) {
  let timeout;
  return function () {
    const context = this;
    const args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), delay);
  };
}

// Set up UI elements
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
      tooltip.textContent = t('copied');
      copyApiKeyBtn.appendChild(tooltip);

      // Remove tooltip after animation completes
      setTimeout(() => {
        if (tooltip.parentNode === copyApiKeyBtn) {
          copyApiKeyBtn.removeChild(tooltip);
        }
      }, 1500);
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  });

  // Set up quota refresh button
  document.getElementById('refreshQuota').addEventListener('click', () => {
    checkQuota(true);
  });
}

// Function to check quota
async function checkQuota(forceRefresh = false) {
  const quotaSection = document.getElementById('quotaSection');
  const apiKey = document.getElementById('docxApiKey').value;

  // If API key is not set, hide quota section
  if (!apiKey) {
    quotaSection.style.display = 'none';
    return;
  }

  // First try to get cached quota data
  const cachedData = localStorage.getItem('quotaData');
  const now = new Date();

  // If we have cached data and it's not a forced refresh, use it
  if (cachedData && !forceRefresh) {
    try {
      const quotaData = JSON.parse(cachedData);
      const lastChecked = new Date(quotaData.lastChecked);
      // Use cached data if it's less than 5 minutes old
      if ((now - lastChecked) < 5 * 60 * 1000) {
        displayQuotaData(quotaData);
        return;
      }
    } catch (error) {
      console.error('Error parsing cached quota data:', error);
    }
  }

  // Otherwise fetch new data
  try {
    // Show loading state
    document.getElementById('totalQuota').textContent = '...';
    document.getElementById('usedQuota').textContent = '...';
    document.getElementById('remainingQuota').textContent = '...';
    document.getElementById('expirationDate').textContent = '...';
    quotaSection.style.display = 'block';

    const response = await fetch(`${SERVER_URL}/auth/quota`, {
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
      expiresAt: data.expires_at,
      lastChecked: now.toISOString()
    };

    localStorage.setItem('quotaData', JSON.stringify(quotaData));
    displayQuotaData(quotaData);

  } catch (error) {
    console.error('Error checking quota:', error);
    document.getElementById('totalQuota').textContent = 'Error';
    document.getElementById('usedQuota').textContent = 'Error';
    document.getElementById('remainingQuota').textContent = 'Error';
    document.getElementById('expirationDate').textContent = 'Error';
  }
}

// Function to display quota data
function displayQuotaData(data) {
  const quotaSection = document.getElementById('quotaSection');
  quotaSection.style.display = 'block';

  document.getElementById('totalQuota').textContent = data.total;
  document.getElementById('usedQuota').textContent = data.used;
  document.getElementById('remainingQuota').textContent = data.remaining;

  // Format and display expiration date if available
  if (data.expiresAt) {
    const expirationDate = new Date(data.expiresAt);
    document.getElementById('expirationDate').textContent = t('dateFormat', expirationDate);
  } else {
    document.getElementById('expirationDate').textContent = t('unknown');
  }

  // Update progress bar to show remaining quota percentage
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


// Function to set up template selector
async function setupTemplateSelector() {
  const selectElement = document.getElementById('wordTemplateSelect');
  if (!selectElement) return;

  try {
    const response = await fetch(`${SERVER_URL}/templates`);
    if (!response.ok) {
      throw new Error(`Failed to fetch templates: ${response.status}`);
    }

    const templatesByLang = await response.json();
    const templates = templatesByLang[lang] || templatesByLang.zh || [];

    // Clear existing options except the default one
    selectElement.innerHTML = `<option value="templates">${t('universalTemplate')}</option>`;

    // Add templates (filter out 'templates' as it's already added)
    templates.filter(t => t !== 'templates').forEach(templateName => {
      const option = document.createElement('option');
      option.value = templateName;
      option.textContent = templateName;
      selectElement.appendChild(option);
    });

  } catch (error) {
    console.error('Error setting up template selector:', error);
    // The default "通用模版" option will be available
  } finally {
    // Load and apply the last used template
    const lastUsedTemplate = localStorage.getItem('lastUsedTemplate');
    if (lastUsedTemplate) {
      const option = selectElement.querySelector(`option[value="${lastUsedTemplate}"]`);
      if (option) {
        selectElement.value = lastUsedTemplate;
      }
    }
  }
}

// Function to set up manual markdown conversion
function setupManualConversion() {
  const convertBtn = document.getElementById('convertMarkdownBtn');
  const clearBtn = document.getElementById('clearMarkdownBtn');
  const markdownInput = document.getElementById('markdownInput');

  // Store the original button content
  const originalButtonHTML = convertBtn.innerHTML;

  // Convert button click handler
  convertBtn.addEventListener('click', async () => {
    const markdownText = markdownInput.value.trim();

    // Validate input
    if (!markdownText) {
      showNotification(t('emptyMarkdownError'), 'warning');
      
      // Focus on markdown input
      setTimeout(() => {
        markdownInput.focus();
      }, 100);
      
      return;
    }

    // Check API key
    const docxApiKey = document.getElementById('docxApiKey').value;
    const convertMermaid = document.getElementById('convertMermaid').checked;
    const removeDividers = document.getElementById('removeDividers').checked;
    const removeEmojis = document.getElementById('removeEmojis').checked;
    const template = document.getElementById('wordTemplateSelect').value;

    // Check if API key is provided
    if (!docxApiKey || docxApiKey.trim() === '') {
      showNotification(t('apiKeyMissing'), 'error');

      // Highlight and focus on the API key input
      const apiKeyInput = document.getElementById('docxApiKey');
      apiKeyInput.classList.add('highlight-required');
      setTimeout(() => {
        apiKeyInput.focus();

        // Remove highlight when user starts typing
        apiKeyInput.addEventListener('input', function onInput() {
          apiKeyInput.classList.remove('highlight-required');
          apiKeyInput.removeEventListener('input', onInput);
        });
      }, 100);

      return;
    }

    try {
      // Show loading state
      convertBtn.disabled = true;
      convertBtn.innerHTML = `
        <div class="button-spinner"></div>
        <span>${t('converting')}</span>
      `;

      // Call the conversion function
      await convertMarkdownToDocx(markdownText, docxApiKey, convertMermaid, removeDividers, removeEmojis, template);

      // Update button to show success message briefly
      convertBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 6L9 17l-5-5"/>
        </svg>
        <span>${t('conversionSuccess')}</span>
      `;

      // After a timeout, restore the original button
      setTimeout(() => {
        convertBtn.disabled = false;
        convertBtn.innerHTML = originalButtonHTML;
      }, 2000);

      // Refresh quota after conversion
      checkQuota(true);

    } catch (error) {
      // Show error message
      console.error('Conversion error:', error);
      
      // Check if it's a 401 error (invalid API key)
      if (error.status === 401) {
        convertBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
          <span>${t('apiKeyInvalid')}</span>
        `;
        
        // Highlight and focus on the API key input
        const apiKeyInput = document.getElementById('docxApiKey');
        apiKeyInput.classList.add('highlight-required');
        
        setTimeout(() => {
          apiKeyInput.focus();
          apiKeyInput.select(); // Select all text for easy replacement

          // Remove highlight when user starts typing
          apiKeyInput.addEventListener('input', function onInput() {
            apiKeyInput.classList.remove('highlight-required');
            apiKeyInput.removeEventListener('input', onInput);
          });
        }, 100);

        // After a longer timeout, restore the original button
        setTimeout(() => {
          convertBtn.disabled = false;
          convertBtn.innerHTML = originalButtonHTML;
        }, 4000);
      } else {
        // Other errors
        convertBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
          <span>${error.message || t('conversionFailed')}</span>
        `;

        // After a timeout, restore the original button
        setTimeout(() => {
          convertBtn.disabled = false;
          convertBtn.innerHTML = originalButtonHTML;
        }, 3000);
      }
    }
  });

  // Clear button click handler
  clearBtn.addEventListener('click', () => {
    markdownInput.value = '';
    // Save the cleared state
    saveSettings();
  });
}

// Function to convert markdown text to DOCX
async function convertMarkdownToDocx(markdownText, apiKey, convertMermaid = false, removeDividers = false, removeEmojis = false, template) {
  try {

    // Generate filename based on content
    const firstLine = markdownText.split('\n')[0] || '';
    let filename = firstLine.trim().substring(0, 10).replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '') || 'document';

    // Add China timezone timestamp
    const now = new Date();
    const options = {
      timeZone: 'Asia/Shanghai',
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: false
    };
    const timestamp = now.toLocaleString('zh-CN', options)
      .replace(/[\/\s:]/g, '-')
      .replace(',', '');

    filename = `${filename}_${timestamp}`;

    // Remove emojis from content if enabled (frontend processing)
    let processedContent = markdownText;
    if (removeEmojis) {
      // Remove emoji characters using regex
      processedContent = processedContent.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{FE00}-\u{FE0F}\u{1F200}-\u{1F251}]/gu, '');
    }

    const body = {
      content: processedContent,
      filename: filename,
      convert_mermaid: convertMermaid,
      remove_hr: removeDividers,
      language: lang
    };

    if (template) {
      body.template_name = template;
    }

    const response = await fetch(`${SERVER_URL}/convert-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      // Create error with status code
      const error = new Error(`API错误: ${response.status} ${errorText}`);
      error.status = response.status;
      throw error;
    }

    // Download the file
    const blob = await response.blob();
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `${filename}.docx`;
    link.click();

    // Clean up
    URL.revokeObjectURL(downloadUrl);

    return true;
  } catch (error) {
    console.error('Error in convertMarkdownToDocx:', error);
    throw error;
  }
}

