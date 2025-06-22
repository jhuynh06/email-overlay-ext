// Main Email Overlay Class
class EmailOverlay {
    constructor(composeElement, emailContext, platform) {
        this.composeElement = composeElement;
        this.emailContext = emailContext;
        this.platform = platform; // 'gmail' or 'outlook'
        this.overlay = null;
        this.isVisible = false;
        this.isGenerating = false;
        this.settings = {
            selectedModel: 'gemini-1.5-pro',
            selectedTone: 'formal',
            maxTokens: 300,
            temperature: 0.7
        };
        this.geminiService = new GeminiService();
        
        this.init();
    }

    async init() {
        await this.loadSettings();
        this.createOverlay();
        this.attachEventListeners();
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get([
                'geminiModel',
                'defaultTone',
                'maxTokens',
                'temperature'
            ]);
            
            if (result.geminiModel) this.settings.selectedModel = result.geminiModel;
            if (result.defaultTone) this.settings.selectedTone = result.defaultTone;
            if (result.maxTokens) this.settings.maxTokens = result.maxTokens;
            if (result.temperature) this.settings.temperature = result.temperature;
        } catch (error) {
            console.error('Error loading settings:', error);
            // If extension context is invalidated, throw specific error
            if (error.message.includes('Extension context invalidated')) {
                throw new Error('Extension context invalidated - please refresh the page');
            }
        }
    }

    createOverlay() {
        // Create main overlay container
        this.overlay = document.createElement('div');
        this.overlay.className = 'ai-email-overlay';
        this.overlay.setAttribute('data-ai-overlay', 'true');
        
        // Create generate button
        const generateBtn = document.createElement('button');
        generateBtn.className = 'ai-generate-btn';
        generateBtn.textContent = 'Generate Response';
        generateBtn.id = 'ai-generate-btn';
        
        // Create menu button
        const menuBtn = document.createElement('button');
        menuBtn.className = 'ai-menu-btn';
        menuBtn.id = 'ai-menu-btn';
        menuBtn.innerHTML = '<div class="ai-menu-icon"></div>';
        
        // Create dropdown menu
        const dropdownMenu = this.createDropdownMenu();
        
        // Assemble overlay
        this.overlay.appendChild(generateBtn);
        this.overlay.appendChild(menuBtn);
        this.overlay.appendChild(dropdownMenu);
    }

    createDropdownMenu() {
        const menu = document.createElement('div');
        menu.className = 'ai-dropdown-menu';
        menu.id = 'ai-dropdown-menu';
        
        // Tone selection item
        const toneItem = document.createElement('button');
        toneItem.className = 'ai-dropdown-item';
        toneItem.innerHTML = '<span class="icon">📝</span>Response Tone';
        toneItem.id = 'ai-tone-item';
        
        // Create tone submenu
        const toneSubmenu = this.createToneSubmenu();
        toneItem.appendChild(toneSubmenu);
        
        // Summary item
        const summaryItem = document.createElement('button');
        summaryItem.className = 'ai-dropdown-item';
        summaryItem.innerHTML = '<span class="icon">📋</span>Summarize Email';
        summaryItem.id = 'ai-summary-item';
        
        menu.appendChild(toneItem);
        menu.appendChild(summaryItem);
        
        return menu;
    }

    createToneSubmenu() {
        const submenu = document.createElement('div');
        submenu.className = 'ai-tone-submenu';
        submenu.id = 'ai-tone-submenu';
        
        const tones = [
            { value: 'formal', label: 'Formal' },
            { value: 'casual', label: 'Casual' },
            { value: 'brief', label: 'Brief' },
            { value: 'detailed', label: 'Detailed' },
            { value: 'friendly', label: 'Friendly' },
            { value: 'professional', label: 'Professional' }
        ];
        
        tones.forEach(tone => {
            const toneBtn = document.createElement('button');
            toneBtn.className = 'ai-tone-item';
            toneBtn.textContent = tone.label;
            toneBtn.dataset.tone = tone.value;
            
            if (tone.value === this.settings.selectedTone) {
                toneBtn.classList.add('selected');
            }
            
            submenu.appendChild(toneBtn);
        });
        
        return submenu;
    }

    createSummaryModal() {
        const modal = document.createElement('div');
        modal.className = 'ai-summary-modal';
        modal.id = 'ai-summary-modal';
        
        const content = document.createElement('div');
        content.className = 'ai-summary-content';
        
        const header = document.createElement('div');
        header.className = 'ai-summary-header';
        header.innerHTML = `
            <h3>Email Summary</h3>
            <button class="ai-close-btn" id="ai-close-summary">×</button>
        `;
        
        const body = document.createElement('div');
        body.className = 'ai-summary-body';
        body.innerHTML = '<div class="ai-summary-text" id="ai-summary-text">Loading summary...</div>';
        
        content.appendChild(header);
        content.appendChild(body);
        modal.appendChild(content);
        
        return modal;
    }

    attachEventListeners() {
        // Generate button click
        this.overlay.querySelector('#ai-generate-btn').addEventListener('click', () => {
            this.handleGenerateClick();
        });
        
        // Menu button click
        this.overlay.querySelector('#ai-menu-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDropdown();
        });
        
        // Tone selection
        this.overlay.querySelector('#ai-tone-item').addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleToneSubmenu();
        });
        
        // Tone submenu items
        this.overlay.querySelectorAll('.ai-tone-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectTone(e.target.dataset.tone);
            });
        });
        
        // Summary button
        this.overlay.querySelector('#ai-summary-item').addEventListener('click', () => {
            this.showEmailSummary();
            this.hideDropdown();
        });
        
        // Click outside to close dropdown
        document.addEventListener('click', (e) => {
            if (!this.overlay.contains(e.target)) {
                this.hideDropdown();
                this.hideToneSubmenu();
            }
        });
    }

    inject() {
        // Grammarly-style injection: position relative to the compose element itself
        const composeElement = this.composeElement;
        
        // Ensure the compose element has relative positioning
        const computedStyle = window.getComputedStyle(composeElement);
        if (computedStyle.position === 'static') {
            composeElement.style.position = 'relative';
        }
        
        // Create a wrapper if the element doesn't have one
        let wrapper = composeElement.parentElement;
        if (!wrapper || wrapper.tagName === 'BODY') {
            wrapper = document.createElement('div');
            wrapper.style.position = 'relative';
            wrapper.style.display = 'inline-block';
            wrapper.style.width = '100%';
            
            composeElement.parentElement.insertBefore(wrapper, composeElement);
            wrapper.appendChild(composeElement);
        }
        
        // Ensure wrapper has relative positioning
        if (window.getComputedStyle(wrapper).position === 'static') {
            wrapper.style.position = 'relative';
        }
        
        // Inject overlay into the wrapper (like Grammarly does)
        wrapper.appendChild(this.overlay);
        this.isVisible = true;
        
        console.log('Overlay injected into wrapper', wrapper);
    }

    async handleGenerateClick() {
        if (this.isGenerating) return;
        
        const generateBtn = this.overlay.querySelector('#ai-generate-btn');
        
        try {
            this.isGenerating = true;
            generateBtn.innerHTML = '<div class="ai-loading"></div>Generating...';
            generateBtn.classList.add('loading');
            
            // Generate response
            const response = await this.geminiService.generateResponse(
                this.emailContext,
                this.settings.selectedModel,
                this.settings.selectedTone,
                this.settings.maxTokens,
                this.settings.temperature
            );
            
            if (response) {
                // Insert response into compose area
                this.insertResponse(response);
                
                // Update button to show regenerate
                generateBtn.textContent = 'Regenerate';
                generateBtn.classList.remove('loading');
                generateBtn.classList.add('regenerate');
            } else {
                throw new Error('No response generated');
            }
            
        } catch (error) {
            console.error('Error generating response:', error);
            generateBtn.textContent = 'Error - Try Again';
            generateBtn.classList.remove('loading');
            
            setTimeout(() => {
                generateBtn.textContent = 'Generate Response';
            }, 3000);
        } finally {
            this.isGenerating = false;
        }
    }

    insertResponse(response) {
        // Insert new content based on element type
        if (this.composeElement.contentEditable === 'true' || this.composeElement.isContentEditable) {
            // For contenteditable elements
            this.composeElement.innerHTML = response.replace(/\n/g, '<br>');
        } else if (this.composeElement.tagName === 'TEXTAREA' || this.composeElement.tagName === 'INPUT') {
            // For textarea/input elements
            this.composeElement.value = response;
        } else {
            // Fallback for other elements
            this.composeElement.textContent = response;
        }
        
        // Trigger input events to notify the email client
        const inputEvent = new Event('input', { bubbles: true });
        const changeEvent = new Event('change', { bubbles: true });
        const keyupEvent = new Event('keyup', { bubbles: true });
        
        this.composeElement.dispatchEvent(inputEvent);
        this.composeElement.dispatchEvent(changeEvent);
        this.composeElement.dispatchEvent(keyupEvent);
        
        // Focus the compose element
        this.composeElement.focus();
        
        // For Gmail/Outlook, also try to trigger their specific events
        if (this.platform === 'gmail') {
            // Gmail sometimes needs additional events
            const gmailEvent = new Event('focusout', { bubbles: true });
            this.composeElement.dispatchEvent(gmailEvent);
        }
    }

    toggleDropdown() {
        const dropdown = this.overlay.querySelector('#ai-dropdown-menu');
        const menuBtn = this.overlay.querySelector('#ai-menu-btn');
        
        if (dropdown.classList.contains('show')) {
            this.hideDropdown();
        } else {
            dropdown.classList.add('show');
            menuBtn.classList.add('active');
        }
    }

    hideDropdown() {
        const dropdown = this.overlay.querySelector('#ai-dropdown-menu');
        const menuBtn = this.overlay.querySelector('#ai-menu-btn');
        
        dropdown.classList.remove('show');
        menuBtn.classList.remove('active');
        this.hideToneSubmenu();
    }

    toggleToneSubmenu() {
        const submenu = this.overlay.querySelector('#ai-tone-submenu');
        submenu.classList.toggle('show');
    }

    hideToneSubmenu() {
        const submenu = this.overlay.querySelector('#ai-tone-submenu');
        submenu.classList.remove('show');
    }

    selectTone(tone) {
        this.settings.selectedTone = tone;
        
        // Update visual selection
        this.overlay.querySelectorAll('.ai-tone-item').forEach(item => {
            item.classList.remove('selected');
            if (item.dataset.tone === tone) {
                item.classList.add('selected');
            }
        });
        
        this.hideDropdown();
    }

    async showEmailSummary() {
        // Create and show summary modal
        const modal = this.createSummaryModal();
        document.body.appendChild(modal);
        
        // Show modal
        setTimeout(() => modal.classList.add('show'), 10);
        
        // Close button event
        modal.querySelector('#ai-close-summary').addEventListener('click', () => {
            modal.classList.remove('show');
            setTimeout(() => document.body.removeChild(modal), 300);
        });
        
        // Generate summary
        try {
            const summary = await this.geminiService.generateSummary(this.emailContext, this.settings.selectedModel);
            modal.querySelector('#ai-summary-text').innerHTML = summary;
        } catch (error) {
            modal.querySelector('#ai-summary-text').textContent = 'Error generating summary. Please try again.';
        }
    }

    updateSettings() {
        this.loadSettings();
    }

    destroy() {
        if (this.overlay && this.overlay.parentElement) {
            this.overlay.parentElement.removeChild(this.overlay);
        }
        this.isVisible = false;
    }
}

