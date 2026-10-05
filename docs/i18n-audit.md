# 国际化检查记录

检查日期：2026-10-05。范围：插件 popup、内容脚本、历史库、后台及 `_locales`。这是源码审查清单，不代表已在每个平台、每种语言中复现。中文注释、日志、用于匹配官方页面的文字以及已接入翻译的中文兜底，不直接计作界面缺陷。

## 本次已完成

- DeepSeek 历史库的 9 种语言文案、日期分组、生成 Markdown 的角色与元信息。
- 通过扩展后台读取私有翻译资源，沿用现有权限；不新增网站访问权限。
- 显式语言偏好优先；历史功能自动模式跟随页面语言，缺省使用浏览器语言，不支持的语言回退英语。
- 按实际页面核对中英、繁中、西语、两种葡语、法语、日语、德语的官方导出控件标签。
- 62 项自动测试通过；实际浏览器验证英语、德语历史库及设置提示，以及英文搜索、选择、导入附件。截图保存在本地 output 目录，不纳入代码提交。

## 尚未完成的项目

| 优先级 | 位置 | 发现与影响 | 建议 |
| --- | --- | --- | --- |
| 高 | `scripts/injectGeminiExportMenu.js` 的 `getConversationTurns`、`getTurnRole`、`extractGenericTurnMarkdown`；`scripts/injectGeminiButton.js` 的 `findClosestMessageContainer` | 旧标签结构失效后的回退逻辑依赖“你说”“Gemini 说”。非中文新界面可能无法选中消息或区分角色。旧结构仍有独立路径，不能据此断言全部 Gemini 导出失效。 | 优先使用与语言无关的结构或角色属性；在真实非中文新界面验证回退路径。 |
| 中 | `popup/popup.js` 的 `loadLanguagePreference`；大量调用 `chrome.i18n.getMessage` 的内容脚本 | popup 支持手动选择 `preferredLanguage`，但多数网页按钮、公式通知仍直接跟随 Chrome 语言，未读取该偏好。历史功能已单独接入，但还不是全插件统一语言机制。 | 统一词库加载、语言优先级和变更通知；分别验证各平台注入。 |
| 中 | `scripts/injectGeminiCanvasButton.js:583`；`scripts/extractGeminiContent.js:66` | Canvas 编辑器不存在时抛出中文错误；工具执行代码块的文字回退只识别“显示代码”“代码输出”，结构识别失败时可能误收集分析代码。 | 翻译错误信息，并优先依赖稳定结构识别代码块。 |
| 低 | `scripts/injectGptButton.js:40`；`scripts/injectGeminiButton.js` 的复制按钮与 Docs 菜单回退 | 有稳定属性选择器，但文字兜底只覆盖中英文（部分含繁中），其他语言在结构变化时覆盖不足。 | 针对无稳定属性的实际页面补回退，不扩大到任意按钮匹配。 |
| 低 | `scripts/history/core.js:137`；`scripts/history/i18n.js` 的 `error` | 无标题的历史记录仍持久化为“未命名对话”；已定义的 `historyUntitled` 尚未接入显示。旧后台中文错误有些按类别转换成通用本地化提示，尚未逐个保留具体原因。 | 无标题状态与用户原始标题分开存储；后台返回结构化错误码和参数，由界面翻译。 |
| 待确认调用 | `popup/popup.js` 的 `formatDate` | 只区分浏览器中文和 `en-US`，不使用手动偏好或其他区域格式。本次未找到调用点，不能断言当前界面受到影响。 | 使用前改用 `Intl.DateTimeFormat` 和实际选中的 locale，或删除无用函数。 |

## 后续顺序

先处理缺失翻译键与 popup 固定文案，再统一全插件语言偏好；Gemini 的非中文 DOM 识别单独进行真实页面验证。不要把用户对话原文、标题或文件名当成待翻译的界面文案。

## 后续修复：设置页提示

已为全部 9 种语言补齐 API Key 错误、额度查询失败（区分缓存数据）、复制成功、按钮提示及服务器地址校验文案，共 13 个键。按钮同时设置本地化的无障碍名称，已显示的地址校验提示会随语言切换更新。其余上述项目仍待处理。浏览器重新加载与实际页面验证因扩展管理页的自动控制限制尚未完成。

## 后续修复：繁体中文关于页面

已补齐 `aboutTabTitle`、`versionLabel`、`documentationLabel`、`githubLabel`、`developerEmailLabel` 和 `acknowledgmentText`，致谢文案与简体中文内容保持一致。繁体中文与英语词库现有键集合完全一致。浏览器重新加载与实际页面验证仍受上述自动控制限制。

## 1.9.3 发布前验证

2026-10-05：62 项现有回归测试通过；使用 DOM 桩执行真实 popup 脚本，验证全部 9 种语言的文案绑定、4 类地址错误的语言切换、按钮 title/aria-label、关于区域和 API 错误映射，并确认词库均为 252 项。安装包完整性、manifest 文件引用与权限/注入范围对比检查通过。用户重新加载后，实际弹窗已确认英文 `Show/hide API Key`、`Copy API Key` 生效；随后自动控制被浏览器 URL 安全策略阻止，繁体中文排版及其余真实交互尚未完成验证，DOM 桩测试不代表浏览器视觉验证。
