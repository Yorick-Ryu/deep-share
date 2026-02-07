/**
 * 订阅定价页面交互逻辑
 * 处理计费周期切换、订阅方案选择和支付流程
 */

// 配置
const API_BASE_URL = 'http://127.0.0.1:8000';

// 订阅方案数据
const PLANS = {
    standard_monthly: {
        code: 'standard_monthly',
        name: 'Standard',
        price: 9.9,
        period: '月',
        periodType: 'monthly',
        dailyQuota: 10,
        mcpEnabled: false,
        skillEnabled: false
    },
    pro_monthly: {
        code: 'pro_monthly',
        name: 'Pro',
        price: 19.9,
        period: '月',
        periodType: 'monthly',
        dailyQuota: 30,
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

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    initBillingToggle();
    initPlanCards();
    initModal();
    initPaymentMethods();
    initLoginToggle();
    initApiKeyVisibility();
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

    modalPlanName.textContent = `订阅 ${plan.name}`;
    modalPrice.textContent = `¥${plan.price}/${plan.period}`;

    // 显示弹窗
    const modal = document.getElementById('subscribeModal');
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);

    // 禁止背景滚动
    document.body.style.overflow = 'hidden';
}

/**
 * 关闭订阅弹窗
 */
function closeSubscribeModal() {
    const modal = document.getElementById('subscribeModal');
    modal.classList.remove('show');

    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);

    // 恢复背景滚动
    document.body.style.overflow = '';

    // 重置表单
    document.getElementById('subscribeEmail').value = '';
    document.getElementById('subscribeApiKey').value = '';
    isLoginMode = false;
    updateLoginToggleUI();
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
        toggleLink.textContent = '使用邮箱注册并订阅';
        emailInput.parentElement.style.display = 'none';
    } else {
        apiKeySection.style.display = 'none';
        toggleText.textContent = '已有 API Key？';
        toggleLink.textContent = '点击登录并订阅';
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
 * 处理订阅请求
 */
async function handleSubscribe() {
    const confirmBtn = document.getElementById('confirmSubscribeBtn');
    const emailInput = document.getElementById('subscribeEmail');
    const apiKeyInput = document.getElementById('subscribeApiKey');

    // 验证
    if (isLoginMode) {
        const apiKey = apiKeyInput.value.trim();
        if (!apiKey) {
            alert('请输入您的 API Key');
            return;
        }
        await createSubscriptionWithApiKey(apiKey);
    } else {
        const email = emailInput.value.trim();
        if (!email) {
            alert('请输入您的邮箱');
            return;
        }
        if (!isValidEmail(email)) {
            alert('请输入有效的邮箱地址');
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
        confirmBtn.textContent = '处理中...';

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
                return_url: `${window.location.origin}/docs/payment-result.html`
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || '创建订阅失败');
        }

        // 跳转到支付页面
        if (data.payment_url) {
            window.location.href = data.payment_url;
        } else {
            throw new Error('未获取到支付链接');
        }

    } catch (error) {
        console.error('订阅错误:', error);
        alert(error.message || '创建订阅失败，请稍后重试');
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
                return_url: `${window.location.origin}/docs/payment-result.html`
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || '创建订阅失败');
        }

        // 保存返回的 API Key（如果有）
        if (data.api_key) {
            localStorage.setItem('pending_api_key', data.api_key);
            localStorage.setItem('pending_order_no', data.order_no);
        }

        // 跳转到支付页面
        if (data.payment_url) {
            window.location.href = data.payment_url;
        } else {
            throw new Error('未获取到支付链接');
        }

    } catch (error) {
        console.error('订阅错误:', error);
        alert(error.message || '创建订阅失败，请稍后重试');
        confirmBtn.disabled = false;
        confirmBtn.textContent = originalText;
    }
}
