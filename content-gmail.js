// Universal Text Field Overlay - Works like Grammarly
class UniversalEmailAssistant {
    constructor() {
        this.activeButton = null;
        this.activeElement = null;
        this.geminiService = new GeminiService();
        
        console.log('Email Assistant: Initializing...');
        this.init();
    }

    init() {
        // Listen for focus events on any text input
        document.addEventListener('focusin', this.onFocusIn.bind(this));
        document.addEventListener('focusout', this.onFocusOut.bind(this));
        
        // Also listen for clicks to catch late-loading elements
        document.addEventListener('click', this.onClickCapture.bind(this), true);
        
        console.log('Email Assistant: Event listeners attached');
    }

    onFocusIn(event) {
        const el = event.target;
        console.log('Focus in:', el);
        
        if (this.isTextInput(el) && this.isEmailContext(el)) {
            console.log('Email Assistant: Text input detected', el);
            this.showOverlay(el);
        }
    }

    onFocusOut(event) {
        // Delay hiding to allow clicking on the button
        setTimeout(() => {
            if (this.activeButton && !this.activeButton.matches(':hover')) {
                this.hideOverlay();
            }
        }, 200);
    }

    onClickCapture(event) {
        const el = event.target;
        // Handle dynamically created elements
        if (this.isTextInput(el) && this.isEmailContext(el) && !this.activeButton) {
            setTimeout(() => {
                if (document.activeElement === el) {
                    this.showOverlay(el);
                }
            }, 100);
        }
    }

    isTextInput(element) {
        if (!element) return false;
        
        // Check for various text input types
        const isInput = element.matches('textarea, input[type="text"], input[type="email"]');
        const isContentEditable = element.contentEditable === 'true' || 
                                  element.getAttribute('contenteditable') === 'true';
        const hasRole = element.getAttribute('role') === 'textbox';
        
        return isInput || isContentEditable || hasRole;
    }

    isEmailContext(element) {
        if (!element) return false;
        
        // Check if we're in Gmail or Outlook
        const isGmail = window.location.hostname.includes('mail.google.com');
        const isOutlook = window.location.hostname.includes('outlook');
        
        if (!isGmail && !isOutlook) return false;
        
        // Check element properties for email indicators
        const text = element.textContent || '';
        const placeholder = element.getAttribute('placeholder') || '';
        const ariaLabel = element.getAttribute('aria-label') || '';
        const className = element.className || '';
        
        // Look for email-related keywords
        const emailKeywords = [
            'compose', 'reply', 'message', 'email', 'editable', 'body'
        ];
        
        const hasEmailKeyword = emailKeywords.some(keyword => 
            placeholder.toLowerCase().includes(keyword) ||
            ariaLabel.toLowerCase().includes(keyword) ||
            className.toLowerCase().includes(keyword)
        );
        
        // Check if it's in a compose dialog
        const inComposeDialog = element.closest('[role="dialog"]') ||
                               element.closest('.nH') ||  // Gmail
                               element.closest('.M9') ||  // Gmail compose
                               element.closest('[data-app-section="Compose"]'); // Outlook
        
        // Must be reasonably sized (email compose areas are big)
        const rect = element.getBoundingClientRect();
        const isReasonableSize = rect.width > 200 && rect.height > 50;
        
        const isEmailField = hasEmailKeyword || inComposeDialog || isReasonableSize;
        
        console.log('Email context check:', {
            element,
            hasEmailKeyword,
            inComposeDialog,
            isReasonableSize,
            isEmailField
        });
        
        return isEmailField;
    }

    showOverlay(textElement) {
        console.log('Email Assistant: Showing overlay for', textElement);
        
        // Remove existing overlay
        this.hideOverlay();
        
        this.activeElement = textElement;
        this.createOverlayButton(textElement);
        this.positionButton(textElement);
        
        // Monitor for element changes
        this.monitorElement(textElement);
    }

