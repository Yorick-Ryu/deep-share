/**
 * 订阅定价页面交互逻辑
 * 处理计费周期切换、订阅方案选择和支付流程
 */

// 配置
const API_BASE_URL = 'https://api.ds.rick216.cn';

// 订阅方案数据
const PLANS = {
    standard_monthly: {
        code: 'standard_monthly',
        name: 'Standard',
        price: 9.9,
        period: '月',
        periodType: 'monthly',
        dailyQuota: 8,
        mcpEnabled: false,
        skillEnabled: false
    },
    pro_monthly: {
        code: 'pro_monthly',
        name: 'Pro',
        price: 19.9,
        period: '月',
        periodType: 'monthly',
        dailyQuota: 20,
        mcpEnabled: true,
        skillEnabled: true
    },
    pro_yearly: {
        code: 'pro_yearly',
        name: 'Pro',
        price: 168,
        period: '年',
        periodType: 'yearly',
        dailyQuota: 50,
        mcpEnabled: true,
        skillEnabled: true
    },
    ultra_yearly: {
        code: 'ultra_yearly',
        name: 'Ultra',
        price: 299,
        period: '年',
        periodType: 'yearly',
        dailyQuota: 100,
        mcpEnabled: true,
        skillEnabled: true
    }
};

// DOM 元素
let currentPeriod = 'monthly';
let selectedPaymentMethod = 'alipay';
let selectedPlanCode = null;
let isLoginMode = false;

/**
 * 从 PLANS 配置更新 HTML 中的套餐详情
 */
function updatePlanDetails() {
    // 获取所有方案卡片
    const planCards = document.querySelectorAll('.plan-card');

    planCards.forEach(card => {
        const planCode = card.dataset.plan;
        const plan = PLANS[planCode];

        if (!plan) return;

        // 更新套餐名称
        const nameElement = card.querySelector('.plan-name');
        if (nameElement) {
            nameElement.textContent = plan.name;
        }

        // 更新价格
        const amountElement = card.querySelector('.amount');
        if (amountElement) {
            amountElement.textContent = plan.price;
        }

        // 更新周期
        const periodElement = card.querySelector('.period');
        if (periodElement) {
            periodElement.textContent = `/${plan.period}`;
        }

        // 更新配额数字
        const quotaElement = card.querySelector('.quota-number');
        if (quotaElement) {
            quotaElement.textContent = plan.dailyQuota;
        }
    });
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    updatePlanDetails();
    initBillingToggle();
    initPlanCards();
    initModal();
    initPaymentMethods();
    initLoginToggle();
    initApiKeyVisibility();
    initApiKeyVerification();
    initModalStatePersistence();
    parseAndFillApiKey();
});

// 处理浏览器后退按钮（bfcache），恢复按钮状态
window.addEventListener('pageshow', (event) => {
    const confirmBtn = document.getElementById('confirmSubscribeBtn');
    if (confirmBtn) {
        confirmBtn.textContent = '确认订阅';
        confirmBtn.disabled = false;
    }
});

/**
 * 初始化计费周期切换
 */
function initBillingToggle() {
    const toggleBtns = document.querySelectorAll('.toggle-btn');

    toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const period = btn.dataset.period;

            // 更新按钮状态
            toggleBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // 切换显示的卡片
            currentPeriod = period;
            updateVisibleCards();
        });
    });
}

/**
 * 更新显示的方案卡片
 */
function updateVisibleCards() {
    // 使用 body 类来控制显示（配合 CSS）
    if (currentPeriod === 'yearly') {
        document.body.classList.add('yearly-view');
    } else {
        document.body.classList.remove('yearly-view');
    }
}

/**
 * 初始化方案卡片点击
 */
function initPlanCards() {
    const subscribeBtns = document.querySelectorAll('.subscribe-btn');

    subscribeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const planCode = btn.dataset.plan;
            openSubscribeModal(planCode);
        });
    });
}

/**
 * 打开订阅弹窗
 */
