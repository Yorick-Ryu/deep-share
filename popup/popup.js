// Global variable to store custom locale messages
let customLocaleMessages = null;
let currentLanguage = 'auto';

// Initialize and load settings
document.addEventListener('DOMContentLoaded', async () => {
  // Check for action parameters in the URL
  const urlParams = new URLSearchParams(window.location.search);
  const action = urlParams.get('action');
  const errorMsg = urlParams.get('error');

  const highlightApiKey = (action === 'apiKeyMissing' || action === 'apiError');
  const forceDocxTab = (highlightApiKey || action === 'quotaExceeded');

  // Load language preference first, then load i18n text
  await loadLanguagePreference();

  // Load saved settings
  loadSettings(highlightApiKey, forceDocxTab);

  // Set up tab switching
  setupTabs();

  // Restore the last active tab
  restoreLastActiveTab(forceDocxTab);

  // Set up auto-save functionality
  setupAutoSave();

  // Set up other UI elements
  setupUIElements();

  // Set up manual markdown conversion functionality
  setupManualConversion();

  // Set all i18n text
  loadI18nText(errorMsg);
});

// Function to load language preference and custom locale messages
async function loadLanguagePreference() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['preferredLanguage'], async (data) => {
      currentLanguage = data.preferredLanguage || 'auto';

      if (currentLanguage !== 'auto') {
        // Load custom locale messages
        await loadLocaleMessages(currentLanguage);
      }

      resolve();
    });
  });
}

// Function to load messages from a specific locale file
async function loadLocaleMessages(locale) {
  try {
    const url = chrome.runtime.getURL(`_locales/${locale}/messages.json`);
    const response = await fetch(url);
    if (response.ok) {
      customLocaleMessages = await response.json();
    } else {
      console.error(`Failed to load locale ${locale}:`, response.status);
      customLocaleMessages = null;
    }
  } catch (error) {
    console.error(`Error loading locale ${locale}:`, error);
    customLocaleMessages = null;
  }
}

// Function to get a message (from custom locale or chrome.i18n)
function getMessage(key, substitutions) {
  // If we have custom locale messages and the key exists, use it
  if (customLocaleMessages && customLocaleMessages[key]) {
    let message = customLocaleMessages[key].message;
    // Handle substitutions if provided
    if (substitutions) {
      const subs = Array.isArray(substitutions) ? substitutions : [substitutions];
      subs.forEach((sub, index) => {
        message = message.replace(`$${index + 1}`, sub);
      });
    }
    return message;
  }
  // Otherwise, use chrome.i18n.getMessage
  return chrome.i18n.getMessage(key, substitutions);
}

// Function to load saved settings
function loadSettings(highlightApiKey = false, forceDocxTab = false) {
  chrome.storage.sync.get([
    'customWatermark',
    'hideDefaultWatermark',
    'docxServerUrl',
    'docxApiKey',
    'enableFormulaCopy',
    'formulaFormat',
    'formulaEngine',
    'screenshotMethod',
    'removeDividers',
    'removeEmojis',
    'convertMermaid',
    'compatMode',
    'wordTemplateSelect',
    'exportGeminiSources',
    'hardLineBreaks',
    'preferredLanguage'
  ], (data) => {
    // Watermark settings
    document.getElementById('watermark').value = data.customWatermark || '';
    document.getElementById('hideDefaultWatermark').checked = !!data.hideDefaultWatermark;

    // Screenshot method settings
    const screenshotMethod = data.screenshotMethod || 'html2canvas'; // Default to html2canvas
    document.getElementById('methodDomToImage').checked = screenshotMethod === 'domtoimage';
    document.getElementById('methodHtml2Canvas').checked = screenshotMethod === 'html2canvas';
    document.getElementById('methodSnapDOM').checked = screenshotMethod === 'snapdom';

    // DOCX conversion settings
    document.getElementById('docxServerUrl').value = data.docxServerUrl || 'https://api.ds.rick216.cn';

    const apiKeyInput = document.getElementById('docxApiKey');
    apiKeyInput.value = data.docxApiKey || '';



    // Formula copy settings
    document.getElementById('enableFormulaCopy').checked = data.enableFormulaCopy !== false; // Default to true
    const formulaFormat = data.formulaFormat || 'mathml'; // Default to MathML
    document.getElementById('formatMathML').checked = formulaFormat === 'mathml';
    document.getElementById('formatLaTeX').checked = formulaFormat === 'latex';
    document.getElementById('formatDollarLatex').checked = formulaFormat === 'dollarLatex';

    // Formula engine settings
    const formulaEngine = data.formulaEngine || 'mathjax'; // Default to MathJax
    document.getElementById('engineMathJax').checked = formulaEngine === 'mathjax';
    document.getElementById('engineKaTeX').checked = formulaEngine === 'katex';

    // Remove dividers setting
    document.getElementById('removeDividers').checked = !!data.removeDividers; // Default to false

    // Remove emojis setting
    document.getElementById('removeEmojis').checked = !!data.removeEmojis; // Default to false

    // Mermaid conversion setting
    document.getElementById('convertMermaid').checked = !!data.convertMermaid; // Default to false

    // Compatibility Mode setting
    document.getElementById('compatMode').checked = data.compatMode !== false; // Default to true

    // Gemini Deep Research sources export setting
    document.getElementById('exportGeminiSources').checked = data.exportGeminiSources === true; // Default to false

    // Hard Line Breaks setting
    document.getElementById('hardLineBreaks').checked = !!data.hardLineBreaks; // Default to false

    // Language preference
    document.getElementById('languageSelect').value = data.preferredLanguage || 'auto';

    // If API key is set, check quota and update renewal links
    if (data.docxApiKey) {
      checkQuota();

      // Update renewal links with the API key
      const updateLinks = () => {
        const links = document.querySelectorAll('a[href*="ds.rick216.cn/renew"]');
        links.forEach(link => {
          try {
            // Simple obfuscation: Base64 + Reverse
            const encodedKey = btoa(data.docxApiKey).split('').reverse().join('');
            const url = new URL(link.href);
            url.searchParams.set('ak', encodedKey);
            link.href = url.toString();
          } catch (e) {
            console.error('Failed to encode API Key for link:', e);
          }
        });
      };

      // Run immediately and also after a short delay to ensure i18n texts are loaded
      updateLinks();
      setTimeout(updateLinks, 100);
    }

    // If we should force the DOCX tab to be active
    if (forceDocxTab) {
      const docxTabBtn = document.querySelector('.tab-btn[data-tab="docx-tab"]');
      if (docxTabBtn) docxTabBtn.click();
    }

    // If API key is missing and we should highlight it, add highlighting and focus
    if (highlightApiKey) {
      // Add highlight class to API key input
      apiKeyInput.classList.add('highlight-required');

      // Focus on API key input
      setTimeout(() => {
        apiKeyInput.focus();

        // Remove highlight when user starts typing
        apiKeyInput.addEventListener('input', function onInput() {
          apiKeyInput.classList.remove('highlight-required');

          // Hide the error message if it was showing
          const errorElement = document.getElementById('apiKeyErrorMsg');
          if (errorElement) {
            errorElement.style.display = 'none';
          }

          apiKeyInput.removeEventListener('input', onInput);
        });
      }, 100);
    }
  });
}