    createOverlayButton(textElement) {
        // Create main container
        this.activeButton = document.createElement('div');
        this.activeButton.className = 'ai-email-assistant-overlay';
        this.activeButton.setAttribute('data-ai-overlay', 'true');
        
        // Create generate button
        const generateBtn = document.createElement('button');
        generateBtn.className = 'ai-generate-btn';
        generateBtn.textContent = 'Generate';
        generateBtn.onclick = () => this.handleGenerateClick(textElement);
        
        // Create menu button  
        const menuBtn = document.createElement('button');
        menuBtn.className = 'ai-menu-btn';
        menuBtn.innerHTML = '⋯';
        menuBtn.onclick = () => this.handleMenuClick();
        
        // Assemble overlay
        this.activeButton.appendChild(generateBtn);
        this.activeButton.appendChild(menuBtn);
        
        // Apply styles directly (in case CSS doesn't load)
        this.activeButton.style.cssText = `
            position: absolute !important;
            z-index: 2147483647 !important;
            display: flex !important;
            gap: 6px !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            pointer-events: auto !important;
        `;
        
        generateBtn.style.cssText = `
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
            color: white !important;
            border: none !important;
            border-radius: 16px !important;
            padding: 6px 12px !important;
            cursor: pointer !important;
            font-size: 12px !important;
            font-weight: 600 !important;
            height: 28px !important;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15) !important;
            outline: none !important;
        `;
        
        menuBtn.style.cssText = `
            background: rgba(255, 255, 255, 0.95) !important;
            border: 1px solid rgba(0, 0, 0, 0.08) !important;
            border-radius: 50% !important;
            width: 28px !important;
            height: 28px !important;
            cursor: pointer !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            font-size: 14px !important;
            color: #666 !important;
            outline: none !important;
        `;
        
        // Add to page
        document.body.appendChild(this.activeButton);
    }

    positionButton(textElement) {
        if (!this.activeButton || !textElement) return;
        
        const rect = textElement.getBoundingClientRect();
        const scrollX = window.scrollX || window.pageXOffset;
        const scrollY = window.scrollY || window.pageYOffset;
        
        // Position in bottom-right corner like Grammarly
        const top = rect.bottom + scrollY - 36; // 36px from bottom
        const left = rect.right + scrollX - 80;  // 80px from right
        
        this.activeButton.style.top = Math.max(0, top) + 'px';
        this.activeButton.style.left = Math.max(0, left) + 'px';
        
        console.log('Positioned overlay at:', { top, left, rect });
    }

    hideOverlay() {
        if (this.activeButton) {
            this.activeButton.remove();
            this.activeButton = null;
        }
        if (this.overlayInstance) {
            this.overlayInstance.destroy();
            this.overlayInstance = null;
        }
        this.activeElement = null;
    }

    monitorElement(textElement) {
        // Reposition on scroll/resize
        const handleReposition = () => {
            if (this.activeButton && document.contains(textElement)) {
                this.positionButton(textElement);
            } else {
                this.hideOverlay();
            }
        };
        
        window.addEventListener('scroll', handleReposition);
        window.addEventListener('resize', handleReposition);
        
        // Clean up when element is removed
        const checkElement = () => {
            if (!document.contains(textElement)) {
                this.hideOverlay();
                return;
            }
            setTimeout(checkElement, 1000);
        };
        setTimeout(checkElement, 1000);
    }

