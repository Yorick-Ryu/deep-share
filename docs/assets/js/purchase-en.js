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
                tooltip.textContent = 'Copied!';
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

// Initialize purchase form elements and event handlers
function initPurchaseForm() {
    // Setup amount option selection
    document.querySelectorAll('.amount-option').forEach(option => {
        option.addEventListener('click', () => {
            // Remove selected class from all options
            document.querySelectorAll('.amount-option').forEach(o => {
                o.classList.remove('selected');
            });
            // Add selected class to clicked option
            option.classList.add('selected');
        });
    });
    
    // Purchase button handler
    const purchaseBtn = document.querySelector('.purchase-btn');
    if (purchaseBtn) {
        purchaseBtn.addEventListener('click', () => {
            // Check if maintenance mode is enabled
            if (purchaseBtn.disabled) {
                alert('Payment system is under maintenance and purchases are temporarily unavailable. Please try again later, or contact us via email: yoricker@foxmail.com');
                return;
            }
            
            const emailInput = document.getElementById('email');
            const email = emailInput.value.trim();
            const selectedOption = document.querySelector('.amount-option.selected');
            
            if (!selectedOption) {
                alert('Please select a purchase amount.');
                return;
            }
            
            const amount = selectedOption.getAttribute('data-value');
            
            // Validate email format
            if (!email) {
                alert('Please enter your email address.');
                emailInput.focus();
                return;
            }
            
            if (!isValidEmail(email)) {
                alert('Please enter a valid email address.');
                emailInput.focus();
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

// Function to validate email format
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Process payment by creating an order through the API and redirecting to checkout
async function processPayment(email, amount) {
    // Show loading state on the purchase button
    const purchaseBtn = document.querySelector('.purchase-btn');
    const originalBtnText = purchaseBtn.textContent;
    purchaseBtn.textContent = 'Processing...';
    purchaseBtn.disabled = true;
    
    try {
        // Create the payment order via API for Creem
        const response = await fetch(`${baseUrl}/payments/creem/guest-create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                amount: parseFloat(amount)
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to create order. Please try again later.');
        }
        
        const orderData = await response.json();
        
        // Redirect to Creem checkout page
        if (orderData.checkout_url) {
            window.location.href = orderData.checkout_url;
        } else {
            throw new Error('Could not get payment URL.');
        }
        
    } catch (error) {
        alert('Payment processing error: ' + error.message);
        // Reset button state on error
        purchaseBtn.textContent = originalBtnText;
        purchaseBtn.disabled = false;
    }
}

// Function to check API quota
async function checkQuota() {
    const apiKey = document.getElementById('check-api-key').value.trim();
    const resultsDiv = document.getElementById('quota-results');
    
    if (!apiKey) {
        alert('Please enter your API Key');
        return;
    }
    
    // Show loading state
    const checkBtn = document.querySelector('.check-quota-btn');
    const originalText = checkBtn.textContent;
    checkBtn.textContent = 'Checking...';
    checkBtn.disabled = true;
    
    try {
        const response = await fetch(`${baseUrl}/auth/quota`, {
            method: 'GET',
            headers: {
                'X-API-Key': apiKey
            }
        });
        
        if (!response.ok) {
            throw new Error(`Invalid API Key or server error: ${response.status}`);
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
            document.getElementById('expiration-date').textContent = 'Unknown';
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
        alert(`Failed to check quota: ${error.message}`);
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
    return `${day}-${month}-${year}`;
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
