a# 开发与维护风险备忘

本页记录了 DeepShare 在开发过程中发现的潜在技术风险及其影响，供后续维护参考。

## 1. 跨域请求失败 (Failed to Fetch)

### 问题描述
在部分 LLM 站点（如 ChatGPT, DeepSeek, Gemini）中发起文档转换请求时，偶尔会出现 `Failed to Fetch` 错误。

### 风险成因
1. **CSP (Content Security Policy) 限制**：大厂页面通常有严格的 CSP 策略，禁止脚本连接未经声明的第三方域名。
2. **权限声明缺失**：在 Manifest V3 中，即使服务器支持 CORS，如果扩展没有在 `host_permissions` 中明确声明该域名，请求仍可能被拦截。

---

## 2. 权限更新导致插件自动关闭

### 风险点描述
如果试图通过在 `manifest.json` 的 `host_permissions` 中添加 API 域名（如 `https://api.ds.rick216.cn/*`）来修复上述跨域问题，会触发浏览器的**安全警告**。

### 影响范围
*   **强制禁用**：当用户浏览器自动更新到包含新权限的版本时，Chrome 会出于安全考虑自动禁用该扩展。
*   **用户感知**：用户会看到“权限已更改，扩展已被禁用”的提示，必须手动点按“重新启用”才能恢复使用。这会导致活跃用户量骤降。

---

## 3. 待实施的优化方案 (Optional Host Permissions)

为了在不打断用户体验的前提下修复跨域问题，建议采用 **可选权限 (Optional Host Permissions)** 方案：

### 实施建议
1.  **修改 Manifest**：将 API 域名放入 `optional_host_permissions` 而非 `host_permissions`。
2.  **动态申请**：在用户点击“转换”按钮时，使用 `chrome.permissions.request` 动态请求访问权限。
3.  **用户手势触发**：由于权限请求必须由用户操作触发，这种方式既符合 Chrome 安全规范，又不会在插件更新时导致其被禁用。

---
*上次更新：2026-01-09*