    async handleGenerateClick(textElement) {
        console.log('Generate button clicked');
        
        const generateBtn = this.activeButton.querySelector('.ai-generate-btn');
        const originalText = generateBtn.textContent;
        
        try {
            generateBtn.textContent = 'Processing...';
            generateBtn.style.opacity = '0.7';
            
            // Extract email context
            const emailContext = this.extractEmailContext(textElement);
            
            // Create overlay instance if needed
            if (!this.overlayInstance) {
                try {
                    this.overlayInstance = new EmailOverlay(textElement, emailContext, 'gmail');
                } catch (error) {
                    if (error.message.includes('Extension context invalidated')) {
                        console.log('Extension context invalidated during overlay creation - reloading page...');
                        window.location.reload();
                        return;
                    }
                    throw error;
                }
            }

            // Load all settings
            let settings = { 
                geminiModel: 'gemini-1.5-flash', 
                defaultTone: 'formal', 
                analyzeAttachments: false 
            };
            let assistantOptions = {
                generateResponse: true,
                analyzeEmail: false,
                translateEmail: false
            };
            
            try {
                const stored = await chrome.storage.sync.get([
                    'geminiModel', 'defaultTone', 'maxTokens', 'temperature', 
                    'analyzeAttachments', 'assistantOptions'
                ]);
                settings = { ...settings, ...stored };
                assistantOptions = stored.assistantOptions || assistantOptions;
            } catch (e) {
                console.warn('Could not load settings, using defaults:', e.message);
                // If extension context is invalidated, reload the page
                if (e.message.includes('Extension context invalidated')) {
                    console.log('Extension context invalidated - reloading page...');
                    window.location.reload();
                    return;
                }
            }

            console.log('Assistant options:', assistantOptions);
            console.log('Sending context to Gemini:', emailContext);

            let results = [];
            
            // Perform selected actions - each independently with error handling
            if (assistantOptions.generateResponse) {
                try {
                    console.log('Starting response generation...');
                    const response = await this.geminiService.generateResponse(
                        emailContext,
                        settings.geminiModel || 'gemini-1.5-flash',
                        settings.defaultTone || 'formal',
                        settings.maxTokens || 300,
                        settings.temperature || 0.7,
                        settings.analyzeAttachments || false
                    );
                    
                    if (response) {
                        this.insertResponse(textElement, response);
                        results.push('Response generated');
                        console.log('Response generation completed');
                    }
                } catch (error) {
                    console.error('Response generation failed:', error);
                    if (error.message.includes('Extension context invalidated') || error.message.includes('please refresh')) {
                        console.log('Extension context invalidated during response generation - reloading page...');
                        window.location.reload();
                        return;
                    }
                    results.push('Response generation failed');
                }
            }
            
            if (assistantOptions.analyzeEmail) {
                try {
                    console.log('Starting email analysis...');
                    const analysis = await this.geminiService.generateSummary(
                        emailContext,
                        settings.geminiModel || 'gemini-1.5-flash'
                    );
                    
                    if (analysis) {
                        this.showAnalysisModal(analysis);
                        results.push('Email analyzed');
                        console.log('Email analysis completed');
                    }
                } catch (error) {
                    console.error('Email analysis failed:', error);
                    if (error.message.includes('Extension context invalidated') || error.message.includes('please refresh')) {
                        console.log('Extension context invalidated during email analysis - reloading page...');
                        window.location.reload();
                        return;
                    }
                    results.push('Email analysis failed');
                }
            }
            
            if (assistantOptions.translateEmail) {
                try {
                    console.log('Starting translation...');
                    this.showTranslationPlaceholder();
                    results.push('Translation (coming soon)');
                } catch (error) {
                    console.error('Translation failed:', error);
                }
            }
            
            // Update button text based on results
            if (results.length > 0) {
                generateBtn.textContent = 'Regenerate';
                console.log('Completed actions:', results);
            } else {
                generateBtn.textContent = 'No actions selected';
                setTimeout(() => {
                    generateBtn.textContent = originalText;
                }, 2000);
            }
            
        } catch (error) {
            console.error('Generate error:', error);
            generateBtn.textContent = 'Error - Try Again';
            setTimeout(() => {
                generateBtn.textContent = originalText;
            }, 2000);
        } finally {
            generateBtn.style.opacity = '1';
        }
    }