function openSubscribeModal(planCode) {
    selectedPlanCode = planCode;
    const plan = PLANS[planCode];

    if (!plan) {
        console.error('未找到方案:', planCode);
        return;
    }

    // 更新弹窗内容
    const modalPlanName = document.getElementById('modalPlanName');
    const modalPrice = document.getElementById('modalPrice');

    modalPlanName.textContent = `购买 ${plan.name} 套餐`;
    modalPrice.textContent = `¥${plan.price}/${plan.period}`;

    // 恢复之前保存的表单状态
    restoreModalState();

    // 显示弹窗
    const modal = document.getElementById('subscribeModal');
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.classList.add('show');
        // 聚焦到对应的输入框
        focusActiveInput();
    }, 10);

    // 禁止背景滚动
    document.body.style.overflow = 'hidden';
}

/**
 * 聚焦到当前模式对应的输入框
 */
function focusActiveInput() {
    setTimeout(() => {
        if (isLoginMode) {
            const apiKeyInput = document.getElementById('subscribeApiKey');
            if (apiKeyInput) {
                apiKeyInput.focus();
            }
        } else {
            const emailInput = document.getElementById('subscribeEmail');
            if (emailInput) {
                emailInput.focus();
            }
        }
    }, 100);
}

/**
 * 关闭订阅弹窗（保留表单状态）
 */
function closeSubscribeModal() {
    const modal = document.getElementById('subscribeModal');
    modal.classList.remove('show');

    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);

    // 恢复背景滚动
    document.body.style.overflow = '';

    // 清除错误状态
    clearAllErrors();

    // 保存状态（关闭时持久化一次）
    saveModalState();
}

/**
 * 初始化弹窗
 */
function initModal() {
    const modal = document.getElementById('subscribeModal');
    const closeBtn = document.getElementById('closeModal');
    const confirmBtn = document.getElementById('confirmSubscribeBtn');

    // 关闭按钮
    closeBtn.addEventListener('click', closeSubscribeModal);

    // 点击背景关闭
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeSubscribeModal();
        }
    });

    // ESC 键关闭
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'flex') {
            closeSubscribeModal();
        }
    });

    // 确认订阅按钮
    confirmBtn.addEventListener('click', handleSubscribe);
}

/**
 * 初始化支付方式选择
 */
function initPaymentMethods() {
    const methods = document.querySelectorAll('.payment-method');

    methods.forEach(method => {
        method.addEventListener('click', () => {
            methods.forEach(m => m.classList.remove('selected'));
            method.classList.add('selected');
            selectedPaymentMethod = method.dataset.method;
            saveModalState();
        });
    });
}

/**
 * 初始化登录切换
 */
function initLoginToggle() {
    const toggleLink = document.getElementById('loginToggleLink');

    toggleLink.addEventListener('click', (e) => {
        e.preventDefault();
        isLoginMode = !isLoginMode;
        updateLoginToggleUI();
        saveModalState();
        // 切换后聚焦到对应的输入框
        focusActiveInput();
    });
}

/**
 * 更新登录切换 UI
 */
function updateLoginToggleUI() {
    const apiKeySection = document.getElementById('apiKeySection');
    const toggleText = document.getElementById('loginToggleText');
    const toggleLink = document.getElementById('loginToggleLink');
    const emailInput = document.getElementById('subscribeEmail');

    if (isLoginMode) {
        apiKeySection.style.display = 'block';
        toggleText.textContent = '新用户？';
        toggleLink.textContent = '使用邮箱注册';
        emailInput.parentElement.style.display = 'none';
    } else {
        apiKeySection.style.display = 'none';
        toggleText.textContent = '已有 API Key？';
        toggleLink.textContent = '点击登录';
        emailInput.parentElement.style.display = 'block';
    }
}

/**
 * 初始化 API Key 可见性切换
 */
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

/**
 * 初始化 API Key 验证功能
 */
