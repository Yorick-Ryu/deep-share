# DeepShare

<p align="center">
  <img src="icons/deepshare-icon.svg" alt="deepshare-icon" width="128"/>
</p>

一款专为 AI 用户设计的轻量级浏览器插件，一键复制DeepSeek、ChatGPT、豆包等AI对话的公式，导出排版精美的Word文档，支持DeepSeek长对话截图分享。

[English](README.md)

## 功能特点

- 一键截取 AI 对话内容（目前仅 DeepSeek 支持）
- 支持分享图片或纯文本
- 一键复制 LaTeX 公式（点击任意数学公式即可复制其 LaTeX 代码）
- 支持导出为 Word 文档（DOCX），并保留公式格式（目前仅 DeepSeek 支持一键导出）
- 支持自定义水印
- 支持选择性分享对话内容
  - 可选择单条或多条对话
  - 支持一键全选/取消全选
- 简洁的操作界面
- 开源无广告

## 支持平台

| AI平台 | 公式复制 | 对话转Word | 对话截图 |
|--------|---------|-----------|---------|
| DeepSeek | ✓ | ✓ | ✓ |
| ChatGPT | ✓ | ✓ | ✗ |
| 豆包 | ✓ | 手动粘贴 | ✗ |
| 元宝 | ✗ | 手动粘贴 | ✗ |
| Kimi | ✗ | 手动粘贴 | ✗ |
| Grok | ✓ | 手动粘贴 | ✗ |
| 通义千问 | ✓ | 手动粘贴 | ✗ |
| 讯飞星火 | ✓ | 手动粘贴 | ✗ |
| 智谱清言 | ✓ | 手动粘贴 | ✗ |
| OpenRouter | ✓ | 手动粘贴 | ✗ |
| Poe | ✓ | 手动粘贴 | ✗ |
| Monica | ✓ | 手动粘贴 | ✗ |
| 问小白 | ✓ | 手动粘贴 | ✗ |
| AskManyAI | ✓ | 手动粘贴 | ✗ |
| 万知 | ✓ | 手动粘贴 | ✗ |
| AI智慧岛 | ✓ | 手动粘贴 | ✗ |
| 纳米AI | ✓ | 手动粘贴 | ✗ |
| 知乎 | ✓ | ✗ | ✗ |

注：手动粘贴功能表示支持将AI回答的Markdown文本复制到插件中，转换为Word文档。

## 安装方式

1. 从 Edge/Chrome/Firefox 网上应用商店安装
   - [Edge 外接程序商店](https://microsoftedge.microsoft.com/addons/detail/deepshare/pdccjnppfegekpnhfljbngammgfbcofm)
   - [Chrome 网上应用商店](https://chromewebstore.google.com/detail/omnaecaamcabmnbjnpjpecoaalfgidop)
   - [Firefox 附加组件](https://addons.mozilla.org/firefox/addon/deepshare/)
2. 下载源码本地安装:
   - 下载并解压源码
   - 打开 Edge\Chrome 扩展程序页面
   - 启用开发者模式
   - 点击"加载已解压的扩展程序"
   - 选择解压后的文件夹
3. **重要提示:** 安装后，请刷新已打开的 AI 聊天页面，以使扩展生效。

## 使用方法

前提：安装插件

1. 访问支持的 AI 平台（如 https://chat.deepseek.com/）
2. 点击开始新对话
3. 在右上角可以看到两个按钮：
   - 选择对话按钮：开启选择模式，可以选择要分享的对话
   - 分享按钮：直接分享所有对话
4. 选择对话模式下：
   - 可以勾选想要分享的对话
   - 使用"全选"/"取消全选"按钮快速操作
   - 点击分享按钮生成所选对话的内容
5. 选择分享格式:
   - 截图模式：生成一张包含对话内容的长图（仅 DeepSeek 支持）
   - 文本模式：包含对话内容的纯文本
6. 复制或者下载生成的图片和文本

## 水印设置

点击分享对话框右上角的设置界面，支持：

- 隐藏默认截图水印
- 自定义水印内容

## 贡献指南

欢迎提交Issue和Pull Request来帮助改进项目。

## 许可证

本项目基于 [CC BY-NC 4.0 许可证](LICENSE) 开源发布。这意味着您可以自由地使用和修改代码用于非商业目的，但禁止任何商业用途。

## 支持项目

如果您觉得这个项目对您有帮助，欢迎支持项目的发展:

- ⭐ Star 本项目
- 📢 分享给更多的人
- 🐛 提交 Bug 反馈或功能建议
- 🧧 赞助项目发展（微信扫码赞助）

<img src="icons/sponsor-code.png" alt="donate" width="200"/>

感谢您的支持！