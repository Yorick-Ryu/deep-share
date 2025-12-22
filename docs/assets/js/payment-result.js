document.addEventListener('DOMContentLoaded', () => {
    // Get parameters from URL
    const urlParams = new URLSearchParams(window.location.search);
    const tradeStatus = urlParams.get('trade_status');
    const paramStr = urlParams.get('param');

    // Get stored API key from payment initiation
    const storedApiKey = localStorage.getItem('pending_api_key');
    const apiKey = storedApiKey;

    console.log('Result Page Init:', { apiKey, tradeStatus, paramStr });

    // Trust the URL parameters directly
    if (tradeStatus === 'TRADE_SUCCESS') {
        console.log('Detected TRADE_SUCCESS from URL');
        if (apiKey) {
            document.getElementById('success-api-key').textContent = apiKey;
        } else {
            // Hide copy buttons if no API key
            document.querySelectorAll('#status-success .purchase-btn').forEach(btn => btn.style.display = 'none');
            const successActions = document.querySelector('#status-success .action-buttons');
            if (successActions) successActions.style.gridTemplateColumns = '1fr';
        }

        // Parse recharge info from param (e.g., quota:5,gift:0)
        let quota = 0;
        let gift = 0;
        if (paramStr) {
            const quotaMatch = paramStr.match(/quota:(\d+)/);
            if (quotaMatch) quota = quotaMatch[1];
            const giftMatch = paramStr.match(/gift:(\d+)/);
            if (giftMatch) gift = giftMatch[1];
        }

        showSuccess(quota, gift);
    } else {
        // If not successful or manually accessed without status
        if (apiKey) {
            showError('您可以先点击下方复制按钮将 API Key 填写到插件中，支付确认后将立刻激活使用。');
            document.getElementById('error-api-key').textContent = apiKey;
            document.getElementById('error-api-key-container').style.display = 'block';
        } else {
            showError('支付结果未确认。如果您已经完成付款，请检查邮箱及邮箱垃圾箱或联系客服。');
            // Hide copy buttons if no API key
            document.querySelectorAll('#status-error .purchase-btn').forEach(btn => btn.style.display = 'none');
            const errorActions = document.querySelector('#status-error .action-buttons');
            if (errorActions) errorActions.style.gridTemplateColumns = '1fr';
        }
    }
});

function showSuccess(quota, gift) {
    // Show success UI
    document.getElementById('status-checking').style.display = 'none';
    document.getElementById('status-error').style.display = 'none';
    document.getElementById('status-success').style.display = 'block';

    // Display this time's quota info
    document.getElementById('current-quota').textContent = quota + ' 次';
    document.getElementById('gift-quota').textContent = gift + ' 次';
}

function showError(message) {
    document.getElementById('status-checking').style.display = 'none';
    document.getElementById('status-success').style.display = 'none';
    document.getElementById('status-error').style.display = 'block';
    document.getElementById('error-message').textContent = message;
}

function copyApiKey(elementId, btnElement) {
    const text = document.getElementById(elementId).textContent;
    if (text === '----' || !text) return;

    navigator.clipboard.writeText(text).then(() => {
        if (btnElement) {
            const originalText = btnElement.textContent;
            btnElement.textContent = '已复制 ✓';
            btnElement.style.backgroundColor = '#28a745';

            setTimeout(() => {
                btnElement.textContent = originalText;
                btnElement.style.backgroundColor = '';
            }, 2000);
        }
    }).catch(err => {
        console.error('无法复制:', err);
    });
}
