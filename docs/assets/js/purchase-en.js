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
    resultsDiv.style.display = 'none';

    try {
        let quotaData = null;
        let lastApiError = null;
        let lastStatusCode = null;

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
        } catch {
            lastApiError = 'The subscription quota service is unavailable.';
        }

        // Older API keys may only be recognized by the legacy credits endpoint.
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
                            remaining_quota: data.remaining_quota,
                            expires_at: data.expires_at
                        }
                    };
                } else {
                    lastStatusCode = response.status;
                    lastApiError = await extractApiError(response);
                }
            } catch {
                lastStatusCode = 0;
                lastApiError = 'Network error. Please check your connection.';
            }
        }

        if (quotaData) {
            displayAccountQuota(quotaData);
            resultsDiv.style.display = 'block';
        } else if (lastStatusCode === 401) {
            alert('The API Key is invalid or expired.');
        } else {
            alert(`Failed to check quota: ${lastApiError || 'Unknown error'}`);
        }
    } catch (error) {
        alert(`Failed to check quota: ${error.message}`);
        resultsDiv.style.display = 'none';
    } finally {
        // Reset button
        checkBtn.textContent = originalText;
        checkBtn.disabled = false;
    }
}

async function extractApiError(response) {
    try {
        const data = await response.json();
        if (typeof data.detail === 'string') return data.detail;
        if (data.detail?.message) return data.detail.message;
    } catch {
        // Response is not JSON.
    }
    return `HTTP ${response.status}`;
}

function displayAccountQuota(data) {
    const subscriptionBlock = document.getElementById('subscription-quota-block');
    const addonBlock = document.getElementById('addon-quota-block');
    const emptyMessage = document.getElementById('quota-empty-message');
    const subscription = data.has_subscription ? data.subscription : null;
    const addonQuota = data.addon_quota;
    const addonTotal = Number(addonQuota?.total_quota || 0);
    const hasSubscription = Boolean(subscription);
    const hasAddonQuota = addonTotal > 0;

    subscriptionBlock.hidden = !hasSubscription;
    addonBlock.hidden = !hasAddonQuota;
    emptyMessage.hidden = hasSubscription || hasAddonQuota;

    if (hasSubscription) {
        const total = Number(subscription.daily_quota || 0);
        const used = Math.max(0, Number(subscription.used_today || 0));
        const remaining = Math.max(0, total - used);

        document.getElementById('subscription-plan-name').textContent = subscription.plan_name || 'Subscription';
        document.getElementById('subscription-total-quota').textContent = total;
        document.getElementById('subscription-used-quota').textContent = used;
        document.getElementById('subscription-remaining-quota').textContent = remaining;
        document.getElementById('subscription-expiration-date').textContent = formatExpirationDate(subscription.expires_at);
        updateQuotaProgress('subscription-quota-progress', remaining, total);
    }

    if (hasAddonQuota) {
        const used = Math.max(0, Number(addonQuota.used_quota || 0));
        const hasProvidedRemaining = addonQuota.remaining_quota !== null && addonQuota.remaining_quota !== undefined;
        const providedRemaining = hasProvidedRemaining ? Number(addonQuota.remaining_quota) : NaN;
        const remaining = Number.isFinite(providedRemaining)
            ? Math.max(0, providedRemaining)
            : Math.max(0, addonTotal - used);

        document.getElementById('addon-total-quota').textContent = addonTotal;
        document.getElementById('addon-used-quota').textContent = used;
        document.getElementById('addon-remaining-quota').textContent = remaining;
        document.getElementById('addon-expiration-date').textContent = formatExpirationDate(addonQuota.expires_at);
        updateQuotaProgress('addon-quota-progress', remaining, addonTotal);
    }
}

function updateQuotaProgress(elementId, remaining, total) {
    const progressBar = document.getElementById(elementId);
    const percentRemaining = total > 0 ? Math.min(100, (remaining / total) * 100) : 0;
    progressBar.style.width = `${percentRemaining}%`;
    progressBar.style.backgroundColor = percentRemaining < 20 ? '#FF6B6B' : '#4D6BFE';
}

function formatExpirationDate(value) {
    if (!value) return 'No expiration date';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Unknown' : formatDate(date);
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
    }
}

// Initialize FAQ accordion functionality
function initFAQAccordion() {
    const faqCards = document.querySelectorAll('.faq-card');

    faqCards.forEach((card, index) => {
        const question = card.querySelector('.faq-question');

        // If it's the last card (Other questions?), expand it by default
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
