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
| 高 | `popup/popup.js` 的 `mapApiKeyError`、额度查询错误处理；所有语言词库 | 引用了 `apiKeyRequired`、`apiKeyUserInactive`、`apiKeyExpired`、`apiKeyInvalid`、`quotaCheckFailed`，但英语基准词库及其他词库均未定义。触发相应错误时回落中文。 | 为全部语言补齐这 5 个键，并覆盖错误分支。 |
| 高 | `scripts/injectGeminiExportMenu.js` 的 `getConversationTurns`、`getTurnRole`、`extractGenericTurnMarkdown`；`scripts/injectGeminiButton.js` 的 `findClosestMessageContainer` | 旧标签结构失效后的回退逻辑依赖“你说”“Gemini 说”。非中文新界面可能无法选中消息或区分角色。旧结构仍有独立路径，不能据此断言全部 Gemini 导出失效。 | 优先使用与语言无关的结构或角色属性；在真实非中文新界面验证回退路径。 |
| 中 | `popup/popup.js` 的 `loadLanguagePreference`；大量调用 `chrome.i18n.getMessage` 的内容脚本 | popup 支持手动选择 `preferredLanguage`，但多数网页按钮、公式通知仍直接跟随 Chrome 语言，未读取该偏好。历史功能已单独接入，但还不是全插件统一语言机制。 | 统一词库加载、语言优先级和变更通知；分别验证各平台注入。 |
| 中 | `popup/popup.js:460,768,771,974,977`；`popup/popup.html:117,132` | “已复制!”、服务器 URL 校验提示、API Key 显示/隐藏与复制按钮 tooltip 仍是固定中文，tooltip 没有在 `loadI18nText` 中重设。 | 增加翻译键并覆盖 tooltip 与校验失败状态。 |
| 中 | `_locales/zh_TW/messages.json` | 相比英语缺少 `aboutTabTitle`、`acknowledgmentText`、`developerEmailLabel`、`documentationLabel`、`githubLabel`、`versionLabel` 共 6 项，会落到浏览器语言或默认文案。其余 8 个词库键集合一致。 | 补齐繁中翻译，并增加全量词库键对齐检查。 |
| 中 | `scripts/injectGeminiCanvasButton.js:583`；`scripts/extractGeminiContent.js:66` | Canvas 编辑器不存在时抛出中文错误；工具执行代码块的文字回退只识别“显示代码”“代码输出”，结构识别失败时可能误收集分析代码。 | 翻译错误信息，并优先依赖稳定结构识别代码块。 |
| 低 | `scripts/injectGptButton.js:40`；`scripts/injectGeminiButton.js` 的复制按钮与 Docs 菜单回退 | 有稳定属性选择器，但文字兜底只覆盖中英文（部分含繁中），其他语言在结构变化时覆盖不足。 | 针对无稳定属性的实际页面补回退，不扩大到任意按钮匹配。 |
| 低 | `scripts/history/core.js:137`；`scripts/history/i18n.js` 的 `error` | 无标题的历史记录仍持久化为“未命名对话”；已定义的 `historyUntitled` 尚未接入显示。旧后台中文错误有些按类别转换成通用本地化提示，尚未逐个保留具体原因。 | 无标题状态与用户原始标题分开存储；后台返回结构化错误码和参数，由界面翻译。 |
| 待确认调用 | `popup/popup.js` 的 `formatDate` | 只区分浏览器中文和 `en-US`，不使用手动偏好或其他区域格式。本次未找到调用点，不能断言当前界面受到影响。 | 使用前改用 `Intl.DateTimeFormat` 和实际选中的 locale，或删除无用函数。 |

## 后续顺序

先处理缺失翻译键与 popup 固定文案，再统一全插件语言偏好；Gemini 的非中文 DOM 识别单独进行真实页面验证。不要把用户对话原文、标题或文件名当成待翻译的界面文案。
