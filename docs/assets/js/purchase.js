document.addEventListener('DOMContentLoaded', () => {
    // Theme switching functionality
    initThemeSystem();
    
    // Purchase form functionality
    initPurchaseForm();
    
    // Load API key from Chrome storage if available
    loadApiKeyFromStorage();
    
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
            const email = document.getElementById('email').value;
            const selectedOption = document.querySelector('.amount-option.selected');
            let amount;
            
            if (selectedOption.getAttribute('data-value') === 'custom') {
                amount = customAmountInput.value;
                
                // Validate custom amount
                if (!amount || isNaN(amount) || parseInt(amount) < 1 || amount.includes('.')) {
                    alert('请输入有效的整数金额（最小 1 元）');
                    customAmountInput.focus();
                    return;
                }
                
                // Convert to integer
                amount = parseInt(amount);
            } else {
                amount = selectedOption.getAttribute('data-value');
            }
            
            if (!email) {
                alert('请填写您的邮箱地址');
                return;
            }
            
            // Call payment processing function
            processPayment(email, amount);
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
    
    // Default values
    customAmountValue.textContent = '--';
    customConversions.textContent = '--';
    customBonus.textContent = '--';
    customBonusText.style.display = 'none';
    
    // If we have a valid amount
    if (customAmount && !isNaN(customAmount) && parseInt(customAmount) >= 1) {
        const amount = parseInt(customAmount);
        const conversions = amount * 5; // 0.2元/次 = 5次/元
        
        customAmountValue.textContent = amount;
        customConversions.textContent = conversions;
        
        // Check if eligible for bonus (amount ≥ 5)
        if (amount >= 5) {
            const bonus = Math.min(amount, 200) * 5; // Cap bonus at 200元
            customBonus.textContent = bonus;
            customBonusText.style.display = 'block';
        }
    }
}

// Process payment by generating text, copying to clipboard and showing WeChat instructions
function processPayment(email, amount) {
    // Calculate conversions and bonus
    const conversions = amount * 5;
    let bonus = 0;
    if (amount >= 5) {
        bonus = Math.min(amount, 200) * 5;
    }
    
    // Generate payment information text
    const paymentText = `DeepShare充值申请：
金额: ${amount}元
邮箱: ${email}
可获得: ${conversions}次转换${bonus > 0 ? '\n赠送: ' + bonus + '次转换' : ''}
总计: ${conversions + bonus}次转换`;
    
    // Copy to clipboard
    copyToClipboard(paymentText);
    
    // Show WeChat payment modal
    showWeChatModal();
}

// Copy text to clipboard
function copyToClipboard(text) {
    // Create a temporary textarea element
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    
    // Select and copy the text
    textarea.select();
    document.execCommand('copy');
    
    // Remove the temporary element
    document.body.removeChild(textarea);
}

// Show WeChat payment modal with instructions
function showWeChatModal() {
    // Create modal container
    const modal = document.createElement('div');
    modal.className = 'payment-modal';
    
    // Create modal content
    modal.innerHTML = `
        <div class="payment-modal-content">
            <span class="close-modal">&times;</span>
            <h2>请通过微信支付</h2>
            <div class="payment-steps">
                <div class="payment-step">
                    <div class="step-number">1</div>
                    <p>付款信息已复制到剪贴板</p>
                </div>
                <div class="payment-step">
                    <div class="step-number">2</div>
                    <p>扫描下方二维码添加客服微信</p>
                </div>
                <div class="payment-step">
                    <div class="step-number">3</div>
                    <p>将复制的文本粘贴给客服，完成付款</p>
                </div>
            </div>
            <div class="wechat-qrcode">
                <img src="./assets/images/wechat-code.jpg" alt="WeChat QR Code">
                <p class="wechat-id">微信号：yorick_cn</p>
            </div>
            <p class="payment-note">完成付款后，我们将在24小时内向您的微信或邮箱发送 API Key</p>
            <button class="copy-again-btn">再次复制付款信息</button>
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
        closeModal(modal);
    });
    
    // "Copy again" button functionality
    const copyAgainBtn = modal.querySelector('.copy-again-btn');
    copyAgainBtn.addEventListener('click', () => {
        const email = document.getElementById('email').value;
        const selectedOption = document.querySelector('.amount-option.selected');
        let amount;
        
        if (selectedOption.getAttribute('data-value') === 'custom') {
            amount = document.getElementById('custom-amount').value;
            amount = parseInt(amount);
        } else {
            amount = selectedOption.getAttribute('data-value');
        }
        
        // Recalculate and copy the payment information
        const conversions = amount * 5;
        let bonus = 0;
        if (amount >= 5) {
            bonus = Math.min(amount, 200) * 5;
        }
        
        const paymentText = `DeepShare充值申请：
金额: ${amount}元
邮箱: ${email}
可获得: ${conversions}次转换${bonus > 0 ? '\n赠送: ' + bonus + '次转换' : ''}
总计: ${conversions + bonus}次转换`;
        
        copyToClipboard(paymentText);
        
        // Show confirmation
        const confirmCopy = document.createElement('div');
        confirmCopy.className = 'copy-confirmation';
        confirmCopy.textContent = '已复制!';
        copyAgainBtn.appendChild(confirmCopy);
        
        setTimeout(() => {
            confirmCopy.remove();
        }, 2000);
    });
    
    // Close if clicking outside the modal content
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal(modal);
        }
    });
}

// Close modal with animation
function closeModal(modal) {
    modal.style.opacity = '0';
    setTimeout(() => {
        document.body.removeChild(modal);
    }, 300);
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
        const response = await fetch('https://api.ds.rick216.cn/auth/quota', {
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
    } else {
        // Alternative method using localStorage for web page context
        const urlParams = new URLSearchParams(window.location.search);
        const apiKey = urlParams.get('apiKey');
        
        if (apiKey) {
            const apiKeyInput = document.getElementById('check-api-key');
            if (apiKeyInput) {
                apiKeyInput.value = apiKey;
            }
        }
    }
}
