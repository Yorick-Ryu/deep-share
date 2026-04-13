/**
 * Subscription pricing page — English version
 * Handles billing cycle toggle, plan selection, and Creem payment flow
 */

const API_BASE_URL = 'https://preapi.ds.rick216.cn';

// Plan definitions (USD pricing, Creem payment)
const PLANS = {
    standard_monthly: {
        code: 'standard_monthly',
        name: 'Standard',
        price: 4.99,
        period: 'mo',
        periodType: 'monthly',
        dailyQuota: 8,
        mcpEnabled: false,
        skillEnabled: false
    },
    pro_monthly: {
        code: 'pro_monthly',
        name: 'Pro',
        price: 9.99,
        period: 'mo',
        periodType: 'monthly',
        dailyQuota: 20,
        mcpEnabled: true,
        skillEnabled: true
    },
    pro_yearly: {
        code: 'pro_yearly',
        name: 'Pro',
        price: 49.9,
        period: 'yr',
        periodType: 'yearly',
        dailyQuota: 50,
        mcpEnabled: true,
        skillEnabled: true
    },
    ultra_yearly: {
        code: 'ultra_yearly',
        name: 'Ultra',
        price: 99.9,
        period: 'yr',
        periodType: 'yearly',
        dailyQuota: 100,
        mcpEnabled: true,
        skillEnabled: true
    }
};

let currentPeriod = 'monthly';
const selectedPaymentMethod = 'creem';
let selectedPlanCode = null;
let isLoginMode = false;

/**
 * Sync plan details from PLANS config into the HTML cards
 */
function updatePlanDetails() {
    document.querySelectorAll('.plan-card').forEach(card => {
        const plan = PLANS[card.dataset.plan];
        if (!plan) return;

        const nameEl = card.querySelector('.plan-name');
        if (nameEl) nameEl.textContent = plan.name;

        const amountEl = card.querySelector('.amount');
        if (amountEl) amountEl.textContent = plan.price;

        const periodEl = card.querySelector('.period');
        if (periodEl) periodEl.textContent = `/${plan.period}`;

        const quotaEl = card.querySelector('.quota-number');
        if (quotaEl) quotaEl.textContent = plan.dailyQuota;
    });
}

document.addEventListener('DOMContentLoaded', () => {
    updatePlanDetails();
    initBillingToggle();
    initPlanCards();
    initModal();
    initLoginToggle();
    initApiKeyVisibility();
    initApiKeyVerification();
    initModalStatePersistence();
    parseAndFillApiKey();
});

// Restore button text after browser back navigation (bfcache)
window.addEventListener('pageshow', () => {
    const confirmBtn = document.getElementById('confirmSubscribeBtn');
    if (confirmBtn) {
        confirmBtn.textContent = 'Confirm Subscription';
        confirmBtn.disabled = false;
    }
});

function initBillingToggle() {
    const toggleBtns = document.querySelectorAll('.toggle-btn');
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            toggleBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentPeriod = btn.dataset.period;
            updateVisibleCards();
        });
    });
}

function updateVisibleCards() {
    if (currentPeriod === 'yearly') {
        document.body.classList.add('yearly-view');
    } else {
        document.body.classList.remove('yearly-view');
    }
}

function initPlanCards() {
    document.querySelectorAll('.subscribe-btn').forEach(btn => {
        btn.addEventListener('click', () => openSubscribeModal(btn.dataset.plan));
    });
}

function openSubscribeModal(planCode) {
    selectedPlanCode = planCode;
    const plan = PLANS[planCode];
    if (!plan) return;

    document.getElementById('modalPlanName').textContent = `Subscribe to ${plan.name}`;
    document.getElementById('modalPrice').textContent = `$${plan.price}/${plan.period}`;

    restoreModalState();

    const modal = document.getElementById('subscribeModal');
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.classList.add('show');
        focusActiveInput();
    }, 10);

    document.body.style.overflow = 'hidden';
}

function focusActiveInput() {
    setTimeout(() => {
        const inputId = isLoginMode ? 'subscribeApiKey' : 'subscribeEmail';
        document.getElementById(inputId)?.focus();
    }, 100);
}