function initApiKeyVerification() {
    const verifyBtn = document.getElementById('verifyApiKeyBtn');
    const apiKeyInput = document.getElementById('subscribeApiKey');
    const resultDiv = document.getElementById('apiKeyVerifyResult');

    if (!verifyBtn || !apiKeyInput || !resultDiv) return;

    verifyBtn.addEventListener('click', async () => {
        const apiKey = apiKeyInput.value.trim();

        if (!apiKey) {
            showVerifyResult('error', '请输入 API 密钥');
            return;
        }

        // 显示加载状态
        verifyBtn.disabled = true;
        verifyBtn.textContent = '验证中...';
        showVerifyResult('loading', '正在验证...');

        try {
            const response = await fetch(`${API_BASE_URL}/subscriptions/my/quota`, {
                method: 'GET',
                headers: {
                    'X-API-Key': apiKey
                }
            });

            if (response.ok) {
                const data = await response.json();
                // 构建成功消息
                let message = `验证成功！您的邮箱是 ${data.email}`;
                
                // 如果有订阅信息，显示套餐名称
                if (data.has_subscription && data.subscription) {
                    message += `，当前套餐：${data.subscription.plan_name}`;
                }
                
                showVerifyResult('success', message);
            } else {
                const errorData = await response.json().catch(() => ({}));
                const errorMsg = errorData.detail || `验证失败 (${response.status})`;
                showVerifyResult('error', mapVerifyErrorMessage(errorMsg));
            }
        } catch (error) {
            console.error('API Key 验证错误:', error);
            showVerifyResult('error', '网络错误，请检查网络连接');
        } finally {
            verifyBtn.disabled = false;
            verifyBtn.textContent = '验证';
        }
    });

    // 当输入内容变化时，清除验证结果
    apiKeyInput.addEventListener('input', () => {
        hideVerifyResult();
    });
}

/**
 * 显示 API Key 验证结果
 */
function showVerifyResult(type, message) {
    const resultDiv = document.getElementById('apiKeyVerifyResult');
    const apiKeyInput = document.getElementById('subscribeApiKey');
    if (!resultDiv) return;

    resultDiv.className = 'api-key-verify-result ' + type;
    resultDiv.textContent = message;
    resultDiv.style.display = 'block';

    // 如果是错误，输入框边框变红
    if (type === 'error' && apiKeyInput) {
        apiKeyInput.classList.add('input-error');
    } else if (apiKeyInput) {
        apiKeyInput.classList.remove('input-error');
    }
}

/**
 * 隐藏 API Key 验证结果
 */
function hideVerifyResult() {
    const resultDiv = document.getElementById('apiKeyVerifyResult');
    const apiKeyInput = document.getElementById('subscribeApiKey');
    if (resultDiv) {
        resultDiv.style.display = 'none';
    }
    if (apiKeyInput) {
        apiKeyInput.classList.remove('input-error');
    }
}

/**
 * 显示邮箱验证结果
 */
function showEmailResult(type, message) {
    const resultDiv = document.getElementById('emailVerifyResult');
    const emailInput = document.getElementById('subscribeEmail');
    if (!resultDiv) return;

    resultDiv.className = 'email-verify-result ' + type;
    resultDiv.textContent = message;
    resultDiv.style.display = 'block';

    // 如果是错误，输入框边框变红
    if (type === 'error' && emailInput) {
        emailInput.classList.add('input-error');
    } else if (emailInput) {
        emailInput.classList.remove('input-error');
    }
}

/**
 * 隐藏邮箱验证结果
 */
function hideEmailResult() {
    const resultDiv = document.getElementById('emailVerifyResult');
    const emailInput = document.getElementById('subscribeEmail');
    if (resultDiv) {
        resultDiv.style.display = 'none';
    }
    if (emailInput) {
        emailInput.classList.remove('input-error');
    }
}

/**
 * 映射验证错误消息为用户友好的文本
 */
function mapVerifyErrorMessage(detail) {
    if (detail.includes('Invalid or disabled API key') || detail.includes('Invalid or expired API key')) {
        return 'API 密钥无效或已过期';
    }
    if (detail.includes('API Key is required') || detail.includes('required')) {
        return '请输入 API 密钥';
    }
    if (detail.includes('not active')) {
        return '关联账户已被停用';
    }
    return detail;
}

/**
 * 保存弹窗表单状态到 sessionStorage
 */
function saveModalState() {
    const state = {
        email: document.getElementById('subscribeEmail').value,
        apiKey: document.getElementById('subscribeApiKey').value,
        isLoginMode: isLoginMode,
        paymentMethod: selectedPaymentMethod
    };
    sessionStorage.setItem('subscribeModalState', JSON.stringify(state));
}

/**
 * 从 sessionStorage 恢复弹窗表单状态
 */
