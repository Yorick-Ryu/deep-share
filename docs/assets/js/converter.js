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
    apiKeyRequired: 'API Key 不能为空',
    apiKeyUserInactive: '关联账户已被停用',
    apiKeyExpired: 'API Key 无效或已过期',
    converting: '正在转换...',
    conversionSuccess: '转换成功!',
    conversionFailed: '转换失败',
    copied: '已复制!',
    unknown: '未知',
    universalTemplate: '通用模版',
    validUntil: '有效期至:',
    yourQuota: '转换额度',
    dailyQuotaLabel: '每日配额',
    addonQuotaLabel: '按量配额',
    dailyResetNote: '每日重置',
    subscriptionExpiryNote: '每日重置 · 至 {date}',
    addonExpiryNote: '{date} 到期',
    subscriptionExpiredDays: '已过期 {days} 天',
    networkError: '网络错误，请检查网络连接',
    quotaCheckFailed: '查询额度失败',
    quotaExceededError: '转换次数不足，请充值',
    apiKeyError: 'API密钥错误或过期，请联系客服微信：yorick_cn',
    purchaseSubscription: '购买套餐',
    renewSubscription: '续费套餐',
    purchaseAddonQuota: '购买叠加额度',
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
    apiKeyRequired: 'API Key is required',
    apiKeyUserInactive: 'Associated account is inactive',
    apiKeyExpired: 'Invalid or expired API Key',
    converting: 'Converting...',
    conversionSuccess: 'Conversion successful!',
    conversionFailed: 'Conversion failed',
    copied: 'Copied!',
    unknown: 'Unknown',
    universalTemplate: 'Universal Template',
    validUntil: 'Valid until:',
    yourQuota: 'Conversion Quota',
    dailyQuotaLabel: 'Daily Quota',
    addonQuotaLabel: 'Add-on Quota',
    dailyResetNote: 'Resets daily',
    subscriptionExpiryNote: 'Resets daily · Until {date}',
    addonExpiryNote: 'Expires {date}',
    subscriptionExpiredDays: 'Expired {days} days ago',
    networkError: 'Network error, please check your connection',
    quotaCheckFailed: 'Failed to check quota',
    quotaExceededError: 'Quota exceeded, please recharge',
    apiKeyError: 'API key error or expired, please contact support',
    purchaseSubscription: 'Buy Plan',
    renewSubscription: 'Renew Plan',
    purchaseAddonQuota: 'Buy Addon Quota',
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
      compatMode: localStorage.getItem('compatMode') !== 'false', // Default to true
      hardLineBreaks: localStorage.getItem('hardLineBreaks') === 'true',
      lastUsedTemplate: localStorage.getItem('lastUsedTemplate') || 'templates',
      markdownText: localStorage.getItem('markdownText') || ''
    };

    document.getElementById('docxApiKey').value = settings.docxApiKey;
    document.getElementById('convertMermaid').checked = settings.convertMermaid;
    document.getElementById('removeDividers').checked = settings.removeDividers;
    document.getElementById('removeEmojis').checked = settings.removeEmojis;
    document.getElementById('compatMode').checked = settings.compatMode;
    document.getElementById('hardLineBreaks').checked = settings.hardLineBreaks;
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
      compatMode: document.getElementById('compatMode').checked,
      hardLineBreaks: document.getElementById('hardLineBreaks').checked,
      lastUsedTemplate: document.getElementById('wordTemplateSelect').value,
      markdownText: document.getElementById('markdownInput').value
    };

    localStorage.setItem('docxApiKey', settings.docxApiKey);
    localStorage.setItem('convertMermaid', settings.convertMermaid);
    localStorage.setItem('removeDividers', settings.removeDividers);
    localStorage.setItem('removeEmojis', settings.removeEmojis);
    localStorage.setItem('compatMode', settings.compatMode);
    localStorage.setItem('hardLineBreaks', settings.hardLineBreaks);
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
    document.getElementById('compatMode'),
    document.getElementById('hardLineBreaks'),
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
 * Map API error messages to user-friendly text for the API Key input.
 * Returns null if the error is not API-key related (e.g. server error).
 */
