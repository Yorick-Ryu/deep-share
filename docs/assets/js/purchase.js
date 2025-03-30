document.addEventListener('DOMContentLoaded', () => {
    // Theme switching functionality
    initThemeSystem();
    
    // Purchase form functionality
    initPurchaseForm();
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