function restoreModalState() {
    const saved = sessionStorage.getItem('subscribeModalState');
    if (!saved) return;

    try {
        const state = JSON.parse(saved);

        // 恢复邮箱
        if (state.email) {
            document.getElementById('subscribeEmail').value = state.email;
        }

        // 恢复 API Key
        if (state.apiKey) {
            document.getElementById('subscribeApiKey').value = state.apiKey;
        }

        // 恢复登录模式
        if (state.isLoginMode !== undefined) {
            isLoginMode = state.isLoginMode;
            updateLoginToggleUI();
        }

        // 恢复支付方式
        if (state.paymentMethod) {
            selectedPaymentMethod = state.paymentMethod;
            const methods = document.querySelectorAll('.payment-method');
            methods.forEach(m => {
                m.classList.toggle('selected', m.dataset.method === selectedPaymentMethod);
            });
        }
    } catch (e) {
        console.error('恢复弹窗状态失败:', e);
    }
}

/**
 * 绑定表单输入事件，实时保存状态
 */
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

/**
 * 在输入框下方显示错误信息，并将输入框边框变红
 */
function showInputError(inputEl, message) {
    clearInputError(inputEl);
    inputEl.classList.add('input-error');
    const errorEl = document.createElement('div');
    errorEl.className = 'input-error-msg';
    errorEl.textContent = message;
    // 插入到输入框（或其包裹容器）之后
    const wrapper = inputEl.closest('.api-key-input-wrapper') || inputEl;
    wrapper.insertAdjacentElement('afterend', errorEl);
}

/**
 * 清除输入框的错误状态
 */
function clearInputError(inputEl) {
    inputEl.classList.remove('input-error');
    const wrapper = inputEl.closest('.api-key-input-wrapper') || inputEl;
    const existingError = wrapper.parentElement.querySelector('.input-error-msg');
    if (existingError) {
        existingError.remove();
    }
}

/**
 * 在确认按钮下方显示通用错误信息
 */
function showGeneralError(message) {
    const el = document.getElementById('generalError');
    el.textContent = message;
    el.classList.add('show');
}

/**
 * 清除通用错误信息
 */
function clearGeneralError() {
    const el = document.getElementById('generalError');
    el.textContent = '';
    el.classList.remove('show');
}

/**
 * 清除所有错误状态
 */
function clearAllErrors() {
    clearInputError(document.getElementById('subscribeEmail'));
    clearInputError(document.getElementById('subscribeApiKey'));
    clearGeneralError();
    hideVerifyResult();
    hideEmailResult();
}

/**
 * API Key 模式下的错误映射规则
 * 将接口返回的 detail 映射到对应的输入框或通用错误
 */
const API_KEY_ERROR_MAP = [
    // 关键词匹配 → 显示在 API Key 输入框下（可选 display 替换显示文案）
    { keywords: ['Invalid or disabled API key'], target: 'apiKey', display: 'API 密钥无效或已被禁用' },
    { keywords: ['API Key', 'API key', 'api key'], target: 'apiKey' },
    { keywords: ['测试账户'], target: 'apiKey' },
];

/**
 * 邮箱模式下的错误映射规则
 */
const EMAIL_ERROR_MAP = [
    // 关键词匹配 → 显示在邮箱输入框下
    { keywords: ['邮箱已注册', 'API Key'], target: 'email' },
    { keywords: ['email', 'Email'], target: 'email' },
];

/**
 * 根据错误映射规则显示错误
 * @param {string} message - 错误信息
 * @param {Array} errorMap - 错误映射规则
 * @param {HTMLElement} defaultInput - 默认的输入框元素
 */
function showMappedError(message, errorMap, defaultInput) {
    clearAllErrors();

    for (const rule of errorMap) {
        if (rule.keywords.some(kw => message.includes(kw))) {
            if (rule.target === 'apiKey') {
                // API Key 相关错误显示在验证结果区域
                showVerifyResult('error', rule.display || message);
            } else {
                // 邮箱相关错误显示在邮箱验证结果区域
                showEmailResult('error', rule.display || message);
            }
            return;
        }
    }

    // 没有匹配到任何规则
    // 根据当前模式显示在对应的验证结果区域
    if (isLoginMode) {
        showVerifyResult('error', message);
    } else {
        showEmailResult('error', message);
    }
}

/**
 * 处理订阅请求
 */