function mapApiKeyError(detail, statusCode) {
  // 401 errors are always API-key related
  if (statusCode === 401) {
    if (detail.includes('required')) {
      return t('apiKeyRequired');
    }
    if (detail.includes('not active')) {
      return t('apiKeyUserInactive');
    }
    if (detail.includes('Invalid or expired')) {
      return t('apiKeyExpired');
    }
    return t('apiKeyInvalid');
  }
  // Network / server errors are not shown on the input
  return null;
}

/**
 * Show an API-key related error: display message inline, highlight the input red.
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

/**
 * Show the quota loading skeleton state
 */
function showQuotaLoading(cachedData = null) {
  const quotaSection = document.getElementById('quotaSection');
  const quotaLoading = document.getElementById('quotaLoading');
  const quotaHeader = document.querySelector('.quota-header');
  const quotaBlocks = document.getElementById('quotaBlocks');
  const quotaFooter = document.querySelector('.quota-footer');

  // Show the quota section
  quotaSection.style.display = 'block';

  // Show loading skeleton
  if (quotaLoading) {
    quotaLoading.style.display = 'flex';
  }

  // Determine which skeleton blocks to show based on cached data
  const subscriptionLoadingBlock = document.getElementById('subscriptionLoadingBlock');
  const addonLoadingBlock = document.getElementById('addonLoadingBlock');

  if (cachedData) {
    const hasSubscription = cachedData.has_subscription && cachedData.subscription;
    const hasAddon = cachedData.addon_quota && cachedData.addon_quota.total_quota > 0;

    if (subscriptionLoadingBlock) {
      subscriptionLoadingBlock.style.display = hasSubscription ? 'flex' : 'none';
    }
    if (addonLoadingBlock) {
      addonLoadingBlock.style.display = hasAddon ? 'flex' : 'none';
    }
  } else {
    if (subscriptionLoadingBlock) {
      subscriptionLoadingBlock.style.display = 'flex';
    }
    if (addonLoadingBlock) {
      addonLoadingBlock.style.display = 'flex';
    }
  }

  // Hide actual content
  if (quotaHeader) {
    quotaHeader.style.display = 'none';
  }
  if (quotaBlocks) {
    quotaBlocks.style.display = 'none';
  }
  if (quotaFooter) {
    quotaFooter.style.display = 'none';
  }
}

/**
 * Hide the quota loading skeleton state
 */
