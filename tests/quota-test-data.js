// 测试数据：用于验证额度卡片动态显示逻辑

// 场景 1: 两者都有
const bothQuotasData = {
    email: "user@example.com",
    has_subscription: true,
    subscription: {
        plan_name: "Pro",
        daily_quota: 10,
        used_today: 2,
        expires_at: "2026-03-09T00:00:00Z"
    },
    addon_quota: {
        total_quota: 50,
        used_quota: 5,
        gift_quota: 0,
        expires_at: "2026-12-31T00:00:00Z"
    }
};

// 场景 2: 仅有订阅
const subscriptionOnlyData = {
    email: "user@example.com",
    has_subscription: true,
    subscription: {
        plan_name: "Ultra",
        daily_quota: 20,
        used_today: 2,
        expires_at: "2026-06-15T00:00:00Z"
    },
    addon_quota: null  // 或者 { total_quota: 0, used_quota: 0 }
};

// 场景 3: 仅有按量额度
const addonOnlyData = {
    email: "user@example.com",
    has_subscription: false,
    subscription: null,
    addon_quota: {
        total_quota: 100,
        used_quota: 77,
        gift_quota: 0,
        expires_at: "2026-08-20T00:00:00Z"
    }
};

// 场景 4: 额度用尽 - 订阅
const subscriptionDepletedData = {
    email: "user@example.com",
    has_subscription: true,
    subscription: {
        plan_name: "Basic",
        daily_quota: 5,
        used_today: 5,  // 用尽
        expires_at: "2026-03-09T00:00:00Z"
    },
    addon_quota: null
};

// 场景 5: 额度用尽 - 按量
const addonDepletedData = {
    email: "user@example.com",
    has_subscription: false,
    subscription: null,
    addon_quota: {
        total_quota: 50,
        used_quota: 50,  // 用尽
        gift_quota: 0,
        expires_at: "2026-12-31T00:00:00Z"
    }
};

// 场景 6: 低额度警告 - 订阅
const subscriptionLowData = {
    email: "user@example.com",
    has_subscription: true,
    subscription: {
        plan_name: "Pro",
        daily_quota: 10,
        used_today: 9,  // 仅剩 1 个，低于 20%
        expires_at: "2026-03-09T00:00:00Z"
    },
    addon_quota: null
};

// 场景 7: 低额度警告 - 按量
const addonLowData = {
    email: "user@example.com",
    has_subscription: false,
    subscription: null,
    addon_quota: {
        total_quota: 100,
        used_quota: 95,  // 仅剩 5 个，低于 20%
        gift_quota: 0,
        expires_at: "2026-08-20T00:00:00Z"
    }
};

// 使用方法（在浏览器控制台中）：
// 1. 打开插件的 popup 页面
// 2. 打开浏览器开发者工具
// 3. 在控制台中复制粘贴上述测试数据
// 4. 调用 displayDualQuota() 函数测试不同场景
//
// 示例：
// displayDualQuota(bothQuotasData);        // 测试两者都有
// displayDualQuota(subscriptionOnlyData);  // 测试仅订阅
// displayDualQuota(addonOnlyData);         // 测试仅按量额度

console.log('测试数据已加载！');
console.log('可用场景：');
console.log('1. bothQuotasData - 两者都有');
console.log('2. subscriptionOnlyData - 仅订阅');
console.log('3. addonOnlyData - 仅按量额度');
console.log('4. subscriptionDepletedData - 订阅额度用尽');
console.log('5. addonDepletedData - 按量额度用尽');
console.log('6. subscriptionLowData - 订阅额度低');
console.log('7. addonLowData - 按量额度低');
console.log('\n使用方法: displayDualQuota(bothQuotasData)');
