document.addEventListener('DOMContentLoaded', () => {
    // Theme switching functionality
    initThemeSystem();

    // Purchase form functionality
    initRenewForm();

    // Load API key from Chrome storage if available
    loadApiKeyFromStorage();

    // Set up API key visibility toggle for quota checker
    setupApiKeyToggle('toggleQuotaApiKeyVisibility', 'check-api-key');

    // Set up API key visibility toggle for renewal form
    setupApiKeyToggle('toggleRenewApiKeyVisibility', 'renew-api-key');

    // Set up API key copy buttons
    setupApiKeyCopy('copyQuotaApiKey', 'check-api-key');
    setupApiKeyCopy('copyRenewApiKey', 'renew-api-key');
});

// Initialize theme system based on browser preference or saved setting
function initThemeSystem() {
    const themeToggle = document.querySelector('.theme-toggle');
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

    const currentTheme = localStorage.getItem('theme');
    if (currentTheme) {
        document.documentElement.setAttribute('data-theme', currentTheme);
    } else {
        const theme = prefersDarkScheme.matches ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';

            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        });
    }
}

// Setup API key visibility toggle
function setupApiKeyToggle(toggleBtnId, inputId) {
    const toggleBtn = document.getElementById(toggleBtnId);
    const apiKeyInput = document.getElementById(inputId);

    if (toggleBtn && apiKeyInput) {
        const eyeIcon = toggleBtn.querySelector('.eye-icon');
        const eyeOffIcon = toggleBtn.querySelector('.eye-off-icon');

        toggleBtn.addEventListener('click', () => {
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
    }
}

// Setup API key copy button
function setupApiKeyCopy(copyBtnId, inputId) {
    const copyBtn = document.getElementById(copyBtnId);
    const apiKeyInput = document.getElementById(inputId);

    if (copyBtn && apiKeyInput) {
        copyBtn.addEventListener('click', () => {
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
                copyBtn.appendChild(tooltip);

                // Remove tooltip after animation completes
                setTimeout(() => {
                    if (tooltip.parentNode === copyBtn) {
                        copyBtn.removeChild(tooltip);
                    }
                }, 1500);
            });
        });
    }
}

// Set up global API base URL
const baseUrl = 'https://api.ds.rick216.cn';

// Handle browser back button (bfcache) to reset button state
window.addEventListener('pageshow', (event) => {
    const purchaseBtn = document.querySelector('.purchase-btn');
    if (purchaseBtn) {
        purchaseBtn.textContent = '立即续费';
        purchaseBtn.disabled = false;
    }
});

// Initialize renewal form elements and event handlers
function initRenewForm() {
    const customAmountContainer = document.getElementById('custom-amount-container');
    const customAmountInput = document.getElementById('custom-amount');

    // Setup amount option selection
    document.querySelectorAll('.amount-option').forEach(option => {
        option.addEventListener('click', () => {
            // Remove selected class from all options
            document.querySelectorAll('.amount-option').forEach(o => {
                o.classList.remove('selected');
            });
            // Add selected class to clicked option
            option.classList.add('selected');

            // Check if custom option was selected
            const value = option.getAttribute('data-value');
            if (value === 'custom') {
                customAmountContainer.style.display = 'block';
                customAmountInput.focus();
                updateCustomAmountDetails();
            } else {
                customAmountContainer.style.display = 'none';
            }
        });
    });

    // Custom amount input handler
    if (customAmountInput) {
        customAmountInput.addEventListener('input', updateCustomAmountDetails);
    }

    // Purchase button handler
    const purchaseBtn = document.querySelector('.purchase-btn');
    if (purchaseBtn) {
        purchaseBtn.addEventListener('click', () => {
            const apiKeyInput = document.getElementById('renew-api-key');
            const apiKey = apiKeyInput.value.trim();
            const selectedOption = document.querySelector('.amount-option.selected');
            let amount;
            const method = 'web';

            if (selectedOption.getAttribute('data-value') === 'custom') {
                amount = customAmountInput.value;

                // Validate custom amount
                if (!amount || isNaN(amount) || parseInt(amount) < 1 || parseInt(amount) > 1000 || amount.includes('.')) {
                    alert('请输入有效的整数金额（1 - 1000 元）');
                    customAmountInput.focus();
                    return;
                }

                // Convert to integer
                amount = parseInt(amount);
            } else {
                amount = selectedOption.getAttribute('data-value');
            }

            // Validate API key format
            if (!apiKey) {
                alert('请填写您的 API Key');
                apiKeyInput.focus();
                return;
            }

            // Call payment processing function
            processRenewal(apiKey, amount, method);
        });
    }

    // Set up quota checker functionality
    const checkQuotaBtn = document.querySelector('.check-quota-btn');
    if (checkQuotaBtn) {
        checkQuotaBtn.addEventListener('click', checkQuota);
    }
}

