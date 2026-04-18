/**
 * English payment result page — Creem subscription flow
 *
 * Creem redirects back after checkout. We immediately show the stored API key
 * with a note that activation may take a few minutes.
 */

document.addEventListener('DOMContentLoaded', () => {
    const apiKey = localStorage.getItem('pending_api_key');

    localStorage.removeItem('pending_api_key');
    localStorage.removeItem('pending_order_no');

    document.getElementById('status-checking').style.display = 'none';

    if (apiKey) {
        document.getElementById('success-api-key').textContent = apiKey;
        document.getElementById('status-success').style.display = 'block';
    } else {
        document.getElementById('status-error').style.display = 'block';
    }
});

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