async function handleSubscribe() {
    const confirmBtn = document.getElementById('confirmSubscribeBtn');
    const emailInput = document.getElementById('subscribeEmail');
    const apiKeyInput = document.getElementById('subscribeApiKey');

    // 清除之前的错误
    clearAllErrors();

    // 验证
    if (isLoginMode) {
        const apiKey = apiKeyInput.value.trim();
        if (!apiKey) {
            showVerifyResult('error', '请输入您的 API Key');
            return;
        }
        await createSubscriptionWithApiKey(apiKey);
    } else {
        const email = emailInput.value.trim();
        if (!email) {
            showEmailResult('error', '请输入您的邮箱');
            return;
        }
        if (!isValidEmail(email)) {
            showEmailResult('error', '请输入有效的邮箱地址');
            return;
        }
        await createGuestSubscription(email);
    }
}

/**
 * 验证邮箱格式
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * 使用 API Key 创建订阅
 */
async function createSubscriptionWithApiKey(apiKey) {
    const confirmBtn = document.getElementById('confirmSubscribeBtn');
    const originalText = confirmBtn.textContent;

    try {
        confirmBtn.disabled = true;
        confirmBtn.textContent = '处理中，请稍等...';

        const response = await fetch(`${API_BASE_URL}/payments/subscription/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-KEY': apiKey
            },
            body: JSON.stringify({
                plan_code: selectedPlanCode,
                payment_method: selectedPaymentMethod,
                method: 'web',
                return_url: `${window.location.origin}/payment-result.html`
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || '创建订单失败');
        }

        // 跳转到支付页面
        if (data.payment_url) {
            // 保存 API Key 和订单号供结果页使用
            localStorage.setItem('pending_api_key', apiKey);
            if (data.order_no) {
                localStorage.setItem('pending_order_no', data.order_no);
            }
            saveModalState({ modalOpen: true });
            confirmBtn.textContent = '正在前往支付...';
            window.location.href = data.payment_url;
        } else {
            throw new Error('未获取到支付链接');
        }

    } catch (error) {
        console.error('购买错误:', error);
        const msg = error.message || '创建订单失败，请稍后重试';
        showMappedError(msg, API_KEY_ERROR_MAP, document.getElementById('subscribeApiKey'));
        confirmBtn.disabled = false;
        confirmBtn.textContent = originalText;
    }
}

/**
 * 访客创建订阅（使用邮箱）
 */
async function createGuestSubscription(email) {
    const confirmBtn = document.getElementById('confirmSubscribeBtn');
    const originalText = confirmBtn.textContent;

    try {
        confirmBtn.disabled = true;
        confirmBtn.textContent = '处理中...';

        const response = await fetch(`${API_BASE_URL}/payments/subscription/guest-create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                plan_code: selectedPlanCode,
                payment_method: selectedPaymentMethod,
                method: 'web',
                return_url: `${window.location.origin}/payment-result.html`
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || '创建订单失败');
        }

        // 保存返回的 API Key（如果有）
        if (data.api_key) {
            localStorage.setItem('pending_api_key', data.api_key);
            localStorage.setItem('pending_order_no', data.order_no);
        }

        // 跳转到支付页面
        if (data.payment_url) {
            saveModalState({ modalOpen: true });
            confirmBtn.textContent = '正在前往支付...';
            window.location.href = data.payment_url;
        } else {
            throw new Error('未获取到支付链接');
        }

    } catch (error) {
        console.error('购买错误:', error);
        const msg = error.message || '创建订单失败，请稍后重试';
        showMappedError(msg, EMAIL_ERROR_MAP, document.getElementById('subscribeEmail'));
        confirmBtn.disabled = false;
        confirmBtn.textContent = originalText;
    }
}

/**
 * 解析 URL 中的加密 API Key 并自动填入输入框
 * API Key 通过 URL 参数 'ak' 传递，使用 Base64 + Reverse 加密
 */
function parseAndFillApiKey() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const encodedKey = urlParams.get('ak');

        if (!encodedKey) return;

        // Decode: Reverse + Base64 decode
        const decodedKey = atob(encodedKey.split('').reverse().join(''));

        if (decodedKey) {
            // Fill the API Key input
            const apiKeyInput = document.getElementById('subscribeApiKey');
            if (apiKeyInput) {
                apiKeyInput.value = decodedKey;
            }

            // Switch to login mode (API Key mode)
            isLoginMode = true;
            updateLoginToggleUI();

            // Save the state
            saveModalState();

            // Clean up the URL (remove the ak parameter for security)
            const url = new URL(window.location.href);
            url.searchParams.delete('ak');
            window.history.replaceState({}, document.title, url.toString());
        }
    } catch (e) {
        console.error('Failed to decode API Key from URL:', e);
    }
}