// Calculate and display custom amount details
function updateCustomAmountDetails() {
    const customAmount = document.getElementById('custom-amount').value;
    const customAmountValue = document.getElementById('custom-amount-value');
    const customConversions = document.getElementById('custom-conversions');
    const customBonus = document.getElementById('custom-bonus');
    const customBonusText = document.getElementById('custom-bonus-text');
    const customTotalConversions = document.getElementById('custom-total-conversions');
    const customDiscountText = document.getElementById('custom-discount-text');

    // Default values
    customAmountValue.textContent = '--';
    customConversions.textContent = '--';
    customBonus.textContent = '--';
    customBonusText.style.display = 'none';
    customTotalConversions.textContent = '--';
    customDiscountText.style.display = 'none';

    // If we have a valid amount
    if (customAmount && !isNaN(customAmount) && parseInt(customAmount) >= 1) {
        const amount = parseInt(customAmount);
        const conversions = amount * 5;
        let bonus = 0;

        if (amount >= 200) {
            bonus = Math.ceil(conversions * 1.5);
        } else if (amount >= 100) {
            bonus = Math.ceil(conversions * 1.2);
        } else if (amount >= 60) {
            bonus = Math.ceil(conversions * 1.0);
        } else if (amount >= 20) {
            bonus = Math.ceil(conversions * 0.8);
        } else if (amount >= 10) {
            bonus = Math.ceil(conversions * 0.6);
        }

        const totalConversions = conversions + bonus;
        let discountDisplay = '-';

        customAmountValue.textContent = amount;
        customConversions.textContent = conversions;
        customTotalConversions.textContent = totalConversions;

        if (bonus > 0 && totalConversions > 0) {
            const discount = (50 * amount) / totalConversions;
            discountDisplay = (discount % 1 === 0) ? `${discount.toFixed(0)}折` : `${discount.toFixed(1)}折`;
            customDiscountText.innerHTML = `相当于 <span class="highlight">${discountDisplay}</span>`;
            customDiscountText.style.display = 'block';
        } else {
            customDiscountText.style.display = 'none';
        }

        if (bonus > 0) {
            customBonus.textContent = bonus;
            customBonusText.style.display = 'block';
        } else {
            customBonusText.style.display = 'none';
        }
    }
}

// Process renewal payment by creating an order through the API and showing the payment modal
async function processRenewal(apiKey, amount, method = 'api') {
    // Check if the API key is the trial key
    if (apiKey === 'f4e8fe6f-e39e-486f-b7e7-e037d2ec216f') {
        alert("您输入的是免费试用API密钥，无法充值，请点击确定购买专属API密钥。");
        // Redirect to the purchase page or open it in a new tab
        window.location.href = './purchase.html';
        return;
    }

    // Calculate conversions and bonus (still needed for display)
    const conversions = amount * 5;
    let bonus = 0;
    if (amount >= 200) {
        bonus = Math.ceil(conversions * 1.5);
    } else if (amount >= 100) {
        bonus = Math.ceil(conversions * 1.2);
    } else if (amount >= 60) {
        bonus = Math.ceil(conversions * 1.0);
    } else if (amount >= 20) {
        bonus = Math.ceil(conversions * 0.8);
    } else if (amount >= 10) {
        bonus = Math.ceil(conversions * 0.6);
    }

    // Show loading state on the purchase button
    const purchaseBtn = document.querySelector('.purchase-btn');
    const originalBtnText = purchaseBtn.textContent;
    purchaseBtn.textContent = '处理中...';
    purchaseBtn.disabled = true;

    try {
        // Create the payment order via API using the provided API key for authentication
        const resultUrl = new URL('payment-result.html', window.location.href).href;
        const response = await fetch(`${baseUrl}/payments/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey
            },
            body: JSON.stringify({
                amount: parseFloat(amount),
                payment_method: 'alipay',
                method: method,
                return_url: method === 'web' ? resultUrl : window.location.href
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'API Key 无效或创建订单失败，请检查您的 API Key 是否正确');
        }

        const orderData = await response.json();

        // Safety check for web method
        if (method === 'web') {
            if (orderData.payment_url) {
                // Save info for the result page
                localStorage.setItem('pending_api_key', apiKey);
                if (orderData.order_no) localStorage.setItem('pending_order_no', orderData.order_no);

                // Update text and skip button reset
                purchaseBtn.textContent = '正在前往支付，请稍等...';
                window.location.href = orderData.payment_url;
                return;
            } else {
                throw new Error('服务器未生成支付链接，请稍后重试');
            }
        }

        if (method === 'api') {
            showPaymentModal(orderData, apiKey, amount, conversions, bonus);
        }

    } catch (error) {
        alert('续费处理出错: ' + error.message);
        purchaseBtn.textContent = originalBtnText;
        purchaseBtn.disabled = false;
    }
}

// Show Alipay payment modal with QR code
function showPaymentModal(orderData, apiKey, amount, conversions, bonus) {
    // Create modal container
    const modal = document.createElement('div');
    modal.className = 'payment-modal';

    // Add beforeunload event listener to warn user about refreshing during payment
    const beforeUnloadHandler = (e) => {
        e.preventDefault();
        e.returnValue = '确定要刷新页面吗？如果您已经付款，刷新后可能接收不到支付结果通知！付款后没收到API Key请加微信：yorick_cn';
        return e.returnValue;
    };
    window.addEventListener('beforeunload', beforeUnloadHandler);

    // Store the handler in the modal so we can remove it later
    modal._beforeUnloadHandler = beforeUnloadHandler;

    // Detect if user is on mobile
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    // If on mobile and have payment_url, we can redirect directly
    if (isMobile && orderData.payment_url) {
        // Store the order info in localStorage so we can check status if user returns to page
        localStorage.setItem('pendingOrder', JSON.stringify({
            order_no: orderData.order_no,
            api_key: apiKey,
            amount: amount,
            conversions: conversions,
            bonus: bonus,
            total: conversions + bonus,
            timestamp: new Date().getTime()
        }));

        // Redirect to payment URL after a short delay
        setTimeout(() => {
            window.location.href = orderData.payment_url;
        }, 500);

        return;
    }

    // Create modal content for QR code payment
    modal.innerHTML = `
        <div class="payment-modal-content">
            <span class="close-modal">&times;</span>
            <div class="payment-header">
                <img src="assets/images/alipay.svg" alt="支付宝" class="alipay-logo">
                <h2>支付宝扫码付款</h2>
            </div>
            
            <div class="payment-container-single">
                <div class="alipay-qrcode-large">
                    <img src="${orderData.qr_img}" alt="支付宝支付二维码">
                    <div class="payment-status-wrapper">
                        <div class="payment-progress-spinner"></div>
                        <p class="payment-status">等待支付中...</p>
                    </div>
                </div>
                
                <div class="order-summary">
                    <div class="order-detail"><span>DeepShare 续费</span></div>
                    <div class="order-detail"><span>金额:</span><span>¥${amount}</span></div>
                    <div class="order-detail"><span>基础:</span><span>${conversions} 次</span></div>
                    ${bonus > 0 ? `<div class="order-detail bonus"><span>赠送:</span><span>${bonus} 次</span></div>` : ''}
                    <div class="order-detail total"><span>总计:</span><span>${conversions + bonus} 次</span></div>
                </div>
                
                ${isMobile && orderData.payment_url ? `
                    <a href="${orderData.payment_url}" target="_blank" class="open-alipay-btn">
                        打开支付宝付款
                    </a>
                ` : ''}
                
                <div class="order-id">
                    <span>订单号: ${orderData.order_no}</span>
                </div>
                
                <div class="payment-help" style="text-align: center; margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid #eee; color: #666; font-size: 0.8rem;">
                    <p style="margin: 0;">无法付款或其他付款方式请加微信：<strong style="color: #4D6BFE;">yorick_cn</strong></p>
                </div>
            </div>
        </div>
    `;

    // Add modal to the page
    document.body.appendChild(modal);

    // Show the modal with animation
    setTimeout(() => {
        modal.style.opacity = '1';
    }, 10);

    // Close button functionality
    const closeBtn = modal.querySelector('.close-modal');
    closeBtn.addEventListener('click', () => {
        // Confirm before closing if payment hasn't been confirmed
        if (confirm('确定要关闭支付页面吗？如果您已经付款，关闭后将接收不到支付结果通知！付款后没收到API Key请加微信：yorick_cn')) {
            closeModal(modal);
        }
    });

    // Close if clicking outside the modal content
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            // Same confirmation as close button
            if (confirm('确定要关闭支付页面吗？如果您已经付款，关闭后将接收不到支付结果通知！付款后没收到API Key请加微信：yorick_cn')) {
                closeModal(modal);
            }
        }
    });

    // Start polling for payment status
    pollPaymentStatus(orderData.order_no, apiKey, modal);
}

// Poll the API for payment status
function pollPaymentStatus(orderNo, apiKey, modal) {
    let pollCount = 0;
    const maxPolls = 60; // Poll for maximum 3 minutes (60 * 3 seconds)
    const pollInterval = 3000; // Poll every 3 seconds

    // Create an AbortController to allow stopping the polling
    const abortController = new AbortController();
    // Store the controller in the modal element so we can access it when closing
    modal._abortController = abortController;

    const checkStatus = async () => {
        // Check if polling has been aborted
        if (abortController.signal.aborted) {
            console.log('Payment status polling was aborted');
            return;
        }

        try {
            const response = await fetch(`${baseUrl}/payments/status/${orderNo}`, {
                method: 'GET',
                headers: {
                    'X-API-Key': apiKey
                }
            });

            if (!response.ok) {
                throw new Error('获取支付状态失败');
            }

            const data = await response.json();

            // If payment was successful
            if (data.status === 'success') {
                // Update UI to show success
                const statusElement = modal.querySelector('.payment-status');
                const spinnerElement = modal.querySelector('.payment-progress-spinner');

                if (statusElement) {
                    statusElement.textContent = '支付成功！';
                    statusElement.classList.add('success');
                }

                if (spinnerElement) {
                    spinnerElement.style.display = 'none';
                }

                // Replace modal content with success information
                setTimeout(() => {
                    showSuccessInformation(modal, apiKey, data);
                }, 1500);

                return;
            }

            // If payment failed
            if (data.status === 'failed') {
                const statusElement = modal.querySelector('.payment-status');
                const spinnerElement = modal.querySelector('.payment-progress-spinner');

                if (statusElement) {
                    statusElement.textContent = '支付失败';
                    statusElement.classList.add('error');
                }

                if (spinnerElement) {
                    spinnerElement.style.display = 'none';
                }

                return;
            }

            // Continue polling if still pending
            if (data.status === 'pending') {
                pollCount++;

                if (pollCount < maxPolls && !abortController.signal.aborted) {
                    setTimeout(checkStatus, pollInterval);
                } else {
                    // Stop polling after max attempts
                    const statusElement = modal.querySelector('.payment-status');
                    if (statusElement) {
                        statusElement.textContent = '等待支付超时，请稍后查询订单状态';
                    }
                }
            }

        } catch (error) {
            console.error('Error checking payment status:', error);
            pollCount++;

            // Continue polling even with errors, within limits
            if (pollCount < maxPolls && !abortController.signal.aborted) {
                setTimeout(checkStatus, pollInterval);
            }
        }
    };

    // Start the polling
    checkStatus();
}

// Show success information after renewal payment
function showSuccessInformation(modal, apiKey, paymentData) {
    const modalContent = modal.querySelector('.payment-modal-content');

    if (modalContent) {
        modalContent.innerHTML = `
            <span class="close-modal">&times;</span>
            <div class="success-container">
                <div class="success-header">
                    <div class="success-icon">✓</div>
                    <h2>续费成功</h2>
                </div>
                
                <div class="success-content">
                    <div class="quota-summary-compact">
                        <div class="quota-stat-row">
                            <span class="quota-label">本次充值总次数:</span>
                            <span class="quota-value">${paymentData.quota + paymentData.gift_quota}</span>
                        </div>
                        <div class="quota-stat-row">
                            <span class="quota-label">基础次数:</span>
                            <span class="quota-value">${paymentData.quota}</span>
                        </div>
                        <div class="quota-stat-row">
                            <span class="quota-label">赠送次数:</span>
                            <span class="quota-value highlight">${paymentData.gift_quota}</span>
                        </div>
                    </div>

                    <div class="usage-instructions">
                        <h3 class="usage-title">使用提示</h3>
                        <ol class="usage-steps">
                            <li>次数已成功添加到您的账户</li>
                            <li>可以查询总次数验证</li>
                            <li>遇到问题请联系客服，微信：yorick_cn</li>
                        </ol>
                    </div>
                </div>
                
                <button class="success-close-btn">完成</button>
            </div>
        `;

        // Set up event listeners for the new elements
        const closeBtn = modalContent.querySelector('.close-modal');
        const successCloseBtn = modalContent.querySelector('.success-close-btn');

        // Close button functionality
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                closeModal(modal);
            });
        }

        // Success close button functionality
        if (successCloseBtn) {
            successCloseBtn.addEventListener('click', () => {
                closeModal(modal);

                // After closing, initiate a quota check to refresh the quota display
                checkQuotaWithApiKey(apiKey);
            });
        }
    }
}

// Close modal with animation
function closeModal(modal) {
    // Stop polling if it exists
    if (modal._abortController) {
        modal._abortController.abort();
        console.log('Payment polling stopped');
    }

    // Remove beforeunload event listener
    if (modal._beforeUnloadHandler) {
        window.removeEventListener('beforeunload', modal._beforeUnloadHandler);
        console.log('Beforeunload handler removed');
    }

    modal.style.opacity = '0';
    setTimeout(() => {
        document.body.removeChild(modal);
    }, 300);
}

/**
 * Extract a user-friendly error message from a fetch response.
 */
async function extractApiError(response) {
    try {
        const data = await response.json();
        if (data.detail) return data.detail;
    } catch (_) { /* response is not JSON */ }
    return `HTTP ${response.status}`;
}

/**
 * Show the quota loading skeleton state
 */
function showQuotaLoading() {
    const quotaLoading = document.getElementById('quotaLoading');
    const quotaHeader = document.getElementById('quotaHeader');
    const quotaBlocks = document.getElementById('quotaBlocks');
    const quotaFooter = document.getElementById('quotaFooter');

    if (quotaLoading) quotaLoading.style.display = 'flex';
    if (quotaHeader) quotaHeader.style.display = 'none';
    if (quotaBlocks) quotaBlocks.style.display = 'none';
    if (quotaFooter) quotaFooter.style.display = 'none';
}

/**
 * Hide the quota loading skeleton state
 */
function hideQuotaLoading() {
    const quotaLoading = document.getElementById('quotaLoading');
    const quotaHeader = document.getElementById('quotaHeader');
    const quotaBlocks = document.getElementById('quotaBlocks');
    const quotaFooter = document.getElementById('quotaFooter');

    if (quotaLoading) quotaLoading.style.display = 'none';
    if (quotaHeader) quotaHeader.style.display = 'flex';
    if (quotaBlocks) quotaBlocks.style.display = 'flex';
    if (quotaFooter) quotaFooter.style.display = 'flex';
}

// Helper function to format date in a compact way (YYYY-MM-DD)
function formatShortDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Helper function to format date in a user-friendly way
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}年${month}月${day}日`;
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

// Function to display dual quota data (subscription + addon)
function displayDualQuota(data) {
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

    const hasSubscription = data.has_subscription && data.subscription;
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

        const noteEl = document.getElementById('dailyResetNote');
        if (data.subscription.expires_at) {
            const expDate = new Date(data.subscription.expires_at);
            const now = new Date();
            const daysUntilExpiry = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));

            noteEl.textContent = `每日重置 · 至 ${formatShortDate(expDate)}`;

            if (daysUntilExpiry <= 3 && daysUntilExpiry >= 0) {
                noteEl.style.color = '#FF6B6B';
                noteEl.style.fontWeight = '500';
            } else {
                noteEl.style.color = '';
                noteEl.style.fontWeight = '';
            }
        } else {
            noteEl.textContent = '每日重置';
            noteEl.style.color = '';
            noteEl.style.fontWeight = '';
        }
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

            addonExpiryEl.textContent = `${formatShortDate(expDate)} 到期`;

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
        if (hasSubscription) {
            subscribeLink.style.display = 'inline';
            subscribeLink.textContent = '续费套餐';
        } else {
            subscribeLink.style.display = 'inline';
            subscribeLink.textContent = '购买套餐';
        }
    }

    if (purchaseLink) {
        purchaseLink.textContent = '购买叠加额度';
    }
}

// Function to check API quota
async function checkQuota() {
    const apiKey = document.getElementById('check-api-key').value.trim();

    if (!apiKey) {
        alert('请输入您的 API Key');
        return;
    }

    // Call the quota check function with the API key
    checkQuotaWithApiKey(apiKey);
}

// Function to check API quota with a provided API key
async function checkQuotaWithApiKey(apiKey) {
    const resultsDiv = document.getElementById('quota-results');

    // Show loading state on button
    const checkBtn = document.querySelector('.check-quota-btn');
    const originalText = checkBtn ? checkBtn.textContent : '';
    if (checkBtn) {
        checkBtn.textContent = '查询中...';
        checkBtn.disabled = true;
    }

    // Show results container and loading skeleton
    resultsDiv.style.display = 'block';
    showQuotaLoading();

    try {
        let quotaData = null;
        let lastApiError = null;
        let lastStatusCode = null;

        // Try new subscription quota API first
        try {
            const response = await fetch(`${baseUrl}/subscriptions/my/quota`, {
                method: 'GET',
                headers: { 'X-API-Key': apiKey }
            });

            if (response.ok) {
                const data = await response.json();
                quotaData = {
                    email: data.email,
                    has_subscription: data.has_subscription,
                    subscription: data.subscription,
                    addon_quota: data.addon_quota
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
                const response = await fetch(`${baseUrl}/auth/quota`, {
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
                        }
                    };
                } else {
                    lastStatusCode = response.status;
                    lastApiError = await extractApiError(response);
                }
            } catch (e) {
                lastApiError = '网络错误，请检查网络连接';
                lastStatusCode = 0;
            }
        }

        if (quotaData) {
            hideQuotaLoading();
            displayDualQuota(quotaData);

            // Also populate the renewal form API key field if it's empty
            const renewApiKeyInput = document.getElementById('renew-api-key');
            if (renewApiKeyInput && !renewApiKeyInput.value.trim()) {
                renewApiKeyInput.value = apiKey;
            }
        } else {
            // Both APIs failed
            hideQuotaLoading();
            resultsDiv.style.display = 'none';

            if (lastStatusCode === 401) {
                alert('API Key 无效或已过期，请检查后重试');
            } else {
                alert(`查询失败: ${lastApiError || '未知错误'}`);
            }
        }

    } catch (error) {
        hideQuotaLoading();
        alert(`查询失败: ${error.message}`);
        resultsDiv.style.display = 'none';
    } finally {
        // Reset button if it exists
        if (checkBtn) {
            checkBtn.textContent = originalText;
            checkBtn.disabled = false;
        }
    }
}