// Set up tab switching functionality
// Flag to track if templates have been loaded
let templatesLoaded = false;

function setupTabs() {
  const tabButtons = Array.from(document.querySelectorAll('.tab-btn'));

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTabId = button.getAttribute('data-tab');

      // Update active tab button
      tabButtons.forEach(btn => {
        btn.classList.remove('active');
      });
      button.classList.add('active');

      // Show the selected tab content
      document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
      });
      document.getElementById(targetTabId).classList.add('active');

      // Load templates when manual-docx-tab is first accessed
      if (targetTabId === 'manual-docx-tab' && !templatesLoaded) {
        templatesLoaded = true;
        setupTemplateSelector();
      }

      // Save the active tab ID to chrome.storage.sync
      chrome.storage.sync.set({ 'lastActiveTab': targetTabId });
    });
  });

  // Add keyboard navigation for tabs
  document.addEventListener('keydown', (e) => {
    // If user is typing in an input or textarea, don't switch tabs
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return;
    }

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();

      const currentActiveBtn = document.querySelector('.tab-btn.active');
      const currentIndex = tabButtons.indexOf(currentActiveBtn);
      let nextIndex;

      if (e.key === 'ArrowDown') {
        nextIndex = (currentIndex + 1) % tabButtons.length;
      } else {
        nextIndex = (currentIndex - 1 + tabButtons.length) % tabButtons.length;
      }

      tabButtons[nextIndex].click();
      // Scroll the sidebar if needed
      tabButtons[nextIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });
}