// Gemini API Service
class GeminiService {
    constructor() {
        this.apiKey = null;
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
        this.loadApiKey();
    }

    async loadApiKey() {
        try {
            const result = await chrome.storage.sync.get(['geminiApiKey']);
            this.apiKey = result.geminiApiKey;
        } catch (error) {
            console.error('Error loading API key:', error);
            // If extension context is invalidated, throw specific error
            if (error.message.includes('Extension context invalidated')) {
                throw new Error('Extension context invalidated - please refresh the page');
            }
        }
    }

    async generateResponse(emailContext, model, tone, maxTokens, temperature, analyzeAttachments = false) {
        if (!this.apiKey) {
            await this.loadApiKey();
            if (!this.apiKey) {
                throw new Error('API key not configured');
            }
        }

        const prompt = this.buildResponsePrompt(emailContext, tone, maxTokens, analyzeAttachments);
        
        // Use Flash model for better rate limits and faster responses
        const selectedModel = model || 'gemini-1.5-flash';
        
        return this.makeRequestWithRetry(selectedModel, {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            generationConfig: {
                temperature: temperature,
                maxOutputTokens: Math.min(maxTokens * 4, 1024), // Reduced for Flash model
                topK: 40,
                topP: 0.95
            }
        });
    }

    async makeRequestWithRetry(model, requestBody, maxRetries = 3) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`Gemini API attempt ${attempt}/${maxRetries} with model: ${model}`);
                
                const response = await fetch(`${this.baseUrl}/${model}:generateContent?key=${this.apiKey}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestBody)
                });

                if (response.status === 429) {
                    // Rate limit hit - wait with exponential backoff
                    const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Max 10 seconds
                    console.log(`Rate limit hit, waiting ${waitTime}ms before retry...`);
                    await this.sleep(waitTime);
                    continue;
                }

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`API request failed: ${response.status} - ${errorText}`);
                }

                const data = await response.json();
                
                if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                    return data.candidates[0].content.parts[0].text.trim();
                } else {
                    throw new Error('No response content received');
                }
                
            } catch (error) {
                lastError = error;
                console.error(`Gemini API attempt ${attempt} failed:`, error);
                
                // If it's a 429 error, continue to retry
                if (error.message.includes('429') && attempt < maxRetries) {
                    const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
                    console.log(`Retrying after ${waitTime}ms...`);
                    await this.sleep(waitTime);
                    continue;
                }
                
                // For other errors, don't retry immediately
                if (attempt < maxRetries) {
                    await this.sleep(1000); // Short wait for other errors
                }
            }
        }
        
        throw lastError || new Error('Max retries exceeded');
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async generateSummary(emailContext, model) {
        if (!this.apiKey) {
            await this.loadApiKey();
            if (!this.apiKey) {
                throw new Error('API key not configured');
            }
        }

        const prompt = this.buildSummaryPrompt(emailContext);
        
        // Use Flash model for better rate limits
        const selectedModel = model || 'gemini-1.5-flash';
        
        const response = await this.makeRequestWithRetry(selectedModel, {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 512,
                topK: 20,
                topP: 0.8
            }
        });
        
        return this.formatSummary(response);
    }

    buildResponsePrompt(emailContext, tone, maxTokens, analyzeAttachments = false) {
        let prompt = `You are an AI email assistant. Write a specific email response based on the exact context provided below.\n\n`;
        
        prompt += `CRITICAL INSTRUCTIONS:\n`;
        prompt += `- Only respond to what was actually mentioned in the original email\n`;
        prompt += `- Do NOT make up information or add topics not discussed\n`;
        prompt += `- Use the actual sender's name (no placeholders like [Name])\n`;
        prompt += `- Keep responses focused and concise\n`;
        prompt += `- Do NOT include generic advice unless specifically requested\n\n`;
        
        // Build the email context clearly
        prompt += `EMAIL CONTEXT:\n`;
        
        if (emailContext.senderName && emailContext.senderEmail) {
            prompt += `Sender: ${emailContext.senderName} (${emailContext.senderEmail})\n`;
        } else if (emailContext.senderName) {
            prompt += `Sender: ${emailContext.senderName}\n`;
        } else if (emailContext.senderEmail) {
            prompt += `Sender: ${emailContext.senderEmail}\n`;
        }
        
        if (emailContext.subject) {
            prompt += `Subject: ${emailContext.subject}\n`;
        }
        
        if (emailContext.originalEmail) {
            prompt += `\nOriginal message:\n"${emailContext.originalEmail}"\n\n`;
        } else {
            prompt += `\nThis appears to be a new email composition.\n\n`;
        }
        
        if (analyzeAttachments && emailContext.attachments) {
            prompt += `Attachments mentioned: ${emailContext.attachments}\n\n`;
        }
        
        // Set tone-specific instructions
        let toneInstructions = '';
        switch (tone) {
            case 'formal':
                toneInstructions = 'professional and respectful';
                break;
            case 'casual':
                toneInstructions = 'friendly and conversational';
                break;
            case 'brief':
                toneInstructions = 'concise and direct';
                break;
            case 'detailed':
                toneInstructions = 'comprehensive but focused';
                break;
            case 'friendly':
                toneInstructions = 'warm and personable';
                break;
            case 'professional':
                toneInstructions = 'business-appropriate and competent';
                break;
            default:
                toneInstructions = 'professional';
        }
        
        prompt += `RESPONSE REQUIREMENTS:\n`;
        prompt += `- Write in a ${toneInstructions} tone\n`;
        prompt += `- Address only the specific points mentioned in the original email\n`;
        prompt += `- Use the sender's actual name (${emailContext.senderName || 'the sender'})\n`;
        prompt += `- Keep response under ${Math.floor(maxTokens * 0.75)} words\n`;
        prompt += `- Do not include signature or closing (user will add their own)\n`;
        prompt += `- Be specific and relevant to the actual request\n\n`;
        
        prompt += `Write the email response now:`;
        
        console.log('Generated prompt for Gemini:', prompt);
        
        return prompt;
    }

    buildSummaryPrompt(emailContext) {
        let prompt = `Please provide a concise summary of this email, highlighting key points and any action items:\n\n`;
        
        if (emailContext.subject) {
            prompt += `Subject: ${emailContext.subject}\n`;
        }
        
        if (emailContext.originalEmail) {
            prompt += `Email content:\n${emailContext.originalEmail}\n\n`;
        } else {
            prompt += `This appears to be a new email composition.\n\n`;
        }
        
        prompt += `Please provide:\n`;
        prompt += `1. A brief summary of the main topic\n`;
        prompt += `2. Key points mentioned\n`;
        prompt += `3. Any action items or requests\n`;
        prompt += `4. Important dates or deadlines (if mentioned)\n\n`;
        prompt += `Format the response with <strong> tags around important terms and <span class="highlight"> tags around action items.`;
        
        return prompt;
    }

    formatSummary(summaryText) {
        // Basic formatting to highlight key information
        return summaryText
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{1,2}-\d{1,2}-\d{2,4})/g, '<span class="highlight">$1</span>')
            .replace(/(action|task|todo|deadline|due|urgent|important)/gi, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
    }
}

// Make EmailOverlay available globally for content scripts
window.EmailOverlay = EmailOverlay;