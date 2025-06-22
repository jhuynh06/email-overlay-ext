// Background Service Worker for AI Email Assistant
class BackgroundService {
    constructor() {
        this.init();
    }

    init() {
        // Listen for extension installation
        chrome.runtime.onInstalled.addListener((details) => {
            this.handleInstall(details);
        });

        // Listen for messages from content scripts
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
            return true; // Keep message channel open for async responses
        });

        // Tab updates are handled by manifest content scripts
    }

    handleInstall(details) {
        if (details.reason === 'install') {
            // Set default settings
            chrome.storage.sync.set({
                geminiModel: 'gemini-1.5-flash',
                defaultTone: 'formal',
                maxTokens: 300,
                temperature: 0.7
            });

            // Extension icon will show popup for API key setup
        }
    }

    async handleMessage(message, sender, sendResponse) {
        try {
            switch (message.action) {
                case 'getSettings':
                    const settings = await this.getSettings();
                    sendResponse({ success: true, data: settings });
                    break;

                case 'saveSettings':
                    await this.saveSettings(message.data);
                    sendResponse({ success: true });
                    break;

                case 'testApiKey':
                    const isValid = await this.testApiKey(message.apiKey);
                    sendResponse({ success: true, valid: isValid });
                    break;

                case 'generateResponse':
                    const response = await this.generateResponse(message.data);
                    sendResponse({ success: true, data: response });
                    break;

                case 'generateSummary':
                    const summary = await this.generateSummary(message.data);
                    sendResponse({ success: true, data: summary });
                    break;

                default:
                    sendResponse({ success: false, error: 'Unknown action' });
            }
        } catch (error) {
            console.error('Background script error:', error);
            sendResponse({ success: false, error: error.message });
        }
    }


    async getSettings() {
        return new Promise((resolve) => {
            chrome.storage.sync.get([
                'geminiApiKey',
                'geminiModel',
                'defaultTone',
                'maxTokens',
                'temperature'
            ], (result) => {
                resolve(result);
            });
        });
    }

    async saveSettings(settings) {
        return new Promise((resolve) => {
            chrome.storage.sync.set(settings, () => {
                resolve();
            });
        });
    }

    async testApiKey(apiKey) {
        try {
            // Use Flash model for testing - better rate limits
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: 'Hello'
                            }]
                        }],
                        generationConfig: {
                            maxOutputTokens: 10
                        }
                    })
                }
            );

            if (response.status === 429) {
                // Rate limited but API key works
                return true;
            }

            return response.ok;
        } catch (error) {
            console.error('API key test error:', error);
            return false;
        }
    }

    async generateResponse(data) {
        const settings = await this.getSettings();
        
        if (!settings.geminiApiKey) {
            throw new Error('API key not configured');
        }

        try {
            const selectedModel = settings.geminiModel || 'gemini-1.5-pro';
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${settings.geminiApiKey}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: data.prompt
                            }]
                        }],
                        generationConfig: {
                            temperature: data.temperature || settings.temperature || 0.7,
                            maxOutputTokens: Math.min((data.maxTokens || settings.maxTokens || 300) * 4, 2048)
                        }
                    })
                }
            );

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.candidates && result.candidates[0] && result.candidates[0].content) {
                return result.candidates[0].content.parts[0].text.trim();
            } else {
                throw new Error('No response content received');
            }
        } catch (error) {
            console.error('Generate response error:', error);
            throw error;
        }
    }

    async generateSummary(data) {
        const settings = await this.getSettings();
        
        if (!settings.geminiApiKey) {
            throw new Error('API key not configured');
        }

        try {
            const selectedModel = settings.geminiModel || 'gemini-1.5-pro';
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${settings.geminiApiKey}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: data.prompt
                            }]
                        }],
                        generationConfig: {
                            temperature: 0.3,
                            maxOutputTokens: 500
                        }
                    })
                }
            );

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.candidates && result.candidates[0] && result.candidates[0].content) {
                return result.candidates[0].content.parts[0].text.trim();
            } else {
                throw new Error('No summary content received');
            }
        } catch (error) {
            console.error('Generate summary error:', error);
            throw error;
        }
    }
}

// Initialize background service
new BackgroundService();