function hideQuotaLoading() {
  const quotaLoading = document.getElementById('quotaLoading');
  const quotaHeader = document.querySelector('.quota-header');
  const quotaBlocks = document.getElementById('quotaBlocks');
  const quotaFooter = document.querySelector('.quota-footer');
  const subscriptionLoadingBlock = document.getElementById('subscriptionLoadingBlock');
  const addonLoadingBlock = document.getElementById('addonLoadingBlock');

  if (quotaLoading) {
    quotaLoading.style.display = 'none';
  }
  if (subscriptionLoadingBlock) {
    subscriptionLoadingBlock.style.display = 'none';
  }
  if (addonLoadingBlock) {
    addonLoadingBlock.style.display = 'none';
  }

  if (quotaHeader) {
    quotaHeader.style.display = 'flex';
  }
  if (quotaBlocks) {
    quotaBlocks.style.display = 'flex';
  }
  if (quotaFooter) {
    quotaFooter.style.display = 'flex';
  }
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
  const cachedDataStr = localStorage.getItem('quotaDataV2');
  const now = new Date();
  let cachedData = null;

  // If we have cached data and it's not a forced refresh, use it
  if (cachedDataStr && !forceRefresh) {
    try {
      cachedData = JSON.parse(cachedDataStr);
      const lastChecked = new Date(cachedData.lastChecked);
      // Use cached data if it's less than 10 minutes old
      if ((now - lastChecked) < 10 * 60 * 1000) {
        displayDualQuota(cachedData);
        return;
      }
    } catch (error) {
      console.error('Error parsing cached quota data:', error);
    }
  }

  // Show loading state when fetching new data
  showQuotaLoading(cachedData);

  try {
    let quotaData = null;
    let lastApiError = null;
    let lastStatusCode = null;

    // Try new subscription quota API first
    try {
      const response = await fetch(`${SERVER_URL}/subscriptions/my/quota`, {
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
        lastStatusCode = response.status;
        lastApiError = await extractApiError(response);
      }
    } catch (e) {
      // New API not available (network error), will try old one
    }

    // Fallback to old quota API (only if new API didn't succeed AND didn't return a 401)
    if (!quotaData && lastStatusCode !== 401) {
      try {
        const response = await fetch(`${SERVER_URL}/auth/quota`, {
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
        lastApiError = t('networkError');
        lastStatusCode = 0;
      }
    }

    if (quotaData) {
      // Success – clear any previous error state on the API key input
      clearApiKeyQuotaError();
      localStorage.setItem('quotaDataV2', JSON.stringify(quotaData));
      displayDualQuota(quotaData);
    } else {
      // Both APIs failed – hide loading and quota section
      hideQuotaLoading();
      localStorage.removeItem('quotaDataV2');
      quotaSection.style.display = 'none';

      const friendlyMsg = mapApiKeyError(lastApiError || '', lastStatusCode || 0);
      if (friendlyMsg) {
        showApiKeyQuotaError(friendlyMsg);
      } else {
        // Server/network error – show generic message on the input
        showApiKeyQuotaError(lastApiError || t('quotaCheckFailed'));
      }
    }

  } catch (error) {
    console.error('Error checking quota:', error);
    hideQuotaLoading();
    quotaSection.style.display = 'none';
    showApiKeyQuotaError(t('networkError'));
  }
}

// Helper function to format date in a compact way (YYYY-MM-DD)
function formatShortDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Function to display dual quota data (subscription + addon)
function displayDualQuota(data) {
  const quotaSection = document.getElementById('quotaSection');

  // Hide loading state and show actual content
  hideQuotaLoading();
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

  // Determine what quota types the user has
  const hasSubscription = data.has_subscription && data.subscription;
  const hasExpiredSubscription = !data.has_subscription && data.subscription && data.subscription.status === 'expired';
  const hasAddon = data.addon_quota && data.addon_quota.total_quota > 0;

  // --- Subscription daily quota ---
  if (hasSubscription) {
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
    const resetText = t('dailyResetNote');
    if (data.subscription.expires_at) {
      const expDate = new Date(data.subscription.expires_at);
      const now = new Date();
      const daysUntilExpiry = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));

      noteEl.textContent = t('subscriptionExpiryNote').replace('{date}', formatShortDate(expDate));

      if (daysUntilExpiry <= 3 && daysUntilExpiry >= 0) {
        noteEl.style.color = '#FF6B6B';
        noteEl.style.fontWeight = '500';
      } else {
        noteEl.style.color = '';
        noteEl.style.fontWeight = '';
      }
    } else {
      noteEl.textContent = resetText;
      noteEl.style.color = '';
      noteEl.style.fontWeight = '';
    }
  } else if (hasExpiredSubscription) {
    // Show expired subscription info
    subscriptionBlock.style.display = 'flex';

    document.getElementById('subscriptionPlanName').textContent = data.subscription.plan_name;
    document.getElementById('dailyRemaining').textContent = '0';
    document.getElementById('dailyTotal').textContent = data.subscription.daily_quota;

    const dailyProgress = document.getElementById('dailyProgress');
    dailyProgress.style.width = '0%';
    dailyProgress.style.backgroundColor = '#FF6B6B';

    const noteEl = document.getElementById('dailyResetNote');
    const expDate = new Date(data.subscription.expires_at);
    const now = new Date();
    const daysExpired = Math.max(1, Math.floor((now - expDate) / (1000 * 60 * 60 * 24)));
    const expiredText = t('subscriptionExpiredDays') || '已过期 {days} 天';
    noteEl.textContent = expiredText.replace('{days}', daysExpired);
    noteEl.style.color = '#FF6B6B';
    noteEl.style.fontWeight = '500';
  } else {
    subscriptionBlock.style.display = 'none';
  }

  // --- Addon pay-per-use quota ---
  if (hasAddon) {
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

    const addonExpiryEl = document.getElementById('addonExpiry');
    if (data.addon_quota.expires_at) {
      const expDate = new Date(data.addon_quota.expires_at);
      const now = new Date();
      const daysUntilExpiry = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));

      addonExpiryEl.textContent = t('addonExpiryNote').replace('{date}', formatShortDate(expDate));

      if (daysUntilExpiry <= 3 && daysUntilExpiry >= 0) {
        addonExpiryEl.style.color = '#FF6B6B';
        addonExpiryEl.style.fontWeight = '500';
      } else {
        addonExpiryEl.style.color = '';
        addonExpiryEl.style.fontWeight = '';
      }
    } else {
      addonExpiryEl.textContent = '';
      addonExpiryEl.style.color = '';
      addonExpiryEl.style.fontWeight = '';
    }
  } else {
    addonBlock.style.display = 'none';
  }

  // Update links based on quota status
  const subscribeLink = document.getElementById('subscribeLink');
  const purchaseLink = document.getElementById('purchaseLink');

  if (subscribeLink) {
    if (hasSubscription || hasExpiredSubscription) {
      subscribeLink.style.display = 'inline';
      subscribeLink.textContent = t('renewSubscription');
    } else {
      subscribeLink.style.display = 'inline';
      subscribeLink.textContent = t('purchaseSubscription');
    }
  }

  if (purchaseLink) {
    purchaseLink.textContent = t('purchaseAddonQuota');
  }
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
    const compatMode = document.getElementById('compatMode').checked;
    const hardLineBreaks = document.getElementById('hardLineBreaks').checked;
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
      await convertMarkdownToDocx(markdownText, docxApiKey, convertMermaid, removeDividers, removeEmojis, compatMode, template, hardLineBreaks);

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

      let errorMessage = error.message;
      let shouldHighlightApiKey = false;

      // Network error - Failed to fetch
      if (error.message && error.message.includes('Failed to fetch')) {
        errorMessage = t('networkError');
      }
      // 401 Unauthorized - Invalid/missing/expired API key
      else if (error.message && (
        error.message.includes('401') ||
        error.message.includes('Unauthorized') ||
        error.message.includes('API Key is required') ||
        error.message.includes('Invalid or expired API key')
      )) {
        errorMessage = t('apiKeyError');
        shouldHighlightApiKey = true;
      }
      // 403 Forbidden - Quota exceeded
      else if (error.message && (
        error.message.includes('403') ||
        error.message.includes('Forbidden') ||
        error.message.includes('Quota exceeded')
      )) {
        errorMessage = t('quotaExceededError');
        shouldHighlightApiKey = true;
      }
      // Other API-related errors
      else if (error.message && (
        error.message.includes('Failed to read') ||
        error.message.includes('headers') ||
        error.message.includes('ISO-8859-1')
      )) {
        errorMessage = t('apiKeyError');
        shouldHighlightApiKey = true;
      }

      if (shouldHighlightApiKey) {
        // Restore button immediately for API errors
        convertBtn.disabled = false;
        convertBtn.innerHTML = originalButtonHTML;

        // Show inline error message
        showApiKeyQuotaError(errorMessage);

        // Focus on the API key input
        setTimeout(() => {
          const apiKeyInput = document.getElementById('docxApiKey');
          if (apiKeyInput) {
            apiKeyInput.focus();
          }
        }, 100);
      } else {
        // Show non-API error message on button
        convertBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
          <span>${errorMessage || t('conversionFailed')}</span>
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
    // Save the cleared state
    saveSettings();
  });
}

// Function to convert markdown text to DOCX
async function convertMarkdownToDocx(markdownText, apiKey, convertMermaid = false, removeDividers = false, removeEmojis = false, compatMode = true, template, hardLineBreaks = false) {
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
      convert_mermaid: convertMermaid,
      remove_hr: removeDividers,
      compat_mode: compatMode,
      hard_line_breaks: hardLineBreaks,
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