function closeSubscribeModal() {
    const modal = document.getElementById('subscribeModal');
    modal.classList.remove('show');
    setTimeout(() => { modal.style.display = 'none'; }, 300);
    document.body.style.overflow = '';
    clearAllErrors();
    saveModalState();
}

function initModal() {
    const modal = document.getElementById('subscribeModal');
    document.getElementById('closeModal').addEventListener('click', closeSubscribeModal);
    modal.addEventListener('click', e => { if (e.target === modal) closeSubscribeModal(); });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && modal.style.display === 'flex') closeSubscribeModal();
    });
    document.getElementById('confirmSubscribeBtn').addEventListener('click', handleSubscribe);
}

function initLoginToggle() {
    document.getElementById('loginToggleLink').addEventListener('click', e => {
        e.preventDefault();
        isLoginMode = !isLoginMode;
        updateLoginToggleUI();
        saveModalState();
        focusActiveInput();
    });
}

function updateLoginToggleUI() {
    const apiKeySection = document.getElementById('apiKeySection');
    const toggleText = document.getElementById('loginToggleText');
    const toggleLink = document.getElementById('loginToggleLink');
    const emailInput = document.getElementById('subscribeEmail');

    if (isLoginMode) {
        apiKeySection.style.display = 'block';
        toggleText.textContent = 'New user?';
        toggleLink.textContent = 'Register with email';
        emailInput.parentElement.style.display = 'none';
    } else {
        apiKeySection.style.display = 'none';
        toggleText.textContent = 'Already have an API Key?';
        toggleLink.textContent = 'Click to sign in';
        emailInput.parentElement.style.display = 'block';
    }
}

