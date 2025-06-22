document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('settingsForm');
    const apiKeyInput = document.getElementById('apiKey');
    const geminiModelSelect = document.getElementById('geminiModel');
    const defaultToneSelect = document.getElementById('defaultTone');
    const maxTokensSelect = document.getElementById('maxTokens');
    const temperatureSelect = document.getElementById('temperature');
    const analyzeAttachmentsCheckbox = document.getElementById('analyzeAttachments');
    const translationLanguageSelect = document.getElementById('translationLanguage');
    const saveBtn = document.getElementById('saveBtn');
    const testBtn = document.getElementById('testBtn');
    const statusDiv = document.getElementById('status');
    const toggleAdvanced = document.getElementById('toggleAdvanced');
    const advancedContent = document.getElementById('advancedContent');

    // Load saved settings
    loadSettings();

    // Advanced settings toggle
    toggleAdvanced.addEventListener('click', function() {
        const isVisible = advancedContent.classList.contains('show');
        advancedContent.classList.toggle('show');
        toggleAdvanced.textContent = isVisible ? 'Advanced Settings ▼' : 'Advanced Settings ▲';
    });

    // Form submission
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        saveSettings();
    });

    // Test API button
    testBtn.addEventListener('click', function() {
        testApiConnection();
    });

    async function loadSettings() {
        try {
            const result = await chrome.storage.sync.get([
                'geminiApiKey',
                'geminiModel',
                'defaultTone',
                'maxTokens',
                'temperature',
                'analyzeAttachments',
                'translationLanguage'
            ]);

            if (result.geminiApiKey) {
                apiKeyInput.value = result.geminiApiKey;
            }
            if (result.geminiModel) {
                geminiModelSelect.value = result.geminiModel;
            }
            if (result.defaultTone) {
                defaultToneSelect.value = result.defaultTone;
            }
            if (result.maxTokens) {
                maxTokensSelect.value = result.maxTokens;
            }
            if (result.temperature) {
                temperatureSelect.value = result.temperature;
            }
            if (result.analyzeAttachments !== undefined) {
                analyzeAttachmentsCheckbox.checked = result.analyzeAttachments;
            }
            if (result.translationLanguage) {
                translationLanguageSelect.value = result.translationLanguage;
            }
        } catch (error) {
            showStatus('Error loading settings', 'error');
        }
    }

    async function saveSettings() {
        const apiKey = apiKeyInput.value.trim();
        
        if (!apiKey) {
            showStatus('Please enter your API key', 'error');
            return;
        }

        try {
            saveBtn.textContent = 'Saving...';
            saveBtn.disabled = true;

            await chrome.storage.sync.set({
                geminiApiKey: apiKey,
                geminiModel: geminiModelSelect.value,
                defaultTone: defaultToneSelect.value,
                maxTokens: parseInt(maxTokensSelect.value),
                temperature: parseFloat(temperatureSelect.value),
                analyzeAttachments: analyzeAttachmentsCheckbox.checked,
                translationLanguage: translationLanguageSelect.value
            });

            showStatus('Settings saved successfully!', 'success');
            
            // Notify content scripts about updated settings
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: 'settingsUpdated'
                    });
                }
            });

        } catch (error) {
            showStatus('Error saving settings: ' + error.message, 'error');
        } finally {
            saveBtn.textContent = 'Save Settings';
            saveBtn.disabled = false;
        }
    }

    async function testApiConnection() {
        const apiKey = apiKeyInput.value.trim();
        
        if (!apiKey) {
            showStatus('Please enter your API key first', 'error');
            return;
        }

        try {
            testBtn.textContent = 'Testing...';
            testBtn.disabled = true;

            const selectedModel = geminiModelSelect.value || 'gemini-1.5-pro';
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: "Hello, this is a test message."
                        }]
                    }]
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.candidates && data.candidates.length > 0) {
                    showStatus('API connection successful!', 'success');
                } else {
                    showStatus('API responded but no content generated', 'error');
                }
            } else {
                const errorData = await response.json();
                showStatus(`API test failed: ${errorData.error?.message || 'Unknown error'}`, 'error');
            }

        } catch (error) {
            showStatus('Connection test failed: ' + error.message, 'error');
        } finally {
            testBtn.textContent = 'Test API';
            testBtn.disabled = false;
        }
    }

    function showStatus(message, type) {
        statusDiv.textContent = message;
        statusDiv.className = `status ${type} show`;
        
        setTimeout(() => {
            statusDiv.classList.remove('show');
        }, 3000);
    }
});