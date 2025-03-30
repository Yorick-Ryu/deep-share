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
            
            // Call payment processing API
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

// Process payment (stub function to be implemented with actual payment gateway)
function processPayment(email, amount) {
    console.log(`Processing payment: Amount: ¥${amount}, Email: ${email}`);
    
    // Calculate conversions and bonus
    const conversions = amount * 5;
    let bonus = 0;
    if (amount >= 5) {
        bonus = Math.min(amount, 200) * 5;
    }
    
    // Here you would normally call your payment API
    alert(`支付处理将在此处进行。\n金额: ¥${amount}\n邮箱: ${email}\n可获得: ${conversions}次转换${bonus > 0 ? '\n赠送: ' + bonus + '次转换' : ''}`);
    
    // After successful payment, the backend would send the API key to the user's email
}
