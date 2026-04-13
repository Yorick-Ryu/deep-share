/**
 * Subscription pricing page — English version
 * Handles billing cycle toggle, plan selection, and Creem payment flow
 */

const API_BASE_URL = 'https://preapi.ds.rick216.cn';

// Plan definitions (USD pricing, Creem payment)
// sortOrder must match the backend SubscriptionPlan.sort_order column
const PLANS = {
    standard_monthly: {
        code: 'standard_monthly',
        name: 'Standard',
        price: 4.99,
        period: 'mo',
        periodType: 'monthly',
        dailyQuota: 8,
        sortOrder: 1,
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
        sortOrder: 2,
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
        sortOrder: 3,
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
        sortOrder: 4,
        mcpEnabled: true,
        skillEnabled: true
    }
};

let currentPeriod = 'monthly';
const selectedPaymentMethod = 'creem';
let selectedPlanCode = null;
let isLoginMode = false;
// Cached quota response keyed by API key — avoids extra fetch on confirm
let cachedQuotaData = null;
let cachedQuotaApiKey = null;

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
    initCancelModal();
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
                cachedQuotaData = data;
                cachedQuotaApiKey = apiKey;
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
        cachedQuotaData = null;
        cachedQuotaApiKey = null;
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
    el.innerHTML = '';
    el.classList.remove('show', 'has-action', 'success');
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
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Processing, please wait...';

    try {
        // Fetch subscription status if not already cached for this key
        if (!cachedQuotaData || cachedQuotaApiKey !== apiKey) {
            const quotaRes = await fetch(`${API_BASE_URL}/subscriptions/my/quota`, {
                headers: { 'X-API-Key': apiKey }
            });
            if (quotaRes.ok) {
                cachedQuotaData = await quotaRes.json();
                cachedQuotaApiKey = apiKey;
            }
        }

        const targetPlan = PLANS[selectedPlanCode];
        const currentSub = cachedQuotaData?.subscription;
        const currentPlanCode = currentSub?.plan_code;
        const currentPlan = currentPlanCode ? PLANS[currentPlanCode] : null;
        const hasActiveCreemSub = cachedQuotaData?.has_subscription &&
            currentSub?.status === 'active' &&
            currentPlanCode;

        // Route to upgrade if user has an active subscription and target plan is higher
        if (hasActiveCreemSub && currentPlan && targetPlan &&
            targetPlan.sortOrder > currentPlan.sortOrder) {
            await upgradeSubscription(apiKey, currentPlan, targetPlan, confirmBtn, originalText);
            return;
        }

        // Same plan checks
        if (hasActiveCreemSub && currentPlanCode === selectedPlanCode) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = originalText;
            // These cases are also blocked by the backend; handle gracefully here
            showGeneralError(`You already have an active ${targetPlan?.name || ''} subscription. No need to purchase again.`);
            return;
        }

        // Proceed with normal checkout creation
        const response = await fetch(`${API_BASE_URL}/payments/creem/subscription/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-KEY': apiKey
            },
            body: JSON.stringify({ plan_code: selectedPlanCode })
        });

        const data = await response.json();
        if (!response.ok) {
            const code = data.detail?.code;
            const message = data.detail?.message || data.detail || 'Failed to create order';

            if (code === 'ALREADY_SUBSCRIBED') {
                showGeneralError(message);
                confirmBtn.disabled = false;
                confirmBtn.textContent = originalText;
                return;
            }

            if (code === 'RESUME_REQUIRED') {
                showResumePrompt(apiKey, message);
                confirmBtn.disabled = false;
                confirmBtn.textContent = originalText;
                return;
            }

            throw new Error(message);
        }

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

async function upgradeSubscription(apiKey, currentPlan, targetPlan, confirmBtn, originalText) {
    confirmBtn.textContent = 'Upgrading, please wait...';
    try {
        const response = await fetch(`${API_BASE_URL}/subscriptions/my/upgrade`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-KEY': apiKey
            },
            body: JSON.stringify({ plan_code: targetPlan.code })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || 'Upgrade failed');

        // Show success in modal — no checkout redirect needed
        const el = document.getElementById('generalError');
        el.innerHTML = `<span>Successfully upgraded from <strong>${currentPlan.name}</strong> to <strong>${targetPlan.name}</strong>! The difference will be charged immediately by Creem.</span>`;
        el.classList.add('show', 'success');
        confirmBtn.disabled = false;
        confirmBtn.textContent = originalText;
        cachedQuotaData = null;
    } catch (error) {
        showMappedError(error.message || 'Upgrade failed. Please try again.', API_KEY_ERROR_MAP);
        confirmBtn.disabled = false;
        confirmBtn.textContent = originalText;
    }
}

function showResumePrompt(apiKey, message) {
    const el = document.getElementById('generalError');
    el.innerHTML = `
        <span>${message || 'Your subscription is still active but auto-renewal is off.'}</span>
        <button class="resume-renewal-btn" id="resumeRenewalBtn">Re-enable Auto-Renewal</button>
    `;
    el.classList.add('show', 'has-action');
    document.getElementById('resumeRenewalBtn').addEventListener('click', () => resumeSubscription(apiKey));
}

async function resumeSubscription(apiKey) {
    const resumeBtn = document.getElementById('resumeRenewalBtn');
    if (resumeBtn) {
        resumeBtn.disabled = true;
        resumeBtn.textContent = 'Processing...';
    }

    try {
        const response = await fetch(`${API_BASE_URL}/subscriptions/my/resume`, {
            method: 'POST',
            headers: { 'X-API-KEY': apiKey }
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || 'Failed to resume subscription');

        const el = document.getElementById('generalError');
        el.innerHTML = '<span>Auto-renewal has been re-enabled successfully!</span>';
        el.classList.remove('has-action');
        el.classList.add('show', 'success');
        setTimeout(() => closeSubscribeModal(), 2500);
    } catch (error) {
        const el = document.getElementById('generalError');
        el.innerHTML = `<span>${error.message || 'Failed to resume. Please try again.'}</span>`;
        el.classList.remove('has-action');
        if (resumeBtn) {
            resumeBtn.disabled = false;
            resumeBtn.textContent = 'Re-enable Auto-Renewal';
        }
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

// ---------------------------------------------------------------------------
// Cancel modal
// ---------------------------------------------------------------------------

function initCancelModal() {
    document.getElementById('openCancelModalLink').addEventListener('click', e => {
        e.preventDefault();
        openCancelModal();
    });
    document.getElementById('closeCancelModal').addEventListener('click', closeCancelModal);
    const modal = document.getElementById('cancelModal');
    modal.addEventListener('click', e => { if (e.target === modal) closeCancelModal(); });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && modal.style.display === 'flex') closeCancelModal();
    });
    document.getElementById('confirmCancelBtn').addEventListener('click', handleCancel);
    initCancelApiKeySync();
    initCancelApiKeyVerification();
    initCancelApiKeyVisibility();
}

function openCancelModal() {
    // Pre-fill from subscribe modal's API key input, or fall back to sessionStorage
    let subscribeKey = document.getElementById('subscribeApiKey').value;
    if (!subscribeKey) {
        try {
            const saved = JSON.parse(sessionStorage.getItem('subscribeModalStateEn') || '{}');
            subscribeKey = saved.apiKey || '';
        } catch { /* ignore */ }
    }
    if (subscribeKey) {
        document.getElementById('cancelApiKey').value = subscribeKey;
    }
    clearCancelErrors();
    const modal = document.getElementById('cancelModal');
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.classList.add('show');
        document.getElementById('cancelApiKey').focus();
    }, 10);
    document.body.style.overflow = 'hidden';
}

function closeCancelModal() {
    const modal = document.getElementById('cancelModal');
    modal.classList.remove('show');
    setTimeout(() => { modal.style.display = 'none'; }, 300);
    document.body.style.overflow = '';
    clearCancelErrors();
}

function clearCancelErrors() {
    const errEl = document.getElementById('cancelGeneralError');
    errEl.innerHTML = '';
    errEl.classList.remove('show', 'has-action', 'success');
    const resultEl = document.getElementById('cancelApiKeyVerifyResult');
    resultEl.style.display = 'none';
    resultEl.className = 'api-key-verify-result';
    document.getElementById('cancelApiKey').classList.remove('input-error');
}

/** Keep cancel modal and subscribe modal API key inputs in sync */
function initCancelApiKeySync() {
    const cancelInput = document.getElementById('cancelApiKey');
    const subscribeInput = document.getElementById('subscribeApiKey');

    cancelInput.addEventListener('input', () => {
        subscribeInput.value = cancelInput.value;
        cachedQuotaData = null;
        cachedQuotaApiKey = null;
        clearCancelErrors();
    });

    // Sync subscribe → cancel when subscribe modal key changes (already done via saveModalState,
    // but also reflect live here for when cancel modal opens)
    subscribeInput.addEventListener('input', () => {
        cancelInput.value = subscribeInput.value;
    });
}

function initCancelApiKeyVisibility() {
    const toggleBtn = document.getElementById('toggleCancelApiKeyVisibility');
    const input = document.getElementById('cancelApiKey');
    if (!toggleBtn || !input) return;
    toggleBtn.addEventListener('click', () => {
        const eyeIcon = toggleBtn.querySelector('.eye-icon');
        const eyeOffIcon = toggleBtn.querySelector('.eye-off-icon');
        if (input.type === 'password') {
            input.type = 'text';
            eyeIcon.style.display = 'none';
            eyeOffIcon.style.display = 'block';
        } else {
            input.type = 'password';
            eyeIcon.style.display = 'block';
            eyeOffIcon.style.display = 'none';
        }
    });
}

function initCancelApiKeyVerification() {
    const verifyBtn = document.getElementById('verifyCancelApiKeyBtn');
    const input = document.getElementById('cancelApiKey');
    const resultDiv = document.getElementById('cancelApiKeyVerifyResult');
    if (!verifyBtn || !input || !resultDiv) return;

    verifyBtn.addEventListener('click', async () => {
        const apiKey = input.value.trim();
        if (!apiKey) {
            showCancelVerifyResult('error', 'Please enter your API key');
            return;
        }
        verifyBtn.disabled = true;
        verifyBtn.textContent = 'Verifying...';
        showCancelVerifyResult('loading', 'Verifying...');
        try {
            const response = await fetch(`${API_BASE_URL}/subscriptions/my/quota`, {
                headers: { 'X-API-Key': apiKey }
            });
            if (response.ok) {
                const data = await response.json();
                cachedQuotaData = data;
                cachedQuotaApiKey = apiKey;
                const sub = data.has_subscription ? data.subscription : null;
                if (!sub || sub.status !== 'active') {
                    showCancelVerifyResult('error', 'No active subscription found for this API key');
                    return;
                }
                if (sub.auto_renew === false) {
                    const expiresAt = new Date(sub.expires_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                    showCancelVerifyResult('error', `Auto-renewal is already disabled. Your ${sub.plan_name} subscription expires on ${expiresAt}.`);
                    document.getElementById('confirmCancelBtn').disabled = true;
                    return;
                }
                document.getElementById('confirmCancelBtn').disabled = false;
                const expiresAt = new Date(sub.expires_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                showCancelVerifyResult('success', `Verified: ${data.email} · ${sub.plan_name} · expires ${expiresAt}`);
            } else {
                const errorData = await response.json().catch(() => ({}));
                showCancelVerifyResult('error', mapVerifyErrorMessage(errorData.detail || `Verification failed (${response.status})`));
            }
        } catch {
            showCancelVerifyResult('error', 'Network error. Please check your connection.');
        } finally {
            verifyBtn.disabled = false;
            verifyBtn.textContent = 'Verify';
        }
    });

    input.addEventListener('input', () => {
        resultDiv.style.display = 'none';
        input.classList.remove('input-error');
        document.getElementById('confirmCancelBtn').disabled = false;
    });
}

function showCancelVerifyResult(type, message) {
    const resultDiv = document.getElementById('cancelApiKeyVerifyResult');
    const input = document.getElementById('cancelApiKey');
    if (!resultDiv) return;
    resultDiv.className = 'api-key-verify-result ' + type;
    resultDiv.textContent = message;
    resultDiv.style.display = 'block';
    if (input) input.classList.toggle('input-error', type === 'error');
}

async function handleCancel() {
    const apiKey = document.getElementById('cancelApiKey').value.trim();
    if (!apiKey) {
        showCancelVerifyResult('error', 'Please enter your API key');
        return;
    }

    const confirmBtn = document.getElementById('confirmCancelBtn');
    const errEl = document.getElementById('cancelGeneralError');
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Processing...';
    errEl.innerHTML = '';
    errEl.classList.remove('show', 'success');

    try {
        const response = await fetch(`${API_BASE_URL}/subscriptions/my/cancel`, {
            method: 'POST',
            headers: { 'X-API-KEY': apiKey }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail?.message || data.detail || 'Cancellation failed');

        const expiresAt = data.expires_at
            ? new Date(data.expires_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
            : '';
        errEl.innerHTML = `<span>Auto-renewal cancelled. Your subscription remains active until <strong>${expiresAt}</strong>.</span>`;
        errEl.classList.add('show', 'success');
        confirmBtn.textContent = 'Done';
        cachedQuotaData = null;
        setTimeout(() => closeCancelModal(), 3000);
    } catch (error) {
        errEl.textContent = error.message || 'Cancellation failed. Please try again.';
        errEl.classList.add('show');
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Cancel Auto-Renewal';
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
