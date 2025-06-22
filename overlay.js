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
        }
    }

    async generateResponse(emailContext, model, tone, maxTokens, temperature, analyzeAttachments = false, multimodalAnalysis = false) {
        if (!this.apiKey) {
            await this.loadApiKey();
            if (!this.apiKey) {
                throw new Error('API key not configured');
            }
        }

        let uploadedFiles = [];
        
        // If multimodal analysis is enabled, upload attachments
        if (multimodalAnalysis && analyzeAttachments) {
            console.log('Multimodal analysis enabled - processing attachments...');
            const multimodalService = new MultimodalAttachmentService();
            await multimodalService.setApiKey(this.apiKey);
            uploadedFiles = await multimodalService.extractAndUploadAttachments(emailContext);
            console.log(`Multimodal analysis found ${uploadedFiles.length} uploaded files`);
        }

        const prompt = this.buildResponsePrompt(emailContext, tone, maxTokens, analyzeAttachments, uploadedFiles);
        
        // Use Flash model for better rate limits and faster responses
        const selectedModel = model || 'gemini-1.5-flash';
        
        // Build content parts
        const contentParts = [{ text: prompt }];
        
        // Add uploaded files to content parts
        if (uploadedFiles.length > 0) {
            for (const file of uploadedFiles) {
                if (file.type === 'base64') {
                    contentParts.push({
                        inlineData: {
                            mimeType: file.mimeType,
                            data: file.data
                        }
                    });
                } else if (file.type === 'file_api') {
                    contentParts.push({
                        fileData: {
                            mimeType: file.mimeType,
                            fileUri: file.fileUri
                        }
                    });
                }
            }
        }
        
        return this.makeRequestWithRetry(selectedModel, {
            contents: [{
                parts: contentParts
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

    async generateSummary(emailContext, model, targetLanguage = 'English', analyzeAttachments = false, multimodalAnalysis = false) {
        if (!this.apiKey) {
            await this.loadApiKey();
            if (!this.apiKey) {
                throw new Error('API key not configured');
            }
        }

        let uploadedFiles = [];
        
        // If multimodal analysis is enabled, upload attachments
        if (multimodalAnalysis && analyzeAttachments) {
            console.log('Multimodal analysis enabled for summary - processing attachments...');
            const multimodalService = new MultimodalAttachmentService();
            await multimodalService.setApiKey(this.apiKey);
            uploadedFiles = await multimodalService.extractAndUploadAttachments(emailContext);
            console.log(`Multimodal summary found ${uploadedFiles.length} uploaded files`);
        }

        const prompt = this.buildSummaryPrompt(emailContext, targetLanguage, uploadedFiles);
        
        // Use Flash model for better rate limits
        const selectedModel = model || 'gemini-1.5-flash';
        
        // Build content parts
        const contentParts = [{ text: prompt }];
        
        // Add uploaded files to content parts
        if (uploadedFiles.length > 0) {
            for (const file of uploadedFiles) {
                if (file.type === 'base64') {
                    contentParts.push({
                        inlineData: {
                            mimeType: file.mimeType,
                            data: file.data
                        }
                    });
                } else if (file.type === 'file_api') {
                    contentParts.push({
                        fileData: {
                            mimeType: file.mimeType,
                            fileUri: file.fileUri
                        }
                    });
                }
            }
        }
        
        const response = await this.makeRequestWithRetry(selectedModel, {
            contents: [{
                parts: contentParts
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

    buildResponsePrompt(emailContext, tone, maxTokens, analyzeAttachments = false, uploadedFiles = []) {
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
            prompt += `Attachments mentioned: ${emailContext.attachments}\n`;
        }
        
        if (uploadedFiles && uploadedFiles.length > 0) {
            prompt += `\nUploaded files for analysis (${uploadedFiles.length} files):\n`;
            uploadedFiles.forEach((file, index) => {
                prompt += `${index + 1}. ${file.fileName} (${file.mimeType})\n`;
            });
            prompt += `\nPlease analyze the content of these uploaded files and reference them specifically in your response. Provide insights based on what you can see in the files.\n\n`;
        } else if (analyzeAttachments && emailContext.attachments) {
            prompt += `\n`;
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
        prompt += `- Do NOT include subject line, headers, or email metadata\n`;
        prompt += `- ONLY provide the message body content\n`;
        prompt += `- Be specific and relevant to the actual request\n\n`;
        
        prompt += `Write ONLY the email message body now (no subject, no headers):`;
        
        console.log('Generated prompt for Gemini:', prompt);
        
        return prompt;
    }

    buildSummaryPrompt(emailContext, targetLanguage = 'English', uploadedFiles = []) {
        let prompt = `Please provide a concise summary of this email, highlighting key points and any action items:\n\n`;
        
        if (emailContext.subject) {
            prompt += `Subject: ${emailContext.subject}\n`;
        }
        
        if (emailContext.originalEmail) {
            prompt += `Email content:\n${emailContext.originalEmail}\n\n`;
        } else {
            prompt += `This appears to be a new email composition.\n\n`;
        }
        
        if (uploadedFiles && uploadedFiles.length > 0) {
            prompt += `Attached files for analysis (${uploadedFiles.length} files):\n`;
            uploadedFiles.forEach((file, index) => {
                prompt += `${index + 1}. ${file.fileName} (${file.mimeType})\n`;
            });
            prompt += `\nPlease analyze the content of these attached files and include insights from them in your summary.\n\n`;
        }
        
        prompt += `Please provide:\n`;
        prompt += `1. A brief summary of the main topic\n`;
        prompt += `2. Key points mentioned\n`;
        prompt += `3. Any action items or requests\n`;
        prompt += `4. Important dates or deadlines (if mentioned)\n\n`;
        prompt += `Format the response with <strong> tags around important terms and <span class="highlight"> tags around action items.`;
        
        return prompt;
    }

    async translateEmail(emailContext, model, targetLanguage = 'English') {
        if (!this.apiKey) {
            await this.loadApiKey();
            if (!this.apiKey) {
                throw new Error('API key not configured');
            }
        }

        const prompt = this.buildTranslationPrompt(emailContext, targetLanguage);
        
        // Use Flash model for better rate limits
        const selectedModel = model || 'gemini-1.5-flash';
        
        return this.makeRequestWithRetry(selectedModel, {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 1024,
                topK: 20,
                topP: 0.8
            }
        });
    }

    buildTranslationPrompt(emailContext, targetLanguage) {
        let prompt = `Please translate the following email content to ${targetLanguage}. Maintain the original tone and meaning.\n\n`;
        
        if (emailContext.subject) {
            prompt += `Subject: ${emailContext.subject}\n`;
        }
        
        if (emailContext.originalEmail) {
            prompt += `Email content:\n${emailContext.originalEmail}\n\n`;
        } else {
            prompt += `This appears to be a new email composition.\n\n`;
        }
        
        prompt += `Please provide a natural translation that preserves the original meaning and tone. Format the response as:\n`;
        prompt += `Subject: [translated subject]\n`;
        prompt += `Body: [translated email body]`;
        
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

// Multimodal Attachment Service
class MultimodalAttachmentService {
    constructor() {
        this.apiKey = null;
        this.uploadedFiles = [];
        this.maxFileSize = 20 * 1024 * 1024; // 20MB limit for direct upload
        this.maxFileCount = 10; // Gemini API limit
    }

    async setApiKey(apiKey) {
        this.apiKey = apiKey;
    }

    async extractAndUploadAttachments(emailContext) {
        try {
            console.log('Starting multimodal attachment extraction...');
            
            const attachments = await this.findGmailAttachments();
            console.log(`Found ${attachments.length} attachments for multimodal analysis`);
            
            if (attachments.length === 0) {
                return [];
            }

            const uploadedFiles = [];
            const maxToProcess = Math.min(attachments.length, this.maxFileCount);
            
            for (let i = 0; i < maxToProcess; i++) {
                const attachment = attachments[i];
                try {
                    console.log(`Processing attachment ${i + 1}: ${attachment.fileName}`);
                    
                    const fileData = await this.downloadAttachment(attachment);
                    if (fileData) {
                        const uploadedFile = await this.uploadToGemini(fileData, attachment);
                        if (uploadedFile) {
                            uploadedFiles.push(uploadedFile);
                            console.log(`Successfully uploaded: ${attachment.fileName}`);
                        }
                    }
                } catch (error) {
                    console.warn(`Failed to process attachment ${attachment.fileName}:`, error);
                }
            }
            
            console.log(`Successfully uploaded ${uploadedFiles.length} out of ${maxToProcess} attachments`);
            return uploadedFiles;
            
        } catch (error) {
            console.error('Multimodal attachment extraction failed:', error);
            return [];
        }
    }

    async findGmailAttachments() {
        const attachments = [];
        
        try {
            // Method 1: Look for attachment download links
            const downloadLinks = document.querySelectorAll('a[download], span[role="link"][data-tooltip*="Download"], span[data-tooltip*="Download"]');
            
            for (const link of downloadLinks) {
                const fileName = link.getAttribute('download') || 
                               link.getAttribute('data-tooltip') || 
                               link.textContent?.trim();
                
                if (fileName && this.isSupportedFileType(fileName)) {
                    const attachment = {
                        fileName: fileName,
                        element: link,
                        type: 'download_link',
                        url: link.getAttribute('href') || link.getAttribute('data-action-url')
                    };
                    attachments.push(attachment);
                }
            }

            // Method 2: Look for Gmail attachment containers
            const attachmentElements = document.querySelectorAll('.aZo, .aQy, [aria-label*="attachment"], [data-tooltip*="attachment"]');
            
            for (const element of attachmentElements) {
                const fileName = this.extractFileNameFromElement(element);
                if (fileName && this.isSupportedFileType(fileName)) {
                    const downloadLink = element.querySelector('a[download], a[href]') || 
                                       element.closest('a[download], a[href]');
                    
                    if (downloadLink && !attachments.some(a => a.fileName === fileName)) {
                        const attachment = {
                            fileName: fileName,
                            element: element,
                            type: 'attachment_element',
                            url: downloadLink.getAttribute('href') || downloadLink.getAttribute('download')
                        };
                        attachments.push(attachment);
                    }
                }
            }

            // Method 3: Look for inline images that could be attachments
            const inlineImages = document.querySelectorAll('img[src*="mail.google.com"], img[src*="attachment"], img[src*="ci"]');
            
            for (const img of inlineImages) {
                const src = img.getAttribute('src');
                const alt = img.getAttribute('alt') || 'image';
                
                if (src && (src.includes('attachment') || src.includes('ci')) && !attachments.some(a => a.fileName.includes(alt))) {
                    const attachment = {
                        fileName: `${alt}.jpg`,
                        element: img,
                        type: 'inline_image',
                        url: src
                    };
                    attachments.push(attachment);
                }
            }

        } catch (error) {
            console.error('Error finding Gmail attachments:', error);
        }

        return attachments;
    }

    extractFileNameFromElement(element) {
        // Try multiple methods to extract filename
        const text = element.textContent || 
                    element.getAttribute('aria-label') || 
                    element.getAttribute('data-tooltip') || 
                    element.getAttribute('title');
        
        if (text) {
            // Look for filename patterns
            const fileMatch = text.match(/([^\/\\]+\.(pdf|doc|docx|txt|jpg|jpeg|png|gif|csv|xlsx?|pptx?|mp4|mp3|wav))/gi);
            if (fileMatch && fileMatch.length > 0) {
                return fileMatch[0];
            }
        }
        
        return null;
    }

    isSupportedFileType(fileName) {
        const supportedExtensions = [
            'pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png', 'gif', 
            'csv', 'xls', 'xlsx', 'ppt', 'pptx', 'mp4', 'mp3', 'wav'
        ];
        
        const extension = fileName.split('.').pop()?.toLowerCase();
        return supportedExtensions.includes(extension);
    }

    async downloadAttachment(attachment) {
        try {
            console.log(`Attempting to download: ${attachment.fileName}`);
            
            if (attachment.type === 'inline_image' && attachment.url.startsWith('data:')) {
                // Handle data URLs directly
                return this.processDataUrl(attachment.url, attachment.fileName);
            }
            
            if (attachment.url && !attachment.url.startsWith('javascript:')) {
                // Try to fetch the file directly
                try {
                    const response = await fetch(attachment.url, {
                        credentials: 'same-origin',
                        headers: {
                            'Accept': '*/*'
                        }
                    });
                    
                    if (response.ok) {
                        const blob = await response.blob();
                        if (blob.size > 0 && blob.size <= this.maxFileSize) {
                            return {
                                blob: blob,
                                fileName: attachment.fileName,
                                mimeType: blob.type || this.getMimeType(attachment.fileName)
                            };
                        }
                    }
                } catch (fetchError) {
                    console.warn(`Direct fetch failed for ${attachment.fileName}:`, fetchError);
                }
            }

            // Alternative: Try to trigger download and capture
            return await this.triggerDownloadAndCapture(attachment);
            
        } catch (error) {
            console.error(`Error downloading ${attachment.fileName}:`, error);
            return null;
        }
    }

    processDataUrl(dataUrl, fileName) {
        try {
            const response = fetch(dataUrl);
            const blob = response.blob();
            return {
                blob: blob,
                fileName: fileName,
                mimeType: this.getMimeType(fileName)
            };
        } catch (error) {
            console.error('Error processing data URL:', error);
            return null;
        }
    }

    async triggerDownloadAndCapture(attachment) {
        return new Promise((resolve, reject) => {
            // This is a fallback method - try to simulate user interaction
            console.log(`Attempting alternative download for: ${attachment.fileName}`);
            
            if (attachment.element && attachment.element.click) {
                // Create a temporary download listener
                const downloadListener = (downloadItem) => {
                    if (downloadItem.filename.includes(attachment.fileName) || 
                        attachment.fileName.includes(downloadItem.filename)) {
                        
                        // Cancel the download to prevent saving to disk
                        chrome.downloads.cancel(downloadItem.id);
                        
                        // Try to get the blob data
                        // Note: This is limited by browser security policies
                        resolve(null); // For now, return null if we can't access the data
                    }
                };
                
                if (chrome.downloads && chrome.downloads.onCreated) {
                    chrome.downloads.onCreated.addListener(downloadListener);
                    
                    // Clean up listener after timeout
                    setTimeout(() => {
                        chrome.downloads.onCreated.removeListener(downloadListener);
                        resolve(null);
                    }, 5000);
                    
                    // Try to trigger download
                    try {
                        attachment.element.click();
                    } catch (clickError) {
                        chrome.downloads.onCreated.removeListener(downloadListener);
                        resolve(null);
                    }
                } else {
                    resolve(null);
                }
            } else {
                resolve(null);
            }
        });
    }

    getMimeType(fileName) {
        const extension = fileName.split('.').pop()?.toLowerCase();
        const mimeTypes = {
            'pdf': 'application/pdf',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'txt': 'text/plain',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'csv': 'text/csv',
            'xls': 'application/vnd.ms-excel',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'ppt': 'application/vnd.ms-powerpoint',
            'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'mp4': 'video/mp4',
            'mp3': 'audio/mpeg',
            'wav': 'audio/wav'
        };
        
        return mimeTypes[extension] || 'application/octet-stream';
    }

    async uploadToGemini(fileData, attachment) {
        try {
            if (!this.apiKey) {
                throw new Error('API key not set');
            }

            console.log(`Uploading ${attachment.fileName} to Gemini...`);
            
            // For small files, use direct base64 upload
            if (fileData.blob.size <= 4 * 1024 * 1024) { // 4MB threshold
                return await this.uploadViaBase64(fileData, attachment);
            } else {
                // For larger files, use Gemini File API
                return await this.uploadViaFileAPI(fileData, attachment);
            }
            
        } catch (error) {
            console.error(`Error uploading ${attachment.fileName} to Gemini:`, error);
            return null;
        }
    }

    async uploadViaBase64(fileData, attachment) {
        try {
            const base64Data = await this.blobToBase64(fileData.blob);
            
            return {
                type: 'base64',
                fileName: attachment.fileName,
                mimeType: fileData.mimeType,
                data: base64Data,
                size: fileData.blob.size
            };
            
        } catch (error) {
            console.error('Base64 conversion failed:', error);
            return null;
        }
    }

    async uploadViaFileAPI(fileData, attachment) {
        try {
            // Step 1: Initialize upload
            const initResponse = await fetch(`https://generativelanguage.googleapis.com/upload/v1beta/files?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Upload-Protocol': 'resumable',
                    'X-Goog-Upload-Command': 'start',
                    'X-Goog-Upload-Header-Content-Length': fileData.blob.size.toString(),
                    'X-Goog-Upload-Header-Content-Type': fileData.mimeType
                },
                body: JSON.stringify({
                    file: {
                        displayName: attachment.fileName,
                        mimeType: fileData.mimeType
                    }
                })
            });

            if (!initResponse.ok) {
                throw new Error(`Upload initialization failed: ${initResponse.status}`);
            }

            const uploadUrl = initResponse.headers.get('X-Goog-Upload-URL');
            if (!uploadUrl) {
                throw new Error('No upload URL received');
            }

            // Step 2: Upload file data
            const uploadResponse = await fetch(uploadUrl, {
                method: 'POST',
                headers: {
                    'Content-Length': fileData.blob.size.toString(),
                    'X-Goog-Upload-Offset': '0',
                    'X-Goog-Upload-Command': 'upload, finalize'
                },
                body: fileData.blob
            });

            if (!uploadResponse.ok) {
                throw new Error(`File upload failed: ${uploadResponse.status}`);
            }

            const result = await uploadResponse.json();
            
            // Step 3: Wait for processing
            await this.waitForFileProcessing(result.file.name);

            return {
                type: 'file_api',
                fileName: attachment.fileName,
                mimeType: fileData.mimeType,
                fileUri: result.file.uri,
                name: result.file.name,
                size: fileData.blob.size
            };

        } catch (error) {
            console.error('File API upload failed:', error);
            return null;
        }
    }

    async blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                // Remove data URL prefix to get pure base64
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    async waitForFileProcessing(fileName, maxWaitTime = 30000) {
        const startTime = Date.now();
        const pollInterval = 2000;
        
        while (Date.now() - startTime < maxWaitTime) {
            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${this.apiKey}`);
                
                if (response.ok) {
                    const fileInfo = await response.json();
                    console.log(`File ${fileName} state: ${fileInfo.state}`);
                    
                    if (fileInfo.state === 'ACTIVE') {
                        return true;
                    } else if (fileInfo.state === 'FAILED') {
                        throw new Error(`File processing failed for ${fileName}`);
                    }
                }
                
                await new Promise(resolve => setTimeout(resolve, pollInterval));
            } catch (error) {
                console.warn(`Error checking file status: ${error.message}`);
                await new Promise(resolve => setTimeout(resolve, pollInterval));
            }
        }
        
        throw new Error(`File processing timeout for ${fileName}`);
    }
}

// Make EmailOverlay available globally for content scripts
window.EmailOverlay = EmailOverlay;
window.MultimodalAttachmentService = MultimodalAttachmentService;