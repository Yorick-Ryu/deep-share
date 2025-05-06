# DeepShare

<p align="center">
  <img src="icons/deepshare-icon.svg" alt="deepshare-icon" width="128"/>
</p>

A lightweight browser extension designed for AI users to easily share, save, and export AI conversations with special optimization for mathematical formulas. Supports DeepSeek, DoubaoAI, Yuanbao, ChatGPT and more.

[简体中文](README.zh-CN.md)

## Features

- One-click screenshot of AI conversations (DeepSeek only currently)
- Share as image or plain text
- One-click LaTeX formula copying (click any math formula to copy its LaTeX code)
- Export to Word document (DOCX) with formula formatting preserved (one-click export supported in DeepSeek only)
- Custom watermark support
- Selective sharing of conversation content
  - Choose single or multiple conversation turns
  - One-click select all/deselect all functionality
- Clean and simple interface
- Open source with no ads

## Supported Platforms

| AI Platform | Formula Copy | Word Export | Conversation Screenshot |
|-------------|-------------|-------------|------------------------|
| DeepSeek | ✓ | ✓ | ✓ |
| Doubao | ✓ | Manual copy | ✗ |
| Yuanbao | ✓ | Manual copy | ✗ |
| ChatGPT | ✓ | Manual copy | ✗ |
| Grok | ✓ | Manual copy | ✗ |
| Tongyi | ✓ | Manual copy | ✗ |
| Xunfei Xinghuo | ✓ | Manual copy | ✗ |
| ChatGLM | ✓ | Manual copy | ✗ |
| OpenRouter | ✓ | Manual copy | ✗ |
| Poe | ✓ | Manual copy | ✗ |
| AskManyAI | ✓ | Manual copy | ✗ |
| Wanzhi | ✓ | Manual copy | ✗ |
| Yi Xiao | ✓ | Manual copy | ✗ |
| Bot.n | ✓ | Manual copy | ✗ |
| Zhihu | ✓ | ✗ | ✗ |

## Installation

1. Install from Edge/Chrome Web Store
   - [Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/deepshare/pdccjnppfegekpnhfljbngammgfbcofm)
   - [Chrome Web Store](https://chromewebstore.google.com/detail/omnaecaamcabmnbjnpjpecoaalfgidop)
2. Install from source code:
   - Download and extract the source code
   - Open Edge\Chrome extensions page
   - Enable developer mode
   - Click "Load unpacked"
   - Select the extracted folder
3. **Important Note:** After installation, please refresh any open AI chat pages for the extension to take effect.

## Usage

Prerequisites: Install the extension

1. Visit a supported AI platform (e.g., https://chat.deepseek.com/)
2. Start a new conversation
3. Look for two buttons in the top-right corner:
   - Select button: Enables selection mode to choose conversations
   - Share button: Directly share all conversations
4. In selection mode:
   - Check the conversations you want to share
   - Use "Select All"/"Deselect All" buttons for quick operations
   - Click the share button to generate content for selected conversations
5. Choose sharing format:
   - Screenshot mode: Generates a long image with conversation content (DeepSeek only)
   - Text mode: Plain text containing conversation content
6. Copy or download the generated image and text

## Watermark Settings

Click the settings icon in the top-right corner of the share dialog to:

- Hide the default screenshot watermark
- Customize watermark content

## Contributing

Contributions via Issues and Pull Requests are welcome.

## License

This project is open-sourced under the [CC BY-NC 4.0 License](LICENSE). This means you are free to use and modify the code for non-commercial purposes, but commercial use is prohibited.

## Support the Project

If you find this project helpful, please consider supporting its development:

- ⭐ Star this project
- 📢 Share it with others
- 🐛 Submit bug reports or feature suggestions
- 🧧 Sponsor the project (scan QR code with WeChat)

<img src="icons/sponsor-code.png" alt="donate" width="200"/>

Thank you for your support!