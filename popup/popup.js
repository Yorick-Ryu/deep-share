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

  // Restore the last active tab
  restoreLastActiveTab(highlightApiKey);

  // Set up auto-save functionality
  setupAutoSave();

  // Set up other UI elements
  setupUIElements();

  // Set up manual markdown conversion functionality
  setupManualConversion();

  // Set up template selector
  setupTemplateSelector();

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
    'docxMode',
    'enableFormulaCopy',
    'formulaFormat',
    'screenshotMethod',
    'removeDividers',
    'convertMermaid',
    'wordTemplateSelect'
  ], (data) => {
    // Watermark settings
    document.getElementById('watermark').value = data.customWatermark || '';
    document.getElementById('hideDefaultWatermark').checked = !!data.hideDefaultWatermark;

    // Screenshot method settings
    const screenshotMethod = data.screenshotMethod || 'html2canvas'; // Default to html2canvas
    document.getElementById('methodDomToImage').checked = screenshotMethod === 'domtoimage';
    document.getElementById('methodHtml2Canvas').checked = screenshotMethod === 'html2canvas';

    // DOCX conversion settings
    document.getElementById('docxServerUrl').value = data.docxServerUrl || 'https://api.ds.rick216.cn';

    const apiKeyInput = document.getElementById('docxApiKey');
    apiKeyInput.value = data.docxApiKey || '';

    // Always set docx mode to API
    document.getElementById('modeApi').checked = true;

    // Formula copy settings
    document.getElementById('enableFormulaCopy').checked = data.enableFormulaCopy !== false; // Default to true
    const formulaFormat = data.formulaFormat || 'mathml'; // Default to MathML
    document.getElementById('formatMathML').checked = formulaFormat === 'mathml';
    document.getElementById('formatLaTeX').checked = formulaFormat === 'latex';

    // Remove dividers setting
    document.getElementById('removeDividers').checked = !!data.removeDividers; // Default to false

    // Mermaid conversion setting
    document.getElementById('convertMermaid').checked = !!data.convertMermaid; // Default to false

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

      // Save the active tab ID to chrome.storage.sync
      chrome.storage.sync.set({ 'lastActiveTab': targetTabId });
    });
  });
}

// Function to restore the last active tab
function restoreLastActiveTab(highlightApiKey) {
  // Skip restoring tab if we should highlight API key (that already activates its tab)
  if (highlightApiKey) {
    return;
  }

  chrome.storage.sync.get(['lastActiveTab'], (data) => {
    if (data.lastActiveTab) {
      // Find the button for this tab
      const tabButton = document.querySelector(`.tab-btn[data-tab="${data.lastActiveTab}"]`);

      if (tabButton) {
        // Simulate a click on the tab button
        tabButton.click();
      }
    }
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
    document.getElementById('modeLocal'),
    // 添加公式复制相关的设置元素
    document.getElementById('enableFormulaCopy'),
    document.getElementById('formatMathML'),
    document.getElementById('formatLaTeX'),
    // 添加截图方法相关的设置元素
    document.getElementById('methodDomToImage'),
    document.getElementById('methodHtml2Canvas'),
    // 添加去除分割线设置
    document.getElementById('removeDividers'),
    // 添加Mermaid转换设置
    document.getElementById('convertMermaid'),
    document.getElementById('wordTemplateSelect')
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
  return function () {
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
  // Get current UI language
  const currentLang = chrome.i18n.getUILanguage();
  
  // Show sponsor tab only for Chinese language
  const sponsorTabBtn = document.querySelector('.sponsor-tab-btn');
  if (sponsorTabBtn) {
    sponsorTabBtn.style.display = currentLang.startsWith('zh') ? 'flex' : 'none';
  }

  // Tab labels
  document.getElementById('docxTabLabel').textContent = chrome.i18n.getMessage('docxSettings') || 'Document Conversion';
  document.getElementById('manualDocxTabLabel').textContent = chrome.i18n.getMessage('manualDocxSettings') || '手动转换文档';
  document.getElementById('formulaTabLabel').textContent = chrome.i18n.getMessage('formulaTabLabel') || 'Formula Settings';
  document.getElementById('screenshotTabLabel').textContent = chrome.i18n.getMessage('screenshotSettings') || 'Screenshot Settings';
  document.getElementById('sponsorTabLabel').textContent = chrome.i18n.getMessage('sponsorTabLabel') || 'Sponsor';
  document.getElementById('sponsorTabTitle').textContent = chrome.i18n.getMessage('sponsorTabLabel') || 'Sponsor';

  // Document Conversion tab
  document.getElementById('docxSettingsTitle').textContent = chrome.i18n.getMessage('docxSettings') || 'Word (DOCX) Conversion';
  document.getElementById('docxFeatureExplanation').textContent = chrome.i18n.getMessage('docxFeatureExplanation') || 'Used to configure AI conversation to Word document conversion. Other features like conversation screenshots, LaTeX formula copying, and image sharing are free and ready to use.';
  document.getElementById('docxModeLabel').textContent = chrome.i18n.getMessage('docxModeLabel') || 'Conversion Mode';
  document.getElementById('modeLocalLabel').textContent = chrome.i18n.getMessage('modeLocalLabel') || 'Local';
  document.getElementById('modeApiLabel').textContent = chrome.i18n.getMessage('modeApiLabel') || 'API';
  document.getElementById('docxServerUrlLabel').textContent = chrome.i18n.getMessage('docxServerUrlLabel') || 'Server URL';
  document.getElementById('docxApiKeyLabel').textContent = chrome.i18n.getMessage('docxApiKeyLabel') || 'API Key';
  document.getElementById('removeDividersLabel').textContent = chrome.i18n.getMessage('removeDividersLabel') || '去除分割线';
  document.getElementById('convertMermaidLabel').textContent = chrome.i18n.getMessage('convertMermaidLabel') || '启用Mermaid图表转换';

  // Formula Copy Settings tab
  document.getElementById('formulaSettingsTitle').textContent = chrome.i18n.getMessage('formulaSettingsTitle') || 'Formula Copy Settings';
  document.getElementById('enableFormulaCopyLabel').textContent = chrome.i18n.getMessage('enableFormulaCopyLabel') || 'Enable Formula Copy';
  document.getElementById('formulaFormatLabel').textContent = chrome.i18n.getMessage('formulaFormatLabel') || 'Formula Copy Format';
  document.getElementById('formatMathMLLabel').textContent = chrome.i18n.getMessage('formatMathMLLabel') || 'MathML';
  document.getElementById('formatLaTeXLabel').textContent = chrome.i18n.getMessage('formatLaTeXLabel') || 'LaTeX';
  document.getElementById('formulaFormatHint').textContent = chrome.i18n.getMessage('formulaFormatHint') || 'MathML is compatible with more editors, LaTeX is for professional typesetting';

  // Manual Document Conversion tab
  document.getElementById('manualConversionTitle').textContent = chrome.i18n.getMessage('manualConversionTitle') || '手动转换';
  document.getElementById('manualConversionExplanation').innerHTML = chrome.i18n.getMessage('manualConversionExplanation') || '支持ChatGPT、豆包、元宝等，复制需要转换的对话到Markdown输入框，点击"转换为文档"按钮立即下载Word格式，排版精美，支持公式！';
  document.getElementById('markdownInputLabel').textContent = chrome.i18n.getMessage('markdownInputLabel') || 'Markdown 文本';
  document.getElementById('templateLabel').textContent = chrome.i18n.getMessage('templateLabel') || 'Word Template';
  document.getElementById('convertMarkdownBtn').innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;">
      <path d="M14 3v4a1 1 0 0 0 1 1h4"></path>
      <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z"></path>
      <line x1="9" y1="9" x2="10" y2="9"></line>
      <line x1="9" y1="13" x2="15" y2="13"></line>
      <line x1="9" y1="17" x2="15" y2="17"></line>
    </svg>
    ${chrome.i18n.getMessage('convertToDocx') || '转换为文档'}
  `;
  document.getElementById('clearMarkdownBtn').textContent = chrome.i18n.getMessage('clearMarkdown') || '清空';
  document.getElementById('markdownInput').placeholder = chrome.i18n.getMessage('markdownInputPlaceholder') || '在此粘贴 Markdown 格式文本...';

  // Screenshot settings tab (previously Watermark tab)
  document.getElementById('screenshotSettingsTitle').textContent = chrome.i18n.getMessage('screenshotSettings') || 'Screenshot Settings';
  document.getElementById('hideDefaultWatermarkLabel').textContent = chrome.i18n.getMessage('hideDefaultWatermarkLabel') || 'Hide Default Watermark';
  document.getElementById('customWatermarkLabel').textContent = chrome.i18n.getMessage('customWatermarkLabel') || 'Custom Watermark Text (Optional)';
  document.getElementById('watermark').placeholder = chrome.i18n.getMessage('customWatermarkPlaceholder') || 'Enter custom watermark here';
  
  // Screenshot method labels
  document.getElementById('screenshotMethodLabel').textContent = chrome.i18n.getMessage('screenshotMethodLabel') || 'Screenshot Method';
  document.getElementById('methodDomToImageLabel').textContent = chrome.i18n.getMessage('methodDomToImageLabel') || 'dom-to-image';
  document.getElementById('methodHtml2CanvasLabel').textContent = chrome.i18n.getMessage('methodHtml2CanvasLabel') || 'html2canvas';
  document.getElementById('screenshotMethodHint').textContent = chrome.i18n.getMessage('screenshotMethodHint') || '选择用于截图的方法，如果一种方法不工作，请尝试另一种';

  // Sponsor tab
  document.getElementById('sponsorTitle').textContent = chrome.i18n.getMessage('sponsorTitle');

  // Quota section labels
  document.getElementById('quotaTitle').textContent = chrome.i18n.getMessage('quotaTitle') || '您的转换次数';
  document.getElementById('totalQuotaLabel').textContent = chrome.i18n.getMessage('totalQuotaLabel') || '总计:';
  document.getElementById('usedQuotaLabel').textContent = chrome.i18n.getMessage('usedQuotaLabel') || '已用:';
  document.getElementById('remainingQuotaLabel').textContent = chrome.i18n.getMessage('remainingQuotaLabel') || '剩余:';
  
  // API key hint with proper HTML handling
  const apiKeyHint = document.getElementById('apiKeyHint');
  const apiKeyHintMessage = chrome.i18n.getMessage('apiKeyHint');
  if (apiKeyHintMessage) {
    apiKeyHint.innerHTML = apiKeyHintMessage;
  }

  // Quota action buttons
  const refreshBtn = document.getElementById('refreshQuota');
  if (refreshBtn) {
    refreshBtn.textContent = chrome.i18n.getMessage('refreshButton') || '刷新';
  }
  
  // Update purchase link text
  const purchaseLink = document.querySelector('.purchase-link');
  if (purchaseLink) {
    purchaseLink.textContent = chrome.i18n.getMessage('purchaseQuota') || '购买次数';
  }
}

// Function to save settings
function saveSettings() {
  // Always use API mode
  const docxMode = 'api';

  // Get formula format from radio buttons
  let formulaFormat = 'mathml'; // 默认为 MathML
  if (document.getElementById('formatLaTeX').checked) {
    formulaFormat = 'latex';
  }
  
  // Get screenshot method from radio buttons
  let screenshotMethod = 'domtoimage'; // 默认为 dom-to-image
  if (document.getElementById('methodHtml2Canvas').checked) {
    screenshotMethod = 'html2canvas';
  }

  // Collect all settings
  const settings = {
    // Watermark settings
    customWatermark: document.getElementById('watermark').value,
    hideDefaultWatermark: document.getElementById('hideDefaultWatermark').checked,
    
    // Screenshot method
    screenshotMethod: screenshotMethod,

    // DOCX settings
    docxServerUrl: document.getElementById('docxServerUrl').value,
    docxApiKey: document.getElementById('docxApiKey').value,
    docxMode: docxMode,

    // Formula copy settings
    enableFormulaCopy: document.getElementById('enableFormulaCopy').checked,
    formulaFormat: formulaFormat,

    // Remove dividers setting
    removeDividers: document.getElementById('removeDividers').checked,

    // Mermaid diagram conversion
    convertMermaid: document.getElementById('convertMermaid').checked,
    lastUsedTemplate: document.getElementById('wordTemplateSelect').value
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
      document.getElementById('expirationDate').textContent = '...';
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
        expiresAt: data.expires_at,
        lastChecked: now.toISOString()
      };

      chrome.storage.local.set({ quotaData });
      displayQuotaData(quotaData);

    } catch (error) {
      console.error('Error checking quota:', error);
      document.getElementById('totalQuota').textContent = 'Error';
      document.getElementById('usedQuota').textContent = 'Error';
      document.getElementById('remainingQuota').textContent = 'Error';
      document.getElementById('expirationDate').textContent = 'Error';
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

  // Format and display expiration date if available
  if (data.expiresAt) {
    const expirationDate = new Date(data.expiresAt);
    document.getElementById('expirationDate').textContent = formatDate(expirationDate);
  } else {
    const unknownText = chrome.i18n.getMessage('unknown') || 'Unknown';
    document.getElementById('expirationDate').textContent = unknownText;
  }

  // Update expiration label if needed
  const expirationLabel = document.getElementById('expirationLabel');
  if (expirationLabel) {
    expirationLabel.textContent = chrome.i18n.getMessage('expirationLabel') || '有效期至:';
  }

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

// Helper function to format date in a user-friendly way
function formatDate(date) {
  // Get the current UI language
  const currentLang = chrome.i18n.getUILanguage();
  
  if (currentLang.startsWith('zh')) {
    // Chinese format
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}年${month}月${day}日`;
  } else {
    // English format
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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
      alert(chrome.i18n.getMessage('emptyMarkdownError') || '请输入Markdown文本');
      return;
    }

    // Check API key
    const settings = await chrome.storage.sync.get({
      docxServerUrl: 'https://api.ds.rick216.cn',
      docxApiKey: '',
      docxMode: 'api',
      removeDividers: false,
      convertMermaid: false
    });

    // Check if API key is provided
    if (!settings.docxApiKey || settings.docxApiKey.trim() === '') {
      // Show message
      alert(chrome.i18n.getMessage('apiKeyMissing') || '请购买或填写API-Key以使用文档转换功能');

      // Switch to document conversion tab
      const docxTabBtn = document.querySelector('.tab-btn[data-tab="docx-tab"]');
      if (docxTabBtn) {
        docxTabBtn.click();
      }

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
      // Show loading state on the button itself
      convertBtn.disabled = true;
      convertBtn.innerHTML = `
        <div class="button-spinner"></div>
        <span>${chrome.i18n.getMessage('docxConverting') || '正在转换...'}</span>
      `;

      // Call the conversion function with markdown text
      await convertMarkdownToDocx(markdownText, settings.docxServerUrl, settings.docxApiKey, settings.removeDividers, settings.convertMermaid, document.getElementById('wordTemplateSelect').value);

      // Update button to show success message briefly
      convertBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;">
          <path d="M20 6L9 17l-5-5"/>
        </svg>
        <span>${chrome.i18n.getMessage('docxConversionSuccess') || '转换成功!'}</span>
      `;

      // After a timeout, restore the original button
      setTimeout(() => {
        convertBtn.disabled = false;
        convertBtn.innerHTML = originalButtonHTML;
      }, 2000);

      // Refresh quota after conversion
      checkQuota(true);

    } catch (error) {
      // Show error message on button
      console.error('Conversion error:', error);
      convertBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
        <span>${error.message || '转换失败'}</span>
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
async function convertMarkdownToDocx(markdownText, serverUrl, apiKey, removeDividers = false, convertMermaid = false, template) {
  try {
    const url = serverUrl || 'https://api.ds.rick216.cn';

    // Generate filename based on content
    const firstLine = markdownText.split('\n')[0] || '';
    let filename = firstLine.trim().substring(0, 10).replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '') || 'document';

    // Add China timezone timestamp
    const now = new Date();
    const options = {
      timeZone: 'Asia/Shanghai',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false
    };
    const timestamp = now.toLocaleString('zh-CN', options)
      .replace(/[\/\s:]/g, '-')
      .replace(',', '');

    filename = `${filename}_${timestamp}`;

    const currentLang = chrome.i18n.getUILanguage();
    const language = currentLang.startsWith('zh') ? 'zh' : 'en';

    const body = {
      content: markdownText,
      filename: filename,
      remove_hr: removeDividers,
      convert_mermaid: convertMermaid,
      language: language
    };

    if (template) {
      body.template_name = template;
    }

    const response = await fetch(`${url}/convert-text`, {
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

async function setupTemplateSelector() {
  const selectElement = document.getElementById('wordTemplateSelect');
  if (!selectElement) return;

  // Set default option first
  const defaultOption = document.createElement('option');
  defaultOption.value = 'templates';
  defaultOption.textContent = chrome.i18n.getMessage('universalTemplate') || 'Universal';
  selectElement.appendChild(defaultOption);

  try {
    const settings = await chrome.storage.sync.get({ docxServerUrl: 'https://api.ds.rick216.cn' });
    const serverUrl = settings.docxServerUrl || 'https://api.ds.rick216.cn';

    const response = await fetch(`${serverUrl}/templates`);
    if (!response.ok) {
      throw new Error(`Failed to fetch templates: ${response.status}`);
    }

    const templatesByLang = await response.json();
    const currentLang = chrome.i18n.getUILanguage();
    
    let templates = [];
    if (currentLang.startsWith('zh')) {
      templates = templatesByLang.zh || [];
    } else {
      templates = templatesByLang.en || [];
    }
    
    // remove 'templates' from the list as it is already added as 'Universal'
    templates.filter(t => t !== 'templates').forEach(templateName => {
      const option = document.createElement('option');
      option.value = templateName;
      option.textContent = templateName;
      selectElement.appendChild(option);
    });

  } catch (error) {
    console.error('Error setting up template selector:', error);
    // The default "Universal" option will be available.
  } finally {
    // Load and apply the last used template
    chrome.storage.sync.get(['lastUsedTemplate'], (data) => {
      if (data.lastUsedTemplate) {
        // Check if the option actually exists before setting it to prevent errors
        if (selectElement.querySelector(`option[value="${data.lastUsedTemplate}"]`)) {
          selectElement.value = data.lastUsedTemplate;
        }
      }
    });
  }
}
