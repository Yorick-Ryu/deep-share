/**
 * English payment result page — Creem subscription flow
 *
 * Creem redirects back without a signed success parameter, so the page polls
 * the subscription quota endpoint before presenting the payment as successful.
 */

const API_BASE_URL = 'https://api.ds.rick216.cn';
const POLL_INTERVAL_MS = 3000;
const POLL_MAX_ATTEMPTS = 15;

document.addEventListener('DOMContentLoaded', () => {
    const apiKey = localStorage.getItem('pending_api_key');

    if (!apiKey) {
        showError('No pending payment was found. If you completed checkout, please check your email for your API key.');
        return;
    }

    pollSubscriptionStatus(apiKey);
});

async function pollSubscriptionStatus(apiKey, attempt = 1) {
    try {
        const response = await fetch(`${API_BASE_URL}/subscriptions/my/quota`, {
            method: 'GET',
            headers: { 'X-API-Key': apiKey }
        });

        if (response.ok) {
            const data = await response.json();
            const subscription = data.has_subscription ? data.subscription : null;

            if (subscription?.status === 'active') {
                localStorage.removeItem('pending_api_key');
                localStorage.removeItem('pending_order_no');
                showSuccess(apiKey);
                return;
            }
        }
    } catch {
        // A temporary network failure should not turn a valid payment into an error.
    }

    if (attempt < POLL_MAX_ATTEMPTS) {
        setTimeout(() => pollSubscriptionStatus(apiKey, attempt + 1), POLL_INTERVAL_MS);
    } else {
        showPending(apiKey);
    }
}

function showSuccess(apiKey) {
    document.getElementById('status-checking').style.display = 'none';
    document.getElementById('status-error').style.display = 'none';
    document.getElementById('success-api-key').textContent = apiKey;
    document.getElementById('status-success').style.display = 'block';
}

function showPending(apiKey) {
    showError(
        'Your payment has not been confirmed yet. If checkout was completed, activation may still be processing. ' +
        'Please try again in a few minutes or check your email.'
    );

    document.getElementById('error-api-key').textContent = apiKey;
    document.getElementById('error-api-key-container').style.display = 'block';
    document.getElementById('error-copy-btn').style.display = 'inline-flex';

    const actions = document.querySelector('#status-error .action-buttons');
    if (actions) actions.style.gridTemplateColumns = '1fr 1fr';
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