function initApiKeyVisibility() {
    const toggleBtn = document.getElementById('toggleApiKeyVisibility');
    const apiKeyInput = document.getElementById('subscribeApiKey');
    if (!toggleBtn || !apiKeyInput) return;

    toggleBtn.addEventListener('click', () => {
        const eyeIcon = toggleBtn.querySelector('.eye-icon');
        const eyeOffIcon = toggleBtn.querySelector('.eye-off-icon');
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

function initApiKeyVerification() {
    const verifyBtn = document.getElementById('verifyApiKeyBtn');
    const apiKeyInput = document.getElementById('subscribeApiKey');
    const resultDiv = document.getElementById('apiKeyVerifyResult');
    if (!verifyBtn || !apiKeyInput || !resultDiv) return;

    verifyBtn.addEventListener('click', async () => {
        const apiKey = apiKeyInput.value.trim();
        if (!apiKey) {
            showVerifyResult('error', 'Please enter your API key');
            return;
        }

        verifyBtn.disabled = true;
        verifyBtn.textContent = 'Verifying...';
        showVerifyResult('loading', 'Verifying...');

        try {
            const response = await fetch(`${API_BASE_URL}/subscriptions/my/quota`, {
                method: 'GET',
                headers: { 'X-API-Key': apiKey }
            });

            if (response.ok) {
                const data = await response.json();
                let message = `Verified! Your account email is ${data.email}`;
                if (data.has_subscription && data.subscription) {
                    message += ` · Current plan: ${data.subscription.plan_name}`;
                }
                showVerifyResult('success', message);
            } else {
                const errorData = await response.json().catch(() => ({}));
                showVerifyResult('error', mapVerifyErrorMessage(errorData.detail || `Verification failed (${response.status})`));
            }
        } catch {
            showVerifyResult('error', 'Network error. Please check your connection.');
        } finally {
            verifyBtn.disabled = false;
            verifyBtn.textContent = 'Verify';
        }
    });

    apiKeyInput.addEventListener('input', hideVerifyResult);
}

function showVerifyResult(type, message) {
    const resultDiv = document.getElementById('apiKeyVerifyResult');
    const apiKeyInput = document.getElementById('subscribeApiKey');
    if (!resultDiv) return;
    resultDiv.className = 'api-key-verify-result ' + type;
    resultDiv.textContent = message;
    resultDiv.style.display = 'block';
    if (apiKeyInput) {
        apiKeyInput.classList.toggle('input-error', type === 'error');
    }
}

function hideVerifyResult() {
    const resultDiv = document.getElementById('apiKeyVerifyResult');
    const apiKeyInput = document.getElementById('subscribeApiKey');
    if (resultDiv) resultDiv.style.display = 'none';
    if (apiKeyInput) apiKeyInput.classList.remove('input-error');
}

function showEmailResult(type, message) {
    const resultDiv = document.getElementById('emailVerifyResult');
    const emailInput = document.getElementById('subscribeEmail');
    if (!resultDiv) return;
    resultDiv.className = 'email-verify-result ' + type;
    resultDiv.textContent = message;
    resultDiv.style.display = 'block';
    if (emailInput) {
        emailInput.classList.toggle('input-error', type === 'error');
    }
}

function hideEmailResult() {
    const resultDiv = document.getElementById('emailVerifyResult');
    const emailInput = document.getElementById('subscribeEmail');
    if (resultDiv) resultDiv.style.display = 'none';
    if (emailInput) emailInput.classList.remove('input-error');
}

function mapVerifyErrorMessage(detail) {
    if (detail.includes('Invalid or disabled API key') || detail.includes('Invalid or expired API key')) {
        return 'API key is invalid or expired';
    }
    if (detail.includes('API Key is required') || detail.includes('required')) {
        return 'Please enter your API key';
    }
    if (detail.includes('not active')) {
        return 'The associated account has been disabled';
    }
    return detail;
}

function saveModalState() {
    const state = {
        email: document.getElementById('subscribeEmail').value,
        apiKey: document.getElementById('subscribeApiKey').value,
        isLoginMode,
        paymentMethod: selectedPaymentMethod
    };
    sessionStorage.setItem('subscribeModalStateEn', JSON.stringify(state));
}

function restoreModalState() {
    const saved = sessionStorage.getItem('subscribeModalStateEn');
    if (!saved) return;
    try {
        const state = JSON.parse(saved);
        if (state.email) document.getElementById('subscribeEmail').value = state.email;
        if (state.apiKey) document.getElementById('subscribeApiKey').value = state.apiKey;
        if (state.isLoginMode !== undefined) {
            isLoginMode = state.isLoginMode;
            updateLoginToggleUI();
        }
    } catch {
        // ignore parse errors
    }
}

function initModalStatePersistence() {
    const emailInput = document.getElementById('subscribeEmail');
    const apiKeyInput = document.getElementById('subscribeApiKey');

    emailInput.addEventListener('input', () => {
        clearInputError(emailInput);
        clearGeneralError();
        hideEmailResult();
        saveModalState();
    });
    apiKeyInput.addEventListener('input', () => {
        clearInputError(apiKeyInput);
        clearGeneralError();
        hideVerifyResult();
        saveModalState();
    });
}

function showInputError(inputEl, message) {
    clearInputError(inputEl);
    inputEl.classList.add('input-error');
    const errorEl = document.createElement('div');
    errorEl.className = 'input-error-msg';
    errorEl.textContent = message;
    const wrapper = inputEl.closest('.api-key-input-wrapper') || inputEl;
    wrapper.insertAdjacentElement('afterend', errorEl);
}

function clearInputError(inputEl) {
    inputEl.classList.remove('input-error');
    const wrapper = inputEl.closest('.api-key-input-wrapper') || inputEl;
    wrapper.parentElement.querySelector('.input-error-msg')?.remove();
}

function showGeneralError(message) {
    const el = document.getElementById('generalError');
    el.textContent = message;
    el.classList.add('show');
}

function clearGeneralError() {
    const el = document.getElementById('generalError');
    el.textContent = '';
    el.classList.remove('show');
}

function clearAllErrors() {
    clearInputError(document.getElementById('subscribeEmail'));
    clearInputError(document.getElementById('subscribeApiKey'));
    clearGeneralError();
    hideVerifyResult();
    hideEmailResult();
}

// Error routing rules for API Key mode
const API_KEY_ERROR_MAP = [
    { keywords: ['Invalid or disabled API key'], target: 'apiKey', display: 'API key is invalid or disabled' },
    { keywords: ['API Key', 'API key', 'api key'], target: 'apiKey' },
];

// Error routing rules for email mode
const EMAIL_ERROR_MAP = [
    { keywords: ['email already registered', 'API Key'], target: 'email' },
    { keywords: ['email', 'Email'], target: 'email' },
];

function showMappedError(message, errorMap) {
    clearAllErrors();
    for (const rule of errorMap) {
        if (rule.keywords.some(kw => message.includes(kw))) {
            if (rule.target === 'apiKey') {
                showVerifyResult('error', rule.display || message);
            } else {
                showEmailResult('error', rule.display || message);
            }
            return;
        }
    }
    if (isLoginMode) {
        showVerifyResult('error', message);
    } else {
        showEmailResult('error', message);
    }
}

async function handleSubscribe() {
    clearAllErrors();

    if (isLoginMode) {
        const apiKey = document.getElementById('subscribeApiKey').value.trim();
        if (!apiKey) {
            showVerifyResult('error', 'Please enter your API key');
            return;
        }
        await createSubscriptionWithApiKey(apiKey);
    } else {
        const email = document.getElementById('subscribeEmail').value.trim();
        if (!email) {
            showEmailResult('error', 'Please enter your email address');
            return;
        }
        if (!isValidEmail(email)) {
            showEmailResult('error', 'Please enter a valid email address');
            return;
        }
        await createGuestSubscription(email);
    }
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function createSubscriptionWithApiKey(apiKey) {
    const confirmBtn = document.getElementById('confirmSubscribeBtn');
    const originalText = confirmBtn.textContent;
    try {
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Processing, please wait...';

        const response = await fetch(`${API_BASE_URL}/payments/creem/subscription/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-KEY': apiKey
            },
            body: JSON.stringify({
                plan_code: selectedPlanCode,
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || 'Failed to create order');

        if (data.checkout_url) {
            localStorage.setItem('pending_api_key', apiKey);
            if (data.order_no) localStorage.setItem('pending_order_no', data.order_no);
            saveModalState();
            confirmBtn.textContent = 'Redirecting to checkout...';
            window.location.href = data.checkout_url;
        } else {
            throw new Error('Checkout URL not returned');
        }
    } catch (error) {
        const msg = error.message || 'Failed to create order. Please try again.';
        showMappedError(msg, API_KEY_ERROR_MAP);
        confirmBtn.disabled = false;
        confirmBtn.textContent = originalText;
    }
}

async function createGuestSubscription(email) {
    const confirmBtn = document.getElementById('confirmSubscribeBtn');
    const originalText = confirmBtn.textContent;
    try {
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Processing...';

        const response = await fetch(`${API_BASE_URL}/payments/creem/subscription/guest-create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                plan_code: selectedPlanCode,
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || 'Failed to create order');

        if (data.api_key) {
            localStorage.setItem('pending_api_key', data.api_key);
            localStorage.setItem('pending_order_no', data.order_no);
        }

        if (data.checkout_url) {
            saveModalState();
            confirmBtn.textContent = 'Redirecting to checkout...';
            window.location.href = data.checkout_url;
        } else {
            throw new Error('Checkout URL not returned');
        }
    } catch (error) {
        const msg = error.message || 'Failed to create order. Please try again.';
        showMappedError(msg, EMAIL_ERROR_MAP);
        confirmBtn.disabled = false;
        confirmBtn.textContent = originalText;
    }
}

/**
 * Read an encoded API key from the ?ak= URL param and pre-fill the input.
 * Encoding: Base64(reverse(key))
 */
function parseAndFillApiKey() {
    try {
        const encodedKey = new URLSearchParams(window.location.search).get('ak');
        if (!encodedKey) return;

        const decodedKey = atob(encodedKey.split('').reverse().join(''));
        if (!decodedKey) return;

        const apiKeyInput = document.getElementById('subscribeApiKey');
        if (apiKeyInput) apiKeyInput.value = decodedKey;

        isLoginMode = true;
        updateLoginToggleUI();
        saveModalState();

        // Remove ?ak= from URL for security
        const url = new URL(window.location.href);
        url.searchParams.delete('ak');
        window.history.replaceState({}, document.title, url.toString());
    } catch {
        // ignore decode errors
    }
}
