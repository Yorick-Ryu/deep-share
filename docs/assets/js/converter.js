// Language configuration
const lang = window.DEEPSHARE_LANG || 'zh';

// Fixed server URL
const SERVER_URL = 'https://api.deepshare.app';

// i18n text
const i18n = {
  zh: {
    emptyMarkdownError: '请输入Markdown文本',
    apiKeyMissing: '请购买或填写API-Key以使用文档转换功能',
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
      lastUsedTemplate: localStorage.getItem('lastUsedTemplate') || 'templates'
    };

    document.getElementById('docxApiKey').value = settings.docxApiKey;
    document.getElementById('convertMermaid').checked = settings.convertMermaid;

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
      lastUsedTemplate: document.getElementById('wordTemplateSelect').value
    };

    localStorage.setItem('docxApiKey', settings.docxApiKey);
    localStorage.setItem('convertMermaid', settings.convertMermaid);
    localStorage.setItem('lastUsedTemplate', settings.lastUsedTemplate);

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
    document.getElementById('wordTemplateSelect')
  ];

  inputs.forEach(input => {
    input.addEventListener('change', saveSettings);
    // For text inputs, also listen for 'input' with debounce
    if (input.type === 'text' || input.type === 'password') {
      input.addEventListener('input', debounce(saveSettings, 500));
    }
  });
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
      alert(t('emptyMarkdownError'));
      return;
    }

    // Check API key
    const docxApiKey = document.getElementById('docxApiKey').value;
    const convertMermaid = document.getElementById('convertMermaid').checked;
    const template = document.getElementById('wordTemplateSelect').value;

    // Check if API key is provided
    if (!docxApiKey || docxApiKey.trim() === '') {
      alert(t('apiKeyMissing'));

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
      await convertMarkdownToDocx(markdownText, docxApiKey, convertMermaid, template);

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
  });

  // Clear button click handler
  clearBtn.addEventListener('click', () => {
    markdownInput.value = '';
  });
}

// Function to convert markdown text to DOCX
async function convertMarkdownToDocx(markdownText, apiKey, convertMermaid = false, template) {
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

    const body = {
      content: markdownText,
      filename: filename,
      convert_mermaid: convertMermaid,
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
      throw new Error(`API错误: ${response.status} ${errorText}`);
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

