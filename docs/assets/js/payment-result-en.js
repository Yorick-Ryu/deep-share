/**
 * English payment result page — Creem subscription flow
 *
 * Creem redirects back without a signed success parameter, so we poll
 * /subscriptions/my/quota with the stored API key to confirm activation.
 */

const API_BASE_URL = 'https://api.ds.rick216.cn';

// Max attempts × interval = total wait time (15 × 3s = 45s)
const POLL_INTERVAL_MS = 3000;
const POLL_MAX_ATTEMPTS = 15;

document.addEventListener('DOMContentLoaded', () => {
    const apiKey = localStorage.getItem('pending_api_key');

    if (!apiKey) {
        showError('No API key found. If you completed the checkout, please check your email for your API key.');
        return;
    }

    pollSubscriptionStatus(apiKey);
});

/**
 * Poll the quota endpoint until the subscription is confirmed active,
 * or until the max attempts are exhausted.
 */
async function pollSubscriptionStatus(apiKey, attempt = 1) {
    try {
        const response = await fetch(`${API_BASE_URL}/subscriptions/my/quota`, {
            method: 'GET',
            headers: { 'X-API-Key': apiKey }
        });

        if (response.ok) {
            const data = await response.json();

            if (data.has_subscription && data.subscription) {
                // Subscription confirmed active
                localStorage.removeItem('pending_api_key');
                localStorage.removeItem('pending_order_no');
                showSuccess(apiKey, data);
                return;
            }
        }
    } catch {
        // Network error — keep retrying
    }

    if (attempt < POLL_MAX_ATTEMPTS) {
        setTimeout(() => pollSubscriptionStatus(apiKey, attempt + 1), POLL_INTERVAL_MS);
    } else {
        // Timed out — show the key anyway so the user isn't stuck
        showPending(apiKey);
    }
}

function showSuccess(apiKey, data) {
    document.getElementById('status-checking').style.display = 'none';
    document.getElementById('status-error').style.display = 'none';
    document.getElementById('status-success').style.display = 'block';

    document.getElementById('success-api-key').textContent = apiKey;

    const sub = data.subscription;
    if (sub) {
        document.getElementById('subscription-info').style.display = 'block';
        document.getElementById('plan-name').textContent = sub.plan_name || '—';
        document.getElementById('daily-quota').textContent = sub.daily_quota != null
            ? `${sub.daily_quota} / day`
            : '—';
        document.getElementById('expires-at').textContent = sub.expires_at
            ? formatDate(sub.expires_at)
            : '—';
    }
}

/**
 * Payment not confirmed within the polling window.
 * Still show the key so the user can copy it and check manually.
 */
function showPending(apiKey) {
    showError(
        'Your payment could not be automatically confirmed yet. ' +
        'If checkout was completed, your subscription will activate shortly — ' +
        'please check your email or try again in a few minutes.'
    );

    if (apiKey) {
        document.getElementById('error-api-key').textContent = apiKey;
        document.getElementById('error-api-key-container').style.display = 'block';
        document.getElementById('error-copy-btn').style.display = 'inline-flex';

        const actions = document.querySelector('#status-error .action-buttons');
        if (actions) actions.style.gridTemplateColumns = '1fr 1fr';
    }
}

function showError(message) {
    document.getElementById('status-checking').style.display = 'none';
    document.getElementById('status-success').style.display = 'none';
    document.getElementById('status-error').style.display = 'block';
    document.getElementById('error-message').textContent = message;
}

function copyApiKey(elementId, btnElement) {
    const text = document.getElementById(elementId).textContent;
    if (!text || text === '—' || text === 'Check your email') return;

    navigator.clipboard.writeText(text).then(() => {
        if (btnElement) {
            const original = btnElement.textContent;
            btnElement.textContent = 'Copied ✓';
            btnElement.style.backgroundColor = '#28a745';
            setTimeout(() => {
                btnElement.textContent = original;
                btnElement.style.backgroundColor = '';
            }, 2000);
        }
    }).catch(() => {
        // Fallback for browsers that block clipboard access
        const range = document.createRange();
        const el = document.getElementById(elementId);
        range.selectNode(el);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
    });
}

/** Format an ISO date string to a human-readable UTC date */
function formatDate(isoString) {
    try {
        const d = new Date(isoString);
        return d.toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            timeZone: 'UTC'
        }) + ' UTC';
    } catch {
        return isoString;
    }
}