// Function to restore the last active tab
function restoreLastActiveTab(forceDocxTab) {
  // Skip restoring tab if we forced a specific tab
  if (forceDocxTab) {
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
    // 添加公式复制相关的设置元素
    document.getElementById('enableFormulaCopy'),
    document.getElementById('formatMathML'),
    document.getElementById('formatLaTeX'),
    document.getElementById('formatDollarLatex'),
    // 添加公式转换引擎设置
    document.getElementById('engineMathJax'),
    document.getElementById('engineKaTeX'),
    // 添加截图方法相关的设置元素
    document.getElementById('methodDomToImage'),
    document.getElementById('methodHtml2Canvas'),
    document.getElementById('methodSnapDOM'),
    // 添加去除分割线设置
    document.getElementById('removeDividers'),
    // 添加去除emoji设置
    document.getElementById('removeEmojis'),
    // 添加Mermaid转换设置
    document.getElementById('convertMermaid'),
    document.getElementById('compatMode'),
    document.getElementById('wordTemplateSelect'),
    // Gemini settings
    document.getElementById('exportGeminiSources'),
    // Hard Line Breaks settings
    document.getElementById('hardLineBreaks'),
    // Language settings
    document.getElementById('languageSelect')
  ];

  // Add change event listeners to each input
  inputs.forEach(input => {
    input.addEventListener('change', saveSettings);
    // For text inputs, also listen for 'input' with small delay
    if (input.type === 'text' || input.type === 'password') {
      input.addEventListener('input', debounce(saveSettings, 500));
    }
  });

  // Special handler for language change - reload i18n text after saving
  document.getElementById('languageSelect').addEventListener('change', async (e) => {
    const newLanguage = e.target.value;
    currentLanguage = newLanguage;

    if (newLanguage === 'auto') {
      customLocaleMessages = null;
    } else {
      await loadLocaleMessages(newLanguage);
    }

    // Reload all i18n text with the new language
    loadI18nText();

    // Refresh template selector with new language (only if templates have been loaded)
    if (templatesLoaded) {
      setupTemplateSelector();
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

  // Set up server URL label click to toggle input visibility
  const serverUrlLabel = document.getElementById('docxServerUrlLabel');
  const serverUrlInput = document.getElementById('docxServerUrl');

  serverUrlLabel.addEventListener('click', () => {
    if (serverUrlInput.classList.contains('visible')) {
      serverUrlInput.classList.remove('visible');
      serverUrlLabel.classList.remove('expanded');
    } else {
      serverUrlInput.classList.add('visible');
      serverUrlLabel.classList.add('expanded');
    }
  });
}

// Load all i18n text
function loadI18nText(errorMsg = null) {
  // Tab labels
  document.getElementById('docxTabLabel').textContent = getMessage('docxSettings') || 'Document Conversion';
  document.getElementById('manualDocxTabLabel').textContent = getMessage('manualDocxSettings') || '手动转换文档';
  document.getElementById('formulaTabLabel').textContent = getMessage('formulaTabLabel') || 'Formula Settings';
  document.getElementById('screenshotTabLabel').textContent = getMessage('screenshotSettings') || 'Screenshot Settings';
  document.getElementById('sponsorTabLabel').textContent = getMessage('sponsorTabLabel') || 'About';
  document.getElementById('sponsorTabTitle').textContent = getMessage('aboutTabTitle') || 'About DeepShare';

  // Document Conversion tab
  document.getElementById('docxSettingsTitle').textContent = getMessage('docxSettings') || 'Word (DOCX) Conversion';
  document.getElementById('docxFeatureExplanation').textContent = getMessage('docxFeatureExplanation') || 'Used to configure AI conversation to Word document conversion. Other features like conversation screenshots, LaTeX formula copying, and image sharing are free and ready to use.';

  document.getElementById('docxServerUrlLabel').textContent = getMessage('docxServerUrlLabel') || 'Server URL';
  document.getElementById('docxApiKeyLabel').textContent = getMessage('docxApiKeyLabel') || 'API Key';

  const errorElement = document.getElementById('apiKeyErrorMsg');
  if (errorElement) {
    if (errorMsg) {
      errorElement.innerHTML = errorMsg;
      errorElement.style.display = 'inline';
    } else {
      errorElement.style.display = 'none';
    }
  }
  document.getElementById('removeDividersLabel').textContent = getMessage('removeDividersLabel') || '去除分割线';
  document.getElementById('removeEmojisLabel').textContent = getMessage('removeEmojisLabel') || '去除emoji表情';
  document.getElementById('convertMermaidLabel').textContent = getMessage('convertMermaidLabel') || '启用Mermaid图表转换';
  document.getElementById('compatModeLabel').textContent = getMessage('compatModeLabel') || '兼容模式';
  document.getElementById('compatModeTooltip').textContent = getMessage('compatModeTooltip') || '兼容不规范的Markdown格式';
  document.getElementById('hardLineBreaksLabel').textContent = getMessage('hardLineBreaksLabel') || '强制换行';
  document.getElementById('hardLineBreaksTooltip').textContent = getMessage('hardLineBreaksTooltip') || '将源码中的单次换行视为硬换行';

  // Formula Copy Settings tab
  document.getElementById('formulaSettingsTitle').textContent = getMessage('formulaSettingsTitle') || 'Formula Copy Settings';
  document.getElementById('formulaCopyTutorialText').textContent = getMessage('formulaCopyTutorialText') || '了解更多关于公式复制的信息：';
  document.getElementById('formulaCopyTutorialLink').textContent = getMessage('formulaCopyTutorialLink') || '查看教程';
  document.getElementById('enableFormulaCopyLabel').textContent = getMessage('enableFormulaCopyLabel') || 'Enable Formula Copy';
  document.getElementById('formulaFormatLabel').textContent = getMessage('formulaFormatLabel') || 'Formula Copy Format';
  document.getElementById('formatMathMLLabel').textContent = getMessage('formatMathMLLabel') || 'MathML';
  document.getElementById('formatLaTeXLabel').textContent = getMessage('formatLaTeXLabel') || 'LaTeX';
  document.getElementById('formatDollarLatexLabel').textContent = getMessage('formatDollarLatexLabel') || 'Markdown';
  document.getElementById('formulaFormatHint').textContent = getMessage('formulaFormatHint') || 'MathML is compatible with more editors, LaTeX is for professional typesetting';
  document.getElementById('formulaEngineLabel').textContent = getMessage('formulaEngineLabel') || '转换引擎';
  document.getElementById('engineMathJaxLabel').textContent = getMessage('engineMathJaxLabel') || 'MathJax';
  document.getElementById('engineKaTeXLabel').textContent = getMessage('engineKaTeXLabel') || 'KaTeX';
  document.getElementById('formulaEngineHint').textContent = getMessage('formulaEngineHint') || 'MathJax 兼容性更好，KaTeX 转换更快';

  // Manual Document Conversion tab
  document.getElementById('manualConversionTitle').textContent = getMessage('manualConversionTitle') || '手动转换';
  document.getElementById('manualConversionExplanation').innerHTML = getMessage('manualConversionExplanation') || '支持ChatGPT、豆包、元宝等，复制需要转换的对话到Markdown输入框，点击"转换为文档"按钮立即下载Word格式，排版精美，支持公式！';
  document.getElementById('markdownInputLabel').textContent = getMessage('markdownInputLabel') || 'Markdown 文本';
  document.getElementById('templateLabel').textContent = getMessage('templateLabel') || 'Word Template';
  document.getElementById('convertMarkdownBtn').innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;">
      <path d="M14 3v4a1 1 0 0 0 1 1h4"></path>
      <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z"></path>
      <line x1="9" y1="9" x2="10" y2="9"></line>
      <line x1="9" y1="13" x2="15" y2="13"></line>
      <line x1="9" y1="17" x2="15" y2="17"></line>
    </svg>
    ${getMessage('convertToDocx') || '转换为文档'}
  `;
  document.getElementById('clearMarkdownBtn').textContent = getMessage('clearMarkdown') || '清空';
  document.getElementById('markdownInput').placeholder = getMessage('markdownInputPlaceholder') || '在此粘贴 Markdown 格式文本...';

  // Screenshot settings tab (previously Watermark tab)
  document.getElementById('screenshotSettingsTitle').textContent = getMessage('screenshotSettings') || 'Screenshot Settings';
  document.getElementById('hideDefaultWatermarkLabel').textContent = getMessage('hideDefaultWatermarkLabel') || 'Hide Default Watermark';
  document.getElementById('customWatermarkLabel').textContent = getMessage('customWatermarkLabel') || 'Custom Watermark Text (Optional)';
  document.getElementById('watermark').placeholder = getMessage('customWatermarkPlaceholder') || 'Enter custom watermark here';

  // Screenshot method labels
  document.getElementById('screenshotMethodLabel').textContent = getMessage('screenshotMethodLabel') || 'Screenshot Method';
  document.getElementById('methodDomToImageLabel').textContent = getMessage('methodDomToImageLabel') || 'dom-to-image';
  document.getElementById('methodHtml2CanvasLabel').textContent = getMessage('methodHtml2CanvasLabel') || 'html2canvas';
  const snapDomLabel = document.getElementById('methodSnapDOMLabel');
  if (snapDomLabel) snapDomLabel.textContent = 'SnapDOM';
  document.getElementById('screenshotMethodHint').textContent = getMessage('screenshotMethodHint') || '选择用于截图的方法，如果一种方法不工作，请尝试另一种';

  // Other Settings tab
  document.getElementById('otherSettingsTabLabel').textContent = getMessage('otherSettingsTabLabel') || 'Other Settings';
  document.getElementById('otherSettingsTitle').textContent = getMessage('otherSettingsTitle') || 'Other Settings';
  document.getElementById('languageSettingsTitle').textContent = getMessage('languageSettingsTitle') || 'Language';
  document.getElementById('languageSelectLabel').textContent = getMessage('languageSelectLabel') || 'Display Language';
  document.getElementById('languageAuto').textContent = getMessage('languageAuto') || 'Auto (Browser Default)';
  document.getElementById('languageHint').textContent = getMessage('languageHint') || 'Select your preferred display language';
  document.getElementById('geminiSettingsTitle').textContent = getMessage('geminiSettingsTitle') || 'Gemini';
  document.getElementById('exportGeminiSourcesLabel').textContent = getMessage('exportGeminiSourcesLabel') || 'Export Deep Research sources';
  document.getElementById('exportGeminiSourcesHint').textContent = getMessage('exportGeminiSourcesHint') || 'Include reference sources when exporting Gemini Deep Research reports';

  // About tab
  document.getElementById('acknowledgmentText').textContent = getMessage('acknowledgmentText') || '感谢每一位为 DeepShare 提出建议的朋友！许多功能源于用户的真实需求，让我们一起提升效率，把节省的时间留给生活。';
  document.getElementById('versionLabel').textContent = getMessage('versionLabel') || 'Version:';
  document.getElementById('documentationLabel').textContent = getMessage('documentationLabel') || 'Documentation:';
  document.getElementById('githubLabel').textContent = getMessage('githubLabel') || 'GitHub:';
  document.getElementById('developerEmailLabel').textContent = getMessage('developerEmailLabel') || 'Developer Email:';

  // Load version from manifest
  fetch(chrome.runtime.getURL('manifest.json'))
    .then(response => response.json())
    .then(manifest => {
      document.getElementById('versionValue').textContent = manifest.version;
    })
    .catch(() => {
      document.getElementById('versionValue').textContent = 'Error';
    });

  // Quota section labels
  document.getElementById('quotaTitle').textContent = getMessage('quotaTitle') || '转换额度';
  document.getElementById('dailyQuotaLabel').textContent = getMessage('dailyQuotaLabel') || '每日配额';
  document.getElementById('addonQuotaLabel').textContent = getMessage('addonQuotaLabel') || '按量配额';

  // API key hint with proper HTML handling
  const apiKeyHint = document.getElementById('apiKeyHint');
  const apiKeyHintMessage = getMessage('apiKeyHint');
  if (apiKeyHintMessage) {
    apiKeyHint.innerHTML = apiKeyHintMessage;
  }

  // Quota action buttons
  const refreshBtn = document.getElementById('refreshQuota');
  if (refreshBtn) {
    refreshBtn.textContent = getMessage('refreshButton') || '刷新';
  }

  // Update purchase/subscribe link text
  const purchaseLink = document.getElementById('purchaseLink');
  if (purchaseLink) {
    purchaseLink.textContent = getMessage('purchaseAddonQuota') || '购买叠加额度';
  }
  const subscribeLink = document.getElementById('subscribeLink');
  if (subscribeLink) {
    // Default text for when no subscription (will be updated by displayDualQuota if needed)
    subscribeLink.textContent = getMessage('purchaseSubscription') || '购买套餐';
  }
}

// Function to save settings
function saveSettings() {
  // Get formula format from radio buttons
  let formulaFormat = 'mathml'; // 默认为 MathML
  if (document.getElementById('formatLaTeX').checked) {
    formulaFormat = 'latex';
  } else if (document.getElementById('formatDollarLatex').checked) {
    formulaFormat = 'dollarLatex';
  }

  // Get formula engine from radio buttons
  let formulaEngine = 'mathjax'; // 默认为 MathJax
  if (document.getElementById('engineKaTeX').checked) {
    formulaEngine = 'katex';
  }

  // Get screenshot method from radio buttons
  let screenshotMethod = 'domtoimage'; // 默认为 dom-to-image
  if (document.getElementById('methodHtml2Canvas').checked) {
    screenshotMethod = 'html2canvas';
  } else if (document.getElementById('methodSnapDOM').checked) {
    screenshotMethod = 'snapdom';
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

    // Formula copy settings
    enableFormulaCopy: document.getElementById('enableFormulaCopy').checked,
    formulaFormat: formulaFormat,
    formulaEngine: formulaEngine,

    // Remove dividers setting
    removeDividers: document.getElementById('removeDividers').checked,

    // Remove emojis setting
    removeEmojis: document.getElementById('removeEmojis').checked,

    // Mermaid diagram conversion
    convertMermaid: document.getElementById('convertMermaid').checked,
    compatMode: document.getElementById('compatMode').checked,
    hardLineBreaks: document.getElementById('hardLineBreaks').checked,
    lastUsedTemplate: document.getElementById('wordTemplateSelect').value,

    // Gemini settings
    exportGeminiSources: document.getElementById('exportGeminiSources').checked,

    // Language settings
    preferredLanguage: document.getElementById('languageSelect').value
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

/**
 * Extract a user-friendly error message from a fetch response.
 * Tries to parse JSON { detail: "..." }, falls back to status text.
 */
async function extractApiError(response) {
  try {
    const data = await response.json();
    if (data.detail) return data.detail;
  } catch (_) { /* response is not JSON */ }
  return `HTTP ${response.status}`;
}

/**
 * Map API error messages to user-friendly Chinese text for the API Key input.
 * Returns null if the error is not API-key related (e.g. server error).
 */
function mapApiKeyError(detail, statusCode) {
  // 401 errors are always API-key related
  if (statusCode === 401) {
    if (detail.includes('required')) {
      // "API Key is required"
      return getMessage('apiKeyRequired') || 'API Key 不能为空';
    }
    if (detail.includes('not active')) {
      // "User associated with this API key is not active"
      return getMessage('apiKeyUserInactive') || '关联账户已被停用';
    }
    if (detail.includes('Invalid or expired')) {
      // "Invalid or expired API key" — from get_api_key (strict check)
      return getMessage('apiKeyExpired') || 'API Key 无效或已过期';
    }
    // "Invalid or disabled API key" — from get_api_key_allow_expired
    // and any other 401 messages
    return getMessage('apiKeyInvalid') || 'API Key 无效，请检查后重试';
  }
  // Network / server errors are not shown on the input
  return null;
}

/**
 * Show an API-key related error: display message inline, highlight the input red.
 * The error clears automatically when the user edits the input.
 */
function showApiKeyQuotaError(message) {
  const apiKeyInput = document.getElementById('docxApiKey');
  const errorElement = document.getElementById('apiKeyErrorMsg');

  if (errorElement) {
    errorElement.textContent = message;
    errorElement.style.display = 'inline';
  }

  apiKeyInput.classList.add('highlight-required');

  // Clear error when the user starts typing (one-time listener)
  const onInput = () => {
    clearApiKeyQuotaError();
    apiKeyInput.removeEventListener('input', onInput);
  };
  // Remove any previous listener to avoid stacking
  apiKeyInput.removeEventListener('input', apiKeyInput._quotaErrorHandler);
  apiKeyInput._quotaErrorHandler = onInput;
  apiKeyInput.addEventListener('input', onInput);
}

/**
 * Clear the API-key quota error state (hide message, remove red border).
 */
function clearApiKeyQuotaError() {
  const apiKeyInput = document.getElementById('docxApiKey');
  const errorElement = document.getElementById('apiKeyErrorMsg');

  if (errorElement) {
    errorElement.style.display = 'none';
    errorElement.textContent = '';
  }
  apiKeyInput.classList.remove('highlight-required');
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
  chrome.storage.local.get(['quotaDataV2'], async (result) => {
    const cachedData = result.quotaDataV2;
    const now = new Date();

    // If we have cached data and it's not a forced refresh, use it
    if (cachedData && !forceRefresh) {
      const lastChecked = new Date(cachedData.lastChecked);
      // Use cached data if it's less than 10 minutes old
      if ((now - lastChecked) < 10 * 60 * 1000) {
        displayDualQuota(cachedData);
        return;
      }
    }

    // Show loading state
    quotaSection.style.display = 'block';

    try {
      let quotaData = null;
      let lastApiError = null;
      let lastStatusCode = null;

      // Try new subscription quota API first
      try {
        const response = await fetch(`${serverUrl}/subscriptions/my/quota`, {
          method: 'GET',
          headers: { 'X-API-Key': apiKey }
        });

        if (response.ok) {
          const data = await response.json();
          quotaData = {
            email: data.email,
            has_subscription: data.has_subscription,
            subscription: data.subscription,
            addon_quota: data.addon_quota,
            lastChecked: now.toISOString()
          };
        } else {
          // Save the error info for later handling
          lastStatusCode = response.status;
          lastApiError = await extractApiError(response);
        }
      } catch (e) {
        // New API not available (network error), will try old one
      }

      // Fallback to old quota API (only if new API didn't succeed AND didn't return a 401)
      if (!quotaData && lastStatusCode !== 401) {
        try {
          const response = await fetch(`${serverUrl}/auth/quota`, {
            method: 'GET',
            headers: { 'X-API-Key': apiKey }
          });

          if (response.ok) {
            const data = await response.json();
            quotaData = {
              email: data.email,
              has_subscription: false,
              subscription: null,
              addon_quota: {
                total_quota: data.total_quota,
                used_quota: data.used_quota,
                gift_quota: 0,
                expires_at: data.expires_at
              },
              lastChecked: now.toISOString()
            };
          } else {
            lastStatusCode = response.status;
            lastApiError = await extractApiError(response);
          }
        } catch (e) {
          // Network error on old API too
          lastApiError = getMessage('networkError') || '网络错误，请检查网络连接';
          lastStatusCode = 0;
        }
      }

      if (quotaData) {
        // Success – clear any previous error state on the API key input
        clearApiKeyQuotaError();
        chrome.storage.local.set({ quotaDataV2: quotaData });
        displayDualQuota(quotaData);
      } else {
        // Both APIs failed – clear stale cache and hide quota section
        chrome.storage.local.remove('quotaDataV2');
        quotaSection.style.display = 'none';

        const friendlyMsg = mapApiKeyError(lastApiError || '', lastStatusCode || 0);
        if (friendlyMsg) {
          showApiKeyQuotaError(friendlyMsg);
        } else {
          // Server/network error – show generic message on the input
          showApiKeyQuotaError(lastApiError || (getMessage('quotaCheckFailed') || '查询额度失败'));
        }
      }

    } catch (error) {
      console.error('Error checking quota:', error);
      quotaSection.style.display = 'none';
      showApiKeyQuotaError(getMessage('networkError') || '网络错误，请检查网络连接');
    }
  });
}

// Function to display dual quota data (subscription + addon)
function displayDualQuota(data) {
  const quotaSection = document.getElementById('quotaSection');
  quotaSection.style.display = 'block';

  // Display blurred email
  const emailElement = document.getElementById('userEmail');
  if (emailElement) {
    if (data.email) {
      emailElement.textContent = blurEmail(data.email);
      emailElement.onmouseenter = () => { emailElement.textContent = data.email; };
      emailElement.onmouseleave = () => { emailElement.textContent = blurEmail(data.email); };
    } else {
      emailElement.textContent = '';
      emailElement.onmouseenter = null;
      emailElement.onmouseleave = null;
    }
  }

  const subscriptionBlock = document.getElementById('subscriptionBlock');
  const addonBlock = document.getElementById('addonBlock');

  // --- Subscription daily quota ---
  if (data.has_subscription && data.subscription) {
    subscriptionBlock.style.display = 'flex';

    const dailyQuota = data.subscription.daily_quota;
    const usedToday = data.subscription.used_today;
    const dailyRemaining = Math.max(0, dailyQuota - usedToday);

    document.getElementById('subscriptionPlanName').textContent = data.subscription.plan_name;
    document.getElementById('dailyRemaining').textContent = dailyRemaining;
    document.getElementById('dailyTotal').textContent = dailyQuota;

    const dailyProgress = document.getElementById('dailyProgress');
    const dailyPercent = dailyQuota > 0 ? (dailyRemaining / dailyQuota) * 100 : 0;
    dailyProgress.style.width = `${dailyPercent}%`;
    dailyProgress.style.backgroundColor = dailyPercent < 20 ? '#FF6B6B' : '#4D6BFE';

    // Show reset note with subscription expiry
    const noteEl = document.getElementById('dailyResetNote');
    const resetText = getMessage('dailyResetNote') || '每日重置';
    if (data.subscription.expires_at) {
      const expDate = new Date(data.subscription.expires_at);
      noteEl.textContent = `${resetText} · 至 ${formatShortDate(expDate)}`;
    } else {
      noteEl.textContent = resetText;
    }
  } else {
    subscriptionBlock.style.display = 'none';
  }

  // --- Addon pay-per-use quota ---
  if (data.addon_quota && data.addon_quota.total_quota > 0) {
    addonBlock.style.display = 'flex';

    const total = data.addon_quota.total_quota;
    const used = data.addon_quota.used_quota;
    const remaining = Math.max(0, total - used);

    document.getElementById('addonRemaining').textContent = remaining;
    document.getElementById('addonTotal').textContent = total;

    const addonProgress = document.getElementById('addonProgress');
    const addonPercent = total > 0 ? (remaining / total) * 100 : 0;
    addonProgress.style.width = `${addonPercent}%`;
    addonProgress.style.backgroundColor = addonPercent < 20 ? '#FF6B6B' : '#4D6BFE';

    if (data.addon_quota.expires_at) {
      const expDate = new Date(data.addon_quota.expires_at);
      document.getElementById('addonExpiry').textContent = `${getMessage('expirationShort') || '有效期至'} ${formatShortDate(expDate)}`;
    } else {
      document.getElementById('addonExpiry').textContent = '';
    }
  } else if (!data.has_subscription) {
    // No subscription and no addon - show empty addon block
    addonBlock.style.display = 'flex';
    document.getElementById('addonRemaining').textContent = '0';
    document.getElementById('addonTotal').textContent = '0';
    document.getElementById('addonProgress').style.width = '0%';
    document.getElementById('addonExpiry').textContent = '';
  } else {
    addonBlock.style.display = 'none';
  }

  // Update footer links
  const subscribeLink = document.getElementById('subscribeLink');
  if (subscribeLink) {
    // Always show the link, but change text based on subscription status
    subscribeLink.style.display = 'inline';
    if (data.has_subscription) {
      subscribeLink.textContent = getMessage('renewSubscription') || '续费套餐';
    } else {
      subscribeLink.textContent = getMessage('purchaseSubscription') || '购买套餐';
    }
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

// Helper function to format date in a compact way (YYYY-MM-DD)
function formatShortDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper function to blur email: a***b@example.com
function blurEmail(email) {
  if (!email) return '';
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  const [user, domain] = parts;
  if (user.length <= 1) return '*@' + domain;
  if (user.length === 2) return user[0] + '*@' + domain;
  return user[0] + '***' + user[user.length - 1] + '@' + domain;
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
      const errorMsg = getMessage('emptyMarkdownError') || '请输入Markdown文本';
      convertBtn.disabled = true;
      convertBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
        <span>${errorMsg}</span>
      `;

      // After a timeout, restore the original button
      setTimeout(() => {
        convertBtn.disabled = false;
        convertBtn.innerHTML = originalButtonHTML;
      }, 2000);
      return;
    }

    // Check API key
    const settings = await chrome.storage.sync.get({
      docxServerUrl: 'https://api.ds.rick216.cn',
      docxApiKey: '',
      removeDividers: false,
      removeEmojis: false,
      convertMermaid: false,
      compatMode: true,
      hardLineBreaks: false
    });

    // Check if API key is provided
    if (!settings.docxApiKey || settings.docxApiKey.trim() === '') {
      const apiErrorMsg = getMessage('apiKeyMissingShort') || '请购买并填写API-Key以使用文档转换功能';

      // Switch to document conversion tab
      const docxTabBtn = document.querySelector('.tab-btn[data-tab="docx-tab"]');
      if (docxTabBtn) {
        docxTabBtn.click();
      }

      // Show inline error message
      const errorElement = document.getElementById('apiKeyErrorMsg');
      if (errorElement) {
        errorElement.innerHTML = apiErrorMsg;
        errorElement.style.display = 'inline';
      }

      // Highlight and focus on the API key input
      const apiKeyInput = document.getElementById('docxApiKey');
      apiKeyInput.classList.add('highlight-required');
      setTimeout(() => {
        apiKeyInput.focus();

        // Remove highlight when user starts typing
        apiKeyInput.addEventListener('input', function onInput() {
          apiKeyInput.classList.remove('highlight-required');

          // Hide the error message if it was showing
          const errorElement = document.getElementById('apiKeyErrorMsg');
          if (errorElement) {
            errorElement.style.display = 'none';
          }

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
        <span>${getMessage('docxConverting') || '正在转换...'}</span>
      `;

      // Call the conversion function with markdown text
      await convertMarkdownToDocx(markdownText, settings.docxServerUrl, settings.docxApiKey, settings.removeDividers, settings.removeEmojis, settings.convertMermaid, settings.compatMode, document.getElementById('wordTemplateSelect').value, settings.hardLineBreaks);

      // Update button to show success message briefly
      convertBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;">
          <path d="M20 6L9 17l-5-5"/>
        </svg>
        <span>${getMessage('docxConversionSuccess') || '转换成功!'}</span>
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

      let errorMessage = error.message;
      let shouldOpenSettings = false;

      // Network error - Failed to fetch
      if (error.message && error.message.includes('Failed to fetch')) {
        errorMessage = getMessage('networkError') || '转换失败，请检查网络';
      }
      // 401 Unauthorized - Invalid/missing/expired API key
      else if (error.message && (
        error.message.includes('401') ||
        error.message.includes('Unauthorized') ||
        error.message.includes('API Key is required') ||
        error.message.includes('Invalid or expired API key')
      )) {
        errorMessage = getMessage('apiKeyError') || 'API密钥填写错误，请联系客服微信：yorick_cn';
        shouldOpenSettings = true;
      }
      // 403 Forbidden - Quota exceeded
      else if (error.message && (
        error.message.includes('403') ||
        error.message.includes('Forbidden') ||
        error.message.includes('Quota exceeded')
      )) {
        errorMessage = getMessage('quotaExceededError') || '转换次数不足，请充值';
        shouldOpenSettings = true;
      }
      // Other API-related errors
      else if (error.message && (
        error.message.includes('Failed to read') ||
        error.message.includes('headers') ||
        error.message.includes('ISO-8859-1')
      )) {
        errorMessage = getMessage('apiKeyError') || 'API密钥错误，请联系客服微信：yorick_cn';
        shouldOpenSettings = true;
      }

      if (shouldOpenSettings) {
        // Restore button immediately for API errors
        convertBtn.disabled = false;
        convertBtn.innerHTML = originalButtonHTML;

        // Switch to document conversion tab with a shorter delay
        setTimeout(() => {
          const docxTabBtn = document.querySelector('.tab-btn[data-tab="docx-tab"]');
          if (docxTabBtn) {
            docxTabBtn.click();
          }

          // Show inline error message
          const errorElement = document.getElementById('apiKeyErrorMsg');
          if (errorElement) {
            errorElement.innerHTML = errorMessage;
            errorElement.style.display = 'inline';
          }

          // Highlight and focus on the API key input
          const apiKeyInput = document.getElementById('docxApiKey');
          if (apiKeyInput) {
            apiKeyInput.classList.add('highlight-required');
            apiKeyInput.focus();
          }
        }, 100);
      } else {
        // Show non-API error message on button
        convertBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
          <span>${errorMessage}</span>
        `;

        // Restore the original button after 2 seconds
        setTimeout(() => {
          convertBtn.disabled = false;
          convertBtn.innerHTML = originalButtonHTML;
        }, 2000);
      }
    }
  });

  // Clear button click handler
  clearBtn.addEventListener('click', () => {
    markdownInput.value = '';
  });
}

// Function to convert markdown text to DOCX
async function convertMarkdownToDocx(markdownText, serverUrl, apiKey, removeDividers = false, removeEmojis = false, convertMermaid = false, compatMode = true, template, hardLineBreaks = false) {
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

    // Remove emojis from content if enabled (frontend processing)
    let processedContent = markdownText;
    if (removeEmojis) {
      // First, convert number emojis to their text equivalents
      // Handle keycap number emojis (0️⃣-9️⃣) - these are composed of digit + FE0F + 20E3
      processedContent = processedContent.replace(/0\uFE0F?\u20E3/gu, '0. ');
      processedContent = processedContent.replace(/1\uFE0F?\u20E3/gu, '1. ');
      processedContent = processedContent.replace(/2\uFE0F?\u20E3/gu, '2. ');
      processedContent = processedContent.replace(/3\uFE0F?\u20E3/gu, '3. ');
      processedContent = processedContent.replace(/4\uFE0F?\u20E3/gu, '4. ');
      processedContent = processedContent.replace(/5\uFE0F?\u20E3/gu, '5. ');
      processedContent = processedContent.replace(/6\uFE0F?\u20E3/gu, '6. ');
      processedContent = processedContent.replace(/7\uFE0F?\u20E3/gu, '7. ');
      processedContent = processedContent.replace(/8\uFE0F?\u20E3/gu, '8. ');
      processedContent = processedContent.replace(/9\uFE0F?\u20E3/gu, '9. ');
      // Handle special keycap ten emoji
      processedContent = processedContent.replace(/🔟/gu, '10. ');

      // Then remove other emoji characters using regex
      processedContent = processedContent.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{FE00}-\u{FE0F}\u{1F200}-\u{1F251}]/gu, '');
    }

    const body = {
      content: processedContent,
      filename: filename,
      remove_hr: removeDividers,
      convert_mermaid: convertMermaid,
      compat_mode: compatMode,
      hard_line_breaks: hardLineBreaks,
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

  // Clear existing options
  selectElement.innerHTML = '';

  // Set default option first
  const defaultOption = document.createElement('option');
  defaultOption.value = 'templates';
  defaultOption.textContent = getMessage('universalTemplate') || 'Universal';
  selectElement.appendChild(defaultOption);

  try {
    const settings = await chrome.storage.sync.get({ docxServerUrl: 'https://api.ds.rick216.cn' });
    const serverUrl = settings.docxServerUrl || 'https://api.ds.rick216.cn';

    const response = await fetch(`${serverUrl}/templates`);
    if (!response.ok) {
      throw new Error(`Failed to fetch templates: ${response.status}`);
    }

    const templatesByLang = await response.json();

    // Determine the template language key based on current language preference
    let templateLangKey = getTemplateLangKey();

    // Try to get templates for the current language, fall back to 'en' if not available
    let templates = templatesByLang[templateLangKey] || [];
    if (templates.length === 0 && templateLangKey !== 'en') {
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

// Helper function to get the template language key based on current language preference
function getTemplateLangKey() {
  // If language is set to auto, use browser's UI language
  const lang = currentLanguage === 'auto' ? chrome.i18n.getUILanguage() : currentLanguage;

  // Map language codes to template keys
  // zh_CN, zh_TW, zh -> 'zh'
  // Other languages -> 'en' (fallback)
  if (lang.startsWith('zh') || lang === 'zh_CN' || lang === 'zh_TW') {
    return 'zh';
  }

  // For other languages, check if they have specific templates, otherwise use 'en'
  return 'en';
}