    showAnalysisModal(analysis) {
        // Create analysis modal
        const modal = document.createElement('div');
        modal.className = 'ai-options-modal';
        
        modal.innerHTML = `
            <div class="ai-options-content">
                <div class="ai-options-header">
                    <h3>Email Analysis</h3>
                    <button class="ai-options-close" type="button">×</button>
                </div>
                
                <div class="ai-options-body">
                    <div class="ai-options-section">
                        <div style="
                            background: rgba(255, 255, 255, 0.1);
                            border-radius: 12px;
                            padding: 20px;
                            line-height: 1.6;
                            font-size: 14px;
                        ">
                            ${analysis}
                        </div>
                    </div>
                </div>
                
                <div class="ai-options-footer">
                    <button class="ai-options-btn ai-options-btn-primary" type="button" data-action="close">Close</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('show'), 10);
        
        // Close functionality
        const closeElements = modal.querySelectorAll('.ai-options-close, [data-action="close"]');
        closeElements.forEach(el => {
            el.addEventListener('click', () => this.hideOptionsModal(modal));
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideOptionsModal(modal);
            }
        });
    }

    showTranslationPlaceholder() {
        // Show a brief notification that translation is coming soon
        const message = document.createElement('div');
        message.textContent = 'Translation feature coming soon!';
        message.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #FF9800;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            font-weight: 500;
            z-index: 999999;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            opacity: 0;
            transform: translateY(-10px);
            transition: all 0.3s ease;
        `;
        
        document.body.appendChild(message);
        
        setTimeout(() => {
            message.style.opacity = '1';
            message.style.transform = 'translateY(0)';
        }, 10);
        
        setTimeout(() => {
            message.style.opacity = '0';
            message.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                if (document.contains(message)) {
                    message.remove();
                }
            }, 300);
        }, 2500);
    }

    async handleMenuClick() {
        console.log('Menu button clicked');
        this.showOptionsModal();
    }

    async showOptionsModal() {
        // Remove existing modal if any
        const existingModal = document.querySelector('.ai-options-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Load current settings
        let settings = await this.loadAssistantOptions();
        
        // If settings is null (context invalidated), don't show modal
        if (settings === null) {
            return;
        }

        // Create modal
        const modal = this.createOptionsModal(settings);
        document.body.appendChild(modal);

        // Show modal
        setTimeout(() => modal.classList.add('show'), 10);

        // Attach event listeners
        this.attachModalEventListeners(modal, settings);
    }

    async loadAssistantOptions() {
        try {
            const result = await chrome.storage.sync.get([
                'assistantOptions'
            ]);
            
            return result.assistantOptions || {
                generateResponse: true,
                analyzeEmail: false,
                translateEmail: false
            };
        } catch (error) {
            console.error('Error loading assistant options:', error);
            // If extension context is invalidated, reload the page
            if (error.message.includes('Extension context invalidated')) {
                console.log('Extension context invalidated - reloading page...');
                window.location.reload();
                return null;
            }
            return {
                generateResponse: true,
                analyzeEmail: false,
                translateEmail: false
            };
        }
    }

    createOptionsModal(settings) {
        const modal = document.createElement('div');
        modal.className = 'ai-options-modal';
        
        modal.innerHTML = `
            <div class="ai-options-content">
                <div class="ai-options-header">
                    <h3>AI Assistant Options</h3>
                    <button class="ai-options-close" type="button">×</button>
                </div>
                
                <div class="ai-options-body">
                    <div class="ai-options-section">
                        <h4>Choose Actions</h4>
                        <p>Select which actions you want the AI assistant to perform when you click the generate button.</p>
                        
                        <div class="ai-option-item" data-option="generateResponse">
                            <input type="checkbox" id="opt-generate" ${settings.generateResponse ? 'checked' : ''}>
                            <div class="ai-option-details">
                                <div class="ai-option-title">Generate Email Response</div>
                                <div class="ai-option-description">Create a contextual reply based on the original email content and your chosen tone.</div>
                            </div>
                        </div>
                        
                        <div class="ai-option-item" data-option="analyzeEmail">
                            <input type="checkbox" id="opt-analyze" ${settings.analyzeEmail ? 'checked' : ''}>
                            <div class="ai-option-details">
                                <div class="ai-option-title">Analyze & Summarize Email</div>
                                <div class="ai-option-description">Provide a summary of key points, action items, and important details from the email.</div>
                            </div>
                        </div>
                        
                        <div class="ai-option-item" data-option="translateEmail">
                            <input type="checkbox" id="opt-translate" ${settings.translateEmail ? 'checked' : ''}>
                            <div class="ai-option-details">
                                <div class="ai-option-title">Translate Email</div>
                                <div class="ai-option-description">Translate the email content to your preferred language. (Coming soon)</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="ai-options-footer">
                    <button class="ai-options-btn ai-options-btn-secondary" type="button" data-action="cancel">Cancel</button>
                    <button class="ai-options-btn ai-options-btn-primary" type="button" data-action="save">Save Options</button>
                </div>
            </div>
        `;
        
        return modal;
    }

    attachModalEventListeners(modal, settings) {
        // Close button
        const closeBtn = modal.querySelector('.ai-options-close');
        closeBtn.addEventListener('click', () => this.hideOptionsModal(modal));

        // Cancel button
        const cancelBtn = modal.querySelector('[data-action="cancel"]');
        cancelBtn.addEventListener('click', () => this.hideOptionsModal(modal));

        // Save button
        const saveBtn = modal.querySelector('[data-action="save"]');
        saveBtn.addEventListener('click', () => this.saveOptionsModal(modal));

        // Click outside to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideOptionsModal(modal);
            }
        });

        // Checkbox toggle on item click
        const optionItems = modal.querySelectorAll('.ai-option-item');
        optionItems.forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.type !== 'checkbox') {
                    const checkbox = item.querySelector('input[type="checkbox"]');
                    checkbox.checked = !checkbox.checked;
                }
            });
        });

        // ESC key to close
        const handleEscKey = (e) => {
            if (e.key === 'Escape') {
                this.hideOptionsModal(modal);
                document.removeEventListener('keydown', handleEscKey);
            }
        };
        document.addEventListener('keydown', handleEscKey);
    }

    hideOptionsModal(modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            if (document.contains(modal)) {
                modal.remove();
            }
        }, 300);
    }

    async saveOptionsModal(modal) {
        const settings = {
            generateResponse: modal.querySelector('#opt-generate').checked,
            analyzeEmail: modal.querySelector('#opt-analyze').checked,
            translateEmail: modal.querySelector('#opt-translate').checked
        };

        try {
            await chrome.storage.sync.set({
                assistantOptions: settings
            });
            
            console.log('Assistant options saved:', settings);
            this.hideOptionsModal(modal);
            
            // Show brief success indication
            this.showSuccessMessage();
            
        } catch (error) {
            console.error('Error saving assistant options:', error);
            // If extension context is invalidated, reload the page
            if (error.message.includes('Extension context invalidated')) {
                alert('Extension was reloaded. Please refresh the page and try again.');
                window.location.reload();
                return;
            }
            alert('Error saving options. Please try again.');
        }
    }

    showSuccessMessage() {
        // Create a brief success message
        const message = document.createElement('div');
        message.textContent = 'Options saved!';
        message.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            font-weight: 500;
            z-index: 999999;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            opacity: 0;
            transform: translateY(-10px);
            transition: all 0.3s ease;
        `;
        
        document.body.appendChild(message);
        
        // Animate in
        setTimeout(() => {
            message.style.opacity = '1';
            message.style.transform = 'translateY(0)';
        }, 10);
        
        // Remove after 2 seconds
        setTimeout(() => {
            message.style.opacity = '0';
            message.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                if (document.contains(message)) {
                    message.remove();
                }
            }, 300);
        }, 2000);
    }

    insertResponse(textElement, response) {
        // Insert response into the text element
        if (textElement.contentEditable === 'true' || textElement.isContentEditable) {
            textElement.innerHTML = response.replace(/\n/g, '<br>');
        } else {
            textElement.value = response;
        }
        
        // Trigger events
        const events = ['input', 'change', 'keyup'];
        events.forEach(eventType => {
            const event = new Event(eventType, { bubbles: true });
            textElement.dispatchEvent(event);
        });
        
        textElement.focus();
    }

    extractEmailContext(element) {
        const context = {
            subject: '',
            senderName: '',
            senderEmail: '',
            recipient: '',
            originalEmail: '',
            isReply: false,
            isForward: false,
            attachments: '',
            conversationHistory: []
        };

        try {
            console.log('Extracting email context...');

            // Get subject from compose window
            const subjectField = document.querySelector('input[name="subjectbox"]') ||
                                document.querySelector('[aria-label*="Subject"]') ||
                                document.querySelector('[placeholder*="Subject"]');
            if (subjectField) {
                context.subject = subjectField.value || '';
                context.isReply = context.subject.toLowerCase().includes('re:');
                context.isForward = context.subject.toLowerCase().includes('fwd:') || 
                                   context.subject.toLowerCase().includes('fw:');
            }

            // Extract the original email content from the conversation thread
            this.extractOriginalEmailContent(context);

            // Get sender and recipient information
            this.extractParticipantInfo(context);

            // Look for attachments in the email
            this.extractAttachments(context);
            
            console.log('Extracted context:', context);
            
        } catch (error) {
            console.error('Context extraction error:', error);
        }

        return context;
    }

    extractOriginalEmailContent(context) {
        try {
            // Look for the conversation thread - Gmail stores messages in specific containers
            const messageContainers = document.querySelectorAll('[data-message-id]');
            
            if (messageContainers.length > 0) {
                // Get the most recent message (usually the last one, but we want the one we're replying to)
                let targetMessage = null;
                
                // If this is a reply, get the message before the compose area
                if (context.isReply || context.isForward) {
                    targetMessage = messageContainers[messageContainers.length - 1];
                }
                
                if (targetMessage) {
                    // Extract sender information from the message header
                    const senderElement = targetMessage.querySelector('[email]') ||
                                         targetMessage.querySelector('.go span[email]') ||
                                         targetMessage.querySelector('.gD[email]');
                    
                    if (senderElement) {
                        context.senderEmail = senderElement.getAttribute('email') || '';
                        context.senderName = senderElement.getAttribute('name') || 
                                           senderElement.textContent || 
                                           context.senderEmail.split('@')[0];
                    }

                    // Extract the message content
                    const messageBody = targetMessage.querySelector('.ii.gt') ||
                                       targetMessage.querySelector('[dir="ltr"]') ||
                                       targetMessage.querySelector('.a3s.aiL');
                    
                    if (messageBody) {
                        let emailText = messageBody.textContent || '';
                        
                        // Clean up the email text
                        emailText = emailText
                            .replace(/\s+/g, ' ')
                            .replace(/On .* wrote:.*$/g, '')
                            .replace(/From:.*?Subject:.*?\n/gs, '')
                            .trim();
                        
                        context.originalEmail = emailText.substring(0, 2000);
                    }
                }
            }

            // Fallback: look for quoted text in the compose area
            if (!context.originalEmail && (context.isReply || context.isForward)) {
                const quotedText = document.querySelector('.gmail_quote') ||
                                 document.querySelector('[class*="quote"]') ||
                                 document.querySelector('.gmail_extra');
                
                if (quotedText) {
                    let emailText = quotedText.textContent || '';
                    emailText = emailText
                        .replace(/On .* wrote:/g, '')
                        .replace(/\s+/g, ' ')
                        .trim();
                    context.originalEmail = emailText.substring(0, 2000);
                }
            }

        } catch (error) {
            console.error('Original email extraction error:', error);
        }
    }

    extractParticipantInfo(context) {
        try {
            // If we haven't found sender info yet, try other methods
            if (!context.senderName || !context.senderEmail) {
                // Look in the thread view
                const threadSender = document.querySelector('.gD[email]') ||
                                   document.querySelector('.go span[email]') ||
                                   document.querySelector('[email]');
                
                if (threadSender) {
                    context.senderEmail = threadSender.getAttribute('email') || '';
                    context.senderName = threadSender.getAttribute('name') || 
                                       threadSender.textContent ||
                                       context.senderEmail.split('@')[0];
                }
            }

            // Get recipient info from compose window
            const recipientField = document.querySelector('[aria-label*="To"]') ||
                                 document.querySelector('.vR .vM') ||
                                 document.querySelector('.az9 span[email]');
            
            if (recipientField) {
                context.recipient = recipientField.getAttribute('email') || 
                                  recipientField.textContent || '';
            }

        } catch (error) {
            console.error('Participant info extraction error:', error);
        }
    }

    extractAttachments(context) {
        try {
            // Look for attachment indicators in Gmail
            const attachmentSelectors = [
                '[aria-label*="attachment"]',
                '[title*="attachment"]',
                '.aZo', // Gmail attachment class
                '.aZo span[email]', // Gmail attachment with name
                '.aQy', // Gmail attachment indicator
                '[data-tooltip*="attachment"]'
            ];

            let attachments = [];

            attachmentSelectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                    const text = el.textContent || el.getAttribute('aria-label') || el.getAttribute('title');
                    if (text && text.trim()) {
                        // Extract file names and types
                        const fileMatch = text.match(/([^\/\\]+\.(pdf|doc|docx|txt|jpg|jpeg|png|gif|csv|xlsx?|pptx?))/gi);
                        if (fileMatch) {
                            attachments = attachments.concat(fileMatch);
                        }
                    }
                });
            });

            // Also check for file mentions in the email text
            const emailText = context.originalEmail + (document.activeElement?.textContent || '');
            const fileMentions = emailText.match(/\b\w+\.(pdf|doc|docx|txt|jpg|jpeg|png|gif|csv|xlsx?|pptx?)\b/gi);
            if (fileMentions) {
                attachments = attachments.concat(fileMentions);
            }

            // Remove duplicates and format
            const uniqueAttachments = [...new Set(attachments)];
            if (uniqueAttachments.length > 0) {
                context.attachments = uniqueAttachments.join(', ');
            }

        } catch (error) {
            console.error('Attachment extraction error:', error);
        }

        return context;
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

// Initialize the universal email assistant
console.log('Loading Email Assistant...');
new UniversalEmailAssistant();