// Universal Text Field Overlay - Works like Grammarly
class UniversalEmailAssistant {
    constructor() {
        this.activeButton = null;
        this.activeElement = null;
        this.overlayInstance = null;
        
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
                this.overlayInstance = new EmailOverlay(textElement, emailContext, 'gmail');
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
                console.warn('Could not load settings, using defaults');
            }

            console.log('Assistant options:', assistantOptions);
            console.log('Sending context to Gemini:', emailContext);

            let results = [];
            
            // Perform selected actions - each independently with error handling
            if (assistantOptions.generateResponse) {
                try {
                    console.log('Starting response generation...');
                    const response = await this.overlayInstance.geminiService.generateResponse(
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
                    results.push('Response generation failed');
                }
            }
            
            if (assistantOptions.analyzeEmail) {
                try {
                    console.log('Starting email analysis...');
                    const analysis = await this.overlayInstance.geminiService.generateSummary(
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

// Initialize the universal email assistant
console.log('Loading Email Assistant...');
new UniversalEmailAssistant();