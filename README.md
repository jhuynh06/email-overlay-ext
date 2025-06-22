# AI Email Assistant Chrome Extension

A powerful Chrome extension that provides AI-powered email assistance using Google's Gemini API. Features a Grammarly-like overlay interface that appears when composing emails in Gmail and Microsoft Outlook, offering intelligent response generation, email analysis, and multimodal attachment processing.

## 🚀 Features

### Core Functionality
- **Smart Email Response Generation**: Create contextual email replies based on original email content and chosen tone
- **Email Analysis & Summarization**: Intelligent analysis with formatted summaries, key points, and action items
- **Universal Text Detection**: Focus-based overlay injection that works seamlessly across email platforms
- **Multimodal Attachment Analysis**: Download and analyze email attachments (PDFs, images, documents) for comprehensive context

### Advanced Capabilities
- **Multiple Response Tones**: Formal, casual, brief, detailed, friendly, and professional options
- **Attachment Processing**: Full content analysis of PDFs, documents, images, and spreadsheets
- **Translation Framework**: Ready-to-implement translation system with language selection
- **Settings Persistence**: All user preferences saved across browser sessions
- **Rate Limit Handling**: Robust error handling with exponential backoff retry logic

## 🎯 Supported Platforms

- **Gmail**: `mail.google.com`
- **Outlook Web**: `outlook.live.com`, `outlook.office.com`

## 📋 Prerequisites

- Chrome browser (Manifest V3 compatible)
- Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

## 🛠️ Installation

### Method 1: Load Unpacked (Development)

1. **Download the Extension**
   ```bash
   git clone <repository-url>
   cd overlay-extension
   ```

2. **Open Chrome Extensions**
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top right corner

3. **Load the Extension**
   - Click "Load unpacked"
   - Select the `overlay-extension` folder
   - The extension icon will appear in your browser toolbar

### Method 2: Install from Chrome Web Store
*Coming soon - extension pending review*

## ⚙️ Configuration

### 1. Get Google Gemini API Key
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the API key for configuration

### 2. Configure Extension Settings
1. Click the extension icon in your browser toolbar
2. Enter your Google Gemini API key
3. Configure your preferences:
   - **Model Selection**: Choose between Gemini 1.5 Flash (fast) or Pro (best quality)
   - **Default Tone**: Set your preferred response style
   - **Response Length**: Short, medium, or long responses
   - **Creativity Level**: Conservative, balanced, or creative
   - **Advanced Features**: Enable attachment analysis and multimodal processing

4. Click "Test API" to verify your connection
5. Click "Save Settings" to store your configuration

## 🎮 How to Use

### Basic Email Response Generation

1. **Open Gmail or Outlook** in your browser
2. **Reply to an email** or compose a new message
3. **Click in the compose area** - the AI overlay will appear automatically
4. **Click "Generate"** to create an AI-powered response
5. **Customize settings** by clicking the menu button (⋯) to select different actions

### Advanced Features

#### Multimodal Attachment Analysis
1. Enable "Analyze Email Attachments" in extension settings
2. Enable "Full Multimodal Analysis (Beta)" for complete attachment processing
3. When replying to emails with attachments, the AI will:
   - Download and analyze PDF documents, images, spreadsheets
   - Reference specific content from attachments in responses
   - Provide insights based on actual file contents

#### Email Analysis & Summarization
1. Click the menu button (⋯) in the overlay
2. Select "Analyze & Summarize Email"
3. Click "Generate" to receive:
   - Brief summary of main topics
   - Key points and action items
   - Important dates and deadlines
   - Insights from attachments (if enabled)

#### Response Tone Customization
Choose from multiple response tones:
- **Formal**: Professional and respectful
- **Casual**: Friendly and conversational
- **Brief**: Concise and direct
- **Detailed**: Comprehensive but focused
- **Friendly**: Warm and personable
- **Professional**: Business-appropriate

## 🏗️ Technical Architecture

### Extension Structure
```
overlay-extension/
├── manifest.json           # Chrome Extension Manifest V3
├── popup.html/js          # Settings UI with gradient design
├── background.js          # Service worker for API calls
├── overlay.js             # Core overlay logic & Gemini service
├── overlay.css            # Grammarly-style positioning & styling
├── content-gmail.js       # Gmail-specific integration
├── content-outlook.js     # Outlook-specific integration
└── icons/                 # Extension icons
```

### Key Components

#### 1. Universal Email Assistant (`content-gmail.js`)
- Focus-based text detection similar to Grammarly
- Intelligent email context filtering
- Dynamic overlay creation and positioning
- Email context extraction and processing

#### 2. Gemini API Service (`overlay.js`)
- **GeminiService**: Core AI interaction with retry logic
- **MultimodalAttachmentService**: Advanced attachment processing
- Rate limit handling with exponential backoff
- Support for both base64 and File API uploads

#### 3. Settings Management (`popup.js`)
- Chrome storage sync integration
- Dependency validation (multimodal requires attachments)
- Real-time API testing and validation

## 🔧 Development

### Prerequisites
- Node.js (for syntax checking)
- Git (for version control)

### Development Commands
```bash
# Check JavaScript syntax
node -c *.js

# Load extension in Chrome
# Navigate to chrome://extensions/ → Developer mode → Load unpacked

# Debug console logging
# Check browser console for detailed operation logs
```

### Project Scripts
```bash
# Syntax validation
npm run lint      # If package.json exists

# Manual syntax check
node -c overlay.js
node -c content-gmail.js
node -c popup.js
```

## 🔒 Privacy & Security

### Data Handling
- **API Key Storage**: Securely stored using Chrome's sync storage
- **Email Content**: Only sent to Google's Gemini API for processing
- **No Third-Party Storage**: No data stored or transmitted to other services
- **HTTPS Encryption**: All communication uses secure HTTPS

### Permissions Required
- `storage`: Save user settings and API key
- `activeTab`: Access current tab for content injection
- `scripting`: Execute content scripts
- `downloads`: Handle email attachment processing
- Host permissions for Gmail, Outlook, and Gemini API

### Security Best Practices
- API keys stored locally only
- Content scripts isolated per domain
- No external data transmission beyond Gemini API
- Secure attachment processing with size limits

## 🐛 Troubleshooting

### Extension Not Working
- ✅ Verify extension is enabled in `chrome://extensions/`
- ✅ Check API key is correctly entered in popup settings
- ✅ Try refreshing the Gmail/Outlook page
- ✅ Check browser console for error messages

### Overlay Not Appearing
- ✅ Ensure you're on a supported platform (Gmail/Outlook)
- ✅ Try clicking "Reply" or "Compose" to trigger injection
- ✅ Check if other extensions are interfering
- ✅ Verify you're clicking in the message compose area

### API Errors
- ✅ Test API key using "Test API" button in settings
- ✅ Check internet connection stability
- ✅ Verify available API quota in Google Cloud Console
- ✅ Try regenerating API key if persistent issues

### Attachment Processing Issues
- ✅ Ensure "Analyze Email Attachments" is enabled
- ✅ Check file size limits (20MB maximum)
- ✅ Verify supported file types (PDF, DOC, images, etc.)
- ✅ Check browser console for attachment processing logs

## 📈 Performance

### Optimization Features
- **Gemini Flash Model**: Default for faster responses and better rate limits
- **Intelligent Caching**: Reduces redundant API calls
- **Lazy Loading**: Components loaded only when needed
- **Error Recovery**: Automatic retry with exponential backoff

### Rate Limit Management
- Exponential backoff for 429 errors
- Automatic model fallback options
- Request queue management
- Smart retry logic with maximum attempts

## 🚧 Roadmap

### Planned Features
- [ ] Additional email provider support
- [ ] Custom prompt templates
- [ ] Response quality feedback system
- [ ] Offline mode capabilities
- [ ] Advanced attachment type support
- [ ] Integration with other AI models

### Translation System
- Framework implemented and ready
- Language selection UI complete
- Awaiting full translation feature activation

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly in Chrome
5. Submit a pull request

### Code Style
- Follow existing JavaScript patterns
- Use meaningful variable names
- Add console logging for debugging
- Maintain Chrome extension best practices

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Google Gemini API** for powerful AI capabilities
- **Chrome Extensions Platform** for robust extension framework
- **Gmail & Outlook** for email platform integration
- **Grammarly** for overlay design inspiration

## 📞 Support

### Getting Help
- Check the [Troubleshooting](#-troubleshooting) section
- Review browser console logs for detailed error information
- Create an issue in the project repository

### Feedback
- Feature requests welcome via GitHub issues
- Bug reports with detailed reproduction steps appreciated
- Performance feedback helps improve the extension

---

**Made with ❤️ for productive email communication**

*This extension helps you craft better emails faster with the power of AI.*