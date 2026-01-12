document.addEventListener('DOMContentLoaded', () => {
    // Theme switching functionality
    initThemeSystem();

    // Purchase form functionality
    initPurchaseForm();

    // Load API key from Chrome storage if available
    loadApiKeyFromStorage();

    // Initialize FAQ accordion
    initFAQAccordion();

    // Set up API key visibility toggle
    const toggleApiKeyBtn = document.getElementById('toggleQuotaApiKeyVisibility');
    const apiKeyInput = document.getElementById('check-api-key');

    if (toggleApiKeyBtn && apiKeyInput) {
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
    }

    // Set up API key copy button
    const copyApiKeyBtn = document.getElementById('copyQuotaApiKey');

    if (copyApiKeyBtn && apiKeyInput) {
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
    }
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

// Set up global API base URL
const baseUrl = 'https://api.ds.rick216.cn';

// Handle browser back button (bfcache) to reset button state
window.addEventListener('pageshow', (event) => {
    const purchaseBtn = document.getElementById('purchase-btn');
    if (purchaseBtn) {
        purchaseBtn.textContent = '立即购买';
        purchaseBtn.disabled = false;
    }
});

// Initialize purchase form elements and event handlers
function initPurchaseForm() {
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
            const emailInput = document.getElementById('email');
            const email = emailInput.value.trim();
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

            // Validate email format
            if (!email) {
                alert('请填写您的邮箱地址');
                emailInput.focus();
                return;
            }

            if (!isValidEmail(email)) {
                alert('请输入有效的邮箱地址');
                emailInput.focus();
                return;
            }

            // Call payment processing function
            processPayment(email, amount, method);
        });
    }

    // Set up quota checker functionality
    const checkQuotaBtn = document.querySelector('.check-quota-btn');
    if (checkQuotaBtn) {
        checkQuotaBtn.addEventListener('click', checkQuota);
    }
}

// Function to validate email format
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
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
            // Display discount like "X.X折", or "X折" if it's a whole number
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

// Process payment by creating an order through the API and showing the payment modal
async function processPayment(email, amount, method = 'api') {
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
        // Create the payment order via API
        const resultUrl = new URL('payment-result.html', window.location.href).href;
        const response = await fetch(`${baseUrl}/payments/guest-create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                amount: parseFloat(amount),
                payment_method: 'alipay',
                method: method,
                return_url: method === 'web' ? resultUrl : window.location.href
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || '创建订单失败，请稍后重试');
        }

        const orderData = await response.json();

        // Safety check for web method
        if (method === 'web') {
            if (orderData.payment_url) {
                // Save info for the result page
                if (orderData.api_key) localStorage.setItem('pending_api_key', orderData.api_key);
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
            showPaymentModal(orderData, email, amount, conversions, bonus);
        }

    } catch (error) {
        alert('支付处理出错: ' + error.message);
        purchaseBtn.textContent = originalBtnText;
        purchaseBtn.disabled = false;
    }
}

// Show Alipay payment modal with QR code
function showPaymentModal(orderData, email, amount, conversions, bonus) {
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
            api_key: orderData.api_key,
            amount: amount,
            conversions: conversions,
            bonus: bonus,
            total: conversions + bonus,
            email: email,
            timestamp: new Date().getTime()
        }));

        // Redirect to payment URL after a short delay
        setTimeout(() => {
            window.location.href = orderData.payment_url;
        }, 500);

        return;
    }

    // Create modal content for QR code payment - optimized more compact layout with single column
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
                    <div class="order-detail"><span>DeepShare 转换次数</span></div>
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
    pollPaymentStatus(orderData.order_no, orderData.api_key, modal);
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

// Show success information after payment
function showSuccessInformation(modal, apiKey, paymentData) {
    const modalContent = modal.querySelector('.payment-modal-content');

    if (modalContent) {
        modalContent.innerHTML = `
            <span class="close-modal">&times;</span>
            <div class="success-container">
                <div class="success-header">
                    <div class="success-icon">✓</div>
                    <h2>支付成功</h2>
                </div>
                
                <div class="success-content">
                    <div class="api-key-section">
                        <h3>您的 API Key</h3>
                        <p class="api-key-instruction">请妥善保存您的 API Key，推荐下载到本地</p>
                        <div class="api-key-display-wrapper">
                            <input type="text" id="success-api-key" value="${apiKey}" readonly>
                            <button type="button" class="copy-api-key-btn" id="copySuccessApiKey" title="复制">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                            </button>
                            <button type="button" class="download-api-key-btn" id="downloadSuccessApiKey" title="下载">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="7 10 12 15 17 10"></polyline>
                                    <line x1="12" y1="15" x2="12" y2="3"></line>
                                </svg>
                            </button>
                        </div>
                    </div>
                    
                    <div class="quota-summary-compact">
                        <div class="quota-stat-row">
                            <span class="quota-label">总计次数:</span>
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
                        <h3 class="usage-title">如何使用？</h3>
                        <ol class="usage-steps">
                            <li>在浏览器中点击 DeepShare 扩展图标 <img src="assets/images/deepshare-icon.svg" alt="DeepShare Icon" class="inline-icon"></li>
                            <li>填入您收到的 API Key</li>
                            <li>遇到问题请联系客服，微信：yorick_cn</li>
                        </ol>
                    </div>
                </div>
                
                <button class="success-close-btn">关闭窗口</button>
            </div>
        `;

        // Set up event listeners for the new elements
        const closeBtn = modalContent.querySelector('.close-modal');
        const successCloseBtn = modalContent.querySelector('.success-close-btn');
        const apiKeyInput = modalContent.querySelector('#success-api-key');
        const copyApiKeyBtn = modalContent.querySelector('#copySuccessApiKey');
        const downloadApiKeyBtn = modalContent.querySelector('#downloadSuccessApiKey');

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

                // After closing, populate the API key in the quota checker field
                const checkApiKeyInput = document.getElementById('check-api-key');
                if (checkApiKeyInput) {
                    checkApiKeyInput.value = apiKey;
                    // Scroll to the quota checker section
                    const quotaChecker = document.querySelector('.quota-checker');
                    if (quotaChecker) {
                        quotaChecker.scrollIntoView({ behavior: 'smooth' });
                    }
                }
            });
        }

        // Copy API key button functionality
        if (copyApiKeyBtn && apiKeyInput) {
            copyApiKeyBtn.addEventListener('click', () => {
                // Copy to clipboard
                navigator.clipboard.writeText(apiKey).then(() => {
                    // Show success tooltip
                    const tooltip = document.createElement('span');
                    tooltip.className = 'copy-tooltip';
                    tooltip.textContent = '已复制!';
                    tooltip.style.opacity = '1';
                    copyApiKeyBtn.appendChild(tooltip);

                    // Remove tooltip after animation completes
                    setTimeout(() => {
                        if (tooltip.parentNode === copyApiKeyBtn) {
                            copyApiKeyBtn.removeChild(tooltip);
                        }
                    }, 1500);
                });
            });
        }

        // Download API key button functionality
        if (downloadApiKeyBtn && apiKeyInput) {
            downloadApiKeyBtn.addEventListener('click', () => {
                // Create a text file with the API key
                const blob = new Blob([apiKey], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);

                // Create temporary link and trigger download
                const a = document.createElement('a');
                a.href = url;
                a.download = 'deepshare_api_key.txt';
                document.body.appendChild(a);
                a.click();

                // Clean up
                setTimeout(() => {
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);

                    // Show success tooltip
                    const tooltip = document.createElement('span');
                    tooltip.className = 'copy-tooltip';
                    tooltip.textContent = '已下载!';
                    tooltip.style.opacity = '1';
                    downloadApiKeyBtn.appendChild(tooltip);

                    // Remove tooltip after animation completes
                    setTimeout(() => {
                        if (tooltip.parentNode === downloadApiKeyBtn) {
                            downloadApiKeyBtn.removeChild(tooltip);
                        }
                    }, 1500);
                }, 100);
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

// Copy text to clipboard using newer Clipboard API if available, with fallback
function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text)
            .catch(err => {
                console.error('Failed to copy text: ', err);
                fallbackCopyToClipboard(text);
            });
    } else {
        fallbackCopyToClipboard(text);
    }
}

// Fallback method for copying to clipboard
function fallbackCopyToClipboard(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);

    try {
        textarea.select();
        document.execCommand('copy');
    } catch (err) {
        console.error('Fallback clipboard copy failed: ', err);
    }

    document.body.removeChild(textarea);
}

// Function to check API quota
async function checkQuota() {
    const apiKey = document.getElementById('check-api-key').value.trim();
    const resultsDiv = document.getElementById('quota-results');

    if (!apiKey) {
        alert('请输入您的 API Key');
        return;
    }

    // Show loading state
    const checkBtn = document.querySelector('.check-quota-btn');
    const originalText = checkBtn.textContent;
    checkBtn.textContent = '查询中...';
    checkBtn.disabled = true;

    try {
        const response = await fetch(`${baseUrl}/auth/quota`, {
            method: 'GET',
            headers: {
                'X-API-Key': apiKey
            }
        });

        if (!response.ok) {
            throw new Error(`API Key 无效或服务器错误: ${response.status}`);
        }

        const data = await response.json();

        // Display results
        document.getElementById('total-quota').textContent = data.total_quota;
        document.getElementById('used-quota').textContent = data.used_quota;
        document.getElementById('remaining-quota').textContent = data.remaining_quota;

        // Format and display expiration date
        if (data.expires_at) {
            const expirationDate = new Date(data.expires_at);
            const formattedDate = formatDate(expirationDate);
            document.getElementById('expiration-date').textContent = formattedDate;
        } else {
            document.getElementById('expiration-date').textContent = '未知';
        }

        // Calculate percentage of remaining quota (not used quota) and update progress bar
        const percentRemaining = (data.remaining_quota / data.total_quota) * 100;
        const progressBar = document.getElementById('quota-progress');
        progressBar.style.width = `${percentRemaining}%`;

        // Change color if running low (less than 20% remaining)
        if (data.remaining_quota < data.total_quota * 0.2) {
            progressBar.style.backgroundColor = '#FF6B6B';
        } else {
            progressBar.style.backgroundColor = '#4D6BFE';
        }

        // Show results
        resultsDiv.style.display = 'block';

    } catch (error) {
        alert(`查询失败: ${error.message}`);
        resultsDiv.style.display = 'none';
    } finally {
        // Reset button
        checkBtn.textContent = originalText;
        checkBtn.disabled = false;
    }
}

// Helper function to format date in a user-friendly way
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}年${month}月${day}日`;
}

// Function to load API key from Chrome storage
function loadApiKeyFromStorage() {
    // Check if we can access Chrome storage (we're in the extension context)
    if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.sync.get(['docxApiKey'], (data) => {
            if (data.docxApiKey) {
                const apiKeyInput = document.getElementById('check-api-key');
                if (apiKeyInput) {
                    apiKeyInput.value = data.docxApiKey;
                }
            }
        });
    }
}

// Initialize FAQ accordion functionality
function initFAQAccordion() {
    const faqCards = document.querySelectorAll('.faq-card');

    faqCards.forEach((card, index) => {
        const question = card.querySelector('.faq-question');

        // If it's the last card (遇到其他问题？), expand it by default
        if (index === faqCards.length - 1) {
            card.classList.remove('collapsed');
        }

        if (question) {
            question.addEventListener('click', () => {
                // Toggle the collapsed class
                card.classList.toggle('collapsed');
            });
        }
    });
}