// Function to load API key from URL parameters or Chrome storage
function loadApiKeyFromStorage() {
    let apiKey = '';

    // 1. Try to get from URL params (Priority)
    const urlParams = new URLSearchParams(window.location.search);
    const ak = urlParams.get('ak');

    if (ak) {
        try {
            // De-obfuscate: reverse then atob
            const reversed = ak.split('').reverse().join('');
            // Simple check if it looks like base64 before atob
            if (/^[A-Za-z0-9+/=]+$/.test(reversed)) {
                apiKey = atob(reversed);
            } else {
                apiKey = ak;
            }
        } catch (e) {
            console.error('Failed to decode API Key from URL', e);
            apiKey = ak;
        }
    }

    // Function to populate inputs
    const populateInputs = (key) => {
        const apiKeyInput = document.getElementById('check-api-key');
        if (apiKeyInput) {
            apiKeyInput.value = key;
        }

        const renewApiKeyInput = document.getElementById('renew-api-key');
        if (renewApiKeyInput) {
            renewApiKeyInput.value = key;
        }
    };

    if (apiKey) {
        populateInputs(apiKey);
        return; // Found in URL, skip storage
    }

    // 2. Fallback to Chrome storage if available
    if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.sync.get(['docxApiKey'], (data) => {
            if (data.docxApiKey) {
                populateInputs(data.docxApiKey);
            }
        });
    }
}