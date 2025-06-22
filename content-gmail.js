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
        
        // Only work in Gmail for this specific fix
        const isGmail = window.location.hostname.includes('mail.google.com');
        if (!isGmail) return false;
        
        // First, exclude elements that are definitely NOT reply compose areas
        const placeholder = element.getAttribute('placeholder') || '';
        const ariaLabel = element.getAttribute('aria-label') || '';
        const className = element.className || '';
        const id = element.id || '';
        
        // Exclude search boxes, subject lines, and other non-compose areas
        const excludeKeywords = ['search', 'subject', 'to:', 'cc:', 'bcc:', 'from:'];
        const isExcluded = excludeKeywords.some(keyword => 
            placeholder.toLowerCase().includes(keyword) ||
            ariaLabel.toLowerCase().includes(keyword) ||
            className.toLowerCase().includes(keyword) ||
            id.toLowerCase().includes(keyword)
        );
        
        if (isExcluded) {
            console.log('Email context excluded - not a compose area:', element);
            return false;
        }
        
        // Only proceed if this is in a reply context, NOT a new compose
        const isInReplyContext = this.isInGmailReplyContext(element);
        if (!isInReplyContext) {
            console.log('Email context rejected - not in reply context:', element);
            return false;
        }
        
        // Check if it's a content-editable message body area (Gmail reply compose)
        const isContentEditable = element.contentEditable === 'true' || 
                                  element.getAttribute('contenteditable') === 'true';
        const hasRole = element.getAttribute('role') === 'textbox';
        const isTextArea = element.tagName === 'TEXTAREA';
        
        const isTextInput = isContentEditable || hasRole || isTextArea;
        
        // Must be reasonably sized (reply compose areas are big)
        const rect = element.getBoundingClientRect();
        const isReasonableSize = rect.width > 300 && rect.height > 80;
        
        // Final check: is this actually a message body compose area?
        const isMessageBody = this.isGmailMessageBody(element);
        
        const isEmailField = isTextInput && isReasonableSize && isMessageBody;
        
        console.log('Email context check:', {
            element,
            isInReplyContext,
            isTextInput,
            isReasonableSize,
            isMessageBody,
            isEmailField
        });
        
        return isEmailField;
    }
    
    isInGmailReplyContext(element) {
        // Check if we're in a reply compose context by looking for Gmail reply indicators
        
        // Method 1: Look for reply/forward indicators in the URL or page
        const url = window.location.href;
        const hasReplyInUrl = url.includes('compose') && (url.includes('reply') || url.includes('fwd'));
        
        // Method 2: Look for the quoted message content that appears in replies
        const hasQuotedContent = document.querySelector('.gmail_quote') ||
                                document.querySelector('.gmail_extra') ||
                                document.querySelector('[class*="quote"]');
        
        // Method 3: Check if we're in a conversation thread (not standalone compose)
        const inConversationThread = document.querySelector('[data-message-id]') ||
                                    document.querySelector('.h7') ||  // Gmail thread container
                                    document.querySelector('.ConversationView');
        
        // Method 4: Look for reply/forward specific containers
        const replyContainer = element.closest('.Am') ||  // Gmail reply container
                              element.closest('.aoI') ||  // Gmail compose area in thread
                              element.closest('.IZ');     // Gmail inline reply
        
        // Method 5: Check if there are multiple messages in thread (indicating reply context)
        const messageCount = document.querySelectorAll('[data-message-id]').length;
        const hasMultipleMessages = messageCount > 1;
        
        const isReplyContext = hasReplyInUrl || hasQuotedContent || 
                              (inConversationThread && replyContainer) ||
                              hasMultipleMessages;
        
        console.log('Gmail reply context check:', {
            hasReplyInUrl,
            hasQuotedContent,
            inConversationThread,
            replyContainer,
            hasMultipleMessages,
            isReplyContext
        });
        
        return isReplyContext;
    }
    
    isGmailMessageBody(element) {
        // Check if this element is specifically a Gmail message body compose area
        
        // Look for Gmail-specific message body identifiers
        const gmailBodySelectors = [
            '[aria-label*="Message Body"]',
            '[aria-label*="message body"]',
            '.Am.Al.editable',  // Gmail reply compose body
            '.editable[role="textbox"]',
            '[g_editable="true"]'
        ];
        
        // Check if element matches any Gmail body selectors
        const isGmailBody = gmailBodySelectors.some(selector => {
            return element.matches(selector) || element.closest(selector);
        });
        
        // Additional check: ensure it's not in toolbar or header areas
        const isInToolbar = element.closest('.ams') ||  // Gmail toolbar
                           element.closest('.aoD') ||   // Gmail compose header
                           element.closest('.wO');      // Gmail compose options
        
        const validMessageBody = isGmailBody && !isInToolbar;
        
        console.log('Gmail message body check:', {
            element,
            isGmailBody,
            isInToolbar,
            validMessageBody
        });
        
        return validMessageBody;
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
            const emailContext = await this.extractEmailContext(textElement);
            
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
                selectedAction: 'generateResponse'
            };
            
            try {
                const stored = await chrome.storage.sync.get([
                    'geminiModel', 'defaultTone', 'maxTokens', 'temperature', 
                    'analyzeAttachments', 'assistantOptions', 'translationLanguage'
                ]);
                settings = { ...settings, ...stored };
                assistantOptions = stored.assistantOptions || assistantOptions;
            } catch (e) {
                console.warn('Could not load settings, using defaults');
            }

            console.log('Assistant options:', assistantOptions);
            console.log('Sending context to Gemini:', emailContext);

            let results = [];
            const selectedAction = assistantOptions.selectedAction || 'generateResponse';
            
            // Perform the selected action
            try {
                switch (selectedAction) {
                    case 'generateResponse':
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
                        break;
                        
                    case 'analyzeEmail':
                        console.log('Starting email analysis...');
                        const analysis = await this.overlayInstance.geminiService.generateSummary(
                            emailContext,
                            settings.geminiModel || 'gemini-1.5-flash',
                            settings.analyzeAttachments || false
                        );
                        
                        if (analysis) {
                            this.showAnalysisModal(analysis);
                            results.push('Email analyzed');
                            console.log('Email analysis completed');
                        }
                        break;
                        
                    case 'translateEmail':
                        console.log('Starting translation...');
                        const translationLanguage = settings.translationLanguage || 'English';
                        const translation = await this.overlayInstance.geminiService.translateEmail(
                            emailContext,
                            settings.geminiModel || 'gemini-1.5-flash',
                            translationLanguage,
                            settings.analyzeAttachments || false
                        );
                        
                        if (translation) {
                            this.showTranslationModal(translation, translationLanguage);
                            results.push('Email translated');
                            console.log('Translation completed');
                        }
                        break;
                        
                    default:
                        console.warn('Unknown action:', selectedAction);
                        results.push('Unknown action');
                }
            } catch (error) {
                console.error(`${selectedAction} failed:`, error);
                results.push(`${selectedAction} failed`);
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

    showTranslationModal(translation, targetLanguage) {
        // Create translation modal
        const modal = document.createElement('div');
        modal.className = 'ai-options-modal';
        
        modal.innerHTML = `
            <div class="ai-options-content">
                <div class="ai-options-header">
                    <h3>Email Translation (${targetLanguage})</h3>
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
                            white-space: pre-wrap;
                        ">
                            ${translation}
                        </div>
                    </div>
                </div>
                
                <div class="ai-options-footer">
                    <button class="ai-options-btn ai-options-btn-secondary" type="button" data-action="copy">Copy Translation</button>
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

        // Copy functionality
        const copyBtn = modal.querySelector('[data-action="copy"]');
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(translation).then(() => {
                copyBtn.textContent = 'Copied!';
                setTimeout(() => {
                    copyBtn.textContent = 'Copy Translation';
                }, 2000);
            });
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
                selectedAction: 'generateResponse'
            };
        } catch (error) {
            console.error('Error loading assistant options:', error);
            return {
                selectedAction: 'generateResponse'
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
                        <h4>Choose Action</h4>
                        <p>Select which action you want the AI assistant to perform when you click the generate button.</p>
                        
                        <div class="ai-option-item" data-option="generateResponse">
                            <input type="radio" name="assistantAction" id="opt-generate" value="generateResponse" ${(settings.selectedAction === 'generateResponse' || !settings.selectedAction) ? 'checked' : ''}>
                            <div class="ai-option-details">
                                <div class="ai-option-title">Generate Email Response</div>
                                <div class="ai-option-description">Create a contextual reply based on the original email content and your chosen tone.</div>
                            </div>
                        </div>
                        
                        <div class="ai-option-item" data-option="analyzeEmail">
                            <input type="radio" name="assistantAction" id="opt-analyze" value="analyzeEmail" ${settings.selectedAction === 'analyzeEmail' ? 'checked' : ''}>
                            <div class="ai-option-details">
                                <div class="ai-option-title">Analyze & Summarize Email</div>
                                <div class="ai-option-description">Provide a summary of key points, action items, and important details from the email.</div>
                            </div>
                        </div>
                        
                        <div class="ai-option-item" data-option="translateEmail">
                            <input type="radio" name="assistantAction" id="opt-translate" value="translateEmail" ${settings.selectedAction === 'translateEmail' ? 'checked' : ''}>
                            <div class="ai-option-details">
                                <div class="ai-option-title">Translate Email</div>
                                <div class="ai-option-description">Translate the email content to your preferred language.</div>
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

        // Radio button selection on item click
        const optionItems = modal.querySelectorAll('.ai-option-item');
        optionItems.forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.type !== 'radio') {
                    const radio = item.querySelector('input[type="radio"]');
                    radio.checked = true;
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
        const selectedRadio = modal.querySelector('input[name="assistantAction"]:checked');
        const selectedAction = selectedRadio ? selectedRadio.value : 'generateResponse';
        
        const settings = {
            selectedAction: selectedAction
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
        // Clean the response before inserting
        const cleanResponse = this.cleanGeminiResponse(response);
        
        // Insert response into the text element
        if (textElement.contentEditable === 'true' || textElement.isContentEditable) {
            textElement.innerHTML = cleanResponse.replace(/\n/g, '<br>');
        } else {
            textElement.value = cleanResponse;
        }
        
        // Trigger events
        const events = ['input', 'change', 'keyup'];
        events.forEach(eventType => {
            const event = new Event(eventType, { bubbles: true });
            textElement.dispatchEvent(event);
        });
        
        textElement.focus();
    }

    cleanGeminiResponse(response) {
        if (!response) return '';
        
        let cleanedResponse = response.trim();
        
        // Remove subject lines that Gemini sometimes includes
        cleanedResponse = cleanedResponse.replace(/^Subject:\s*.*$/gim, '');
        cleanedResponse = cleanedResponse.replace(/^Re:\s*.*$/gim, '');
        cleanedResponse = cleanedResponse.replace(/^Fwd?:\s*.*$/gim, '');
        cleanedResponse = cleanedResponse.replace(/^Subject Line:\s*.*$/gim, '');
        
        // Remove email headers that might appear
        cleanedResponse = cleanedResponse.replace(/^From:\s*.*$/gim, '');
        cleanedResponse = cleanedResponse.replace(/^To:\s*.*$/gim, '');
        cleanedResponse = cleanedResponse.replace(/^Date:\s*.*$/gim, '');
        cleanedResponse = cleanedResponse.replace(/^Sent:\s*.*$/gim, '');
        
        // Remove lines that start with typical email metadata
        cleanedResponse = cleanedResponse.replace(/^(From|To|Cc|Bcc|Date|Sent|Subject):\s*.*$/gim, '');
        
        // Remove empty lines at the beginning and end
        cleanedResponse = cleanedResponse.replace(/^\s*\n+/g, '');
        cleanedResponse = cleanedResponse.replace(/\n+\s*$/g, '');
        
        // Remove multiple consecutive empty lines
        cleanedResponse = cleanedResponse.replace(/\n\s*\n\s*\n/g, '\n\n');
        
        return cleanedResponse.trim();
    }

    async extractEmailContext(element) {
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
            await this.extractAttachments(context);
            
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

    async extractAttachments(context) {
        try {
            console.log('Starting enhanced attachment extraction...');
            
            // Enhanced Gmail attachment detection
            const attachmentInfo = await this.getGmailAttachments();
            
            if (attachmentInfo.length > 0) {
                context.attachments = attachmentInfo.map(att => att.name).join(', ');
                context.attachmentFiles = attachmentInfo; // Store file objects for upload
                console.log('Found attachments:', context.attachments);
            } else {
                // Fallback to text-based detection
                await this.extractAttachmentNames(context);
            }

        } catch (error) {
            console.error('Attachment extraction error:', error);
            // Fallback to basic text extraction
            await this.extractAttachmentNames(context);
        }

        return context;
    }

    async extractAttachmentNames(context) {
        // Original text-based attachment detection as fallback
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
    }

    async getGmailAttachments() {
        try {
            console.log('Searching for Gmail attachments...');
            const attachmentFiles = [];

            // Look for attachment download links in Gmail
            const attachmentLinks = document.querySelectorAll('a[download], a[href*="attachment"], span[role="link"][data-tooltip*="Download"]');
            
            for (const link of attachmentLinks) {
                try {
                    const fileName = link.getAttribute('download') || 
                                   link.textContent?.trim() || 
                                   link.getAttribute('data-tooltip') || 
                                   'attachment';
                    
                    const href = link.getAttribute('href');
                    
                    if (href && (href.includes('attachment') || href.includes('download'))) {
                        // Try to get file content if it's an accessible link
                        const fileInfo = await this.extractFileFromLink(link, fileName);
                        if (fileInfo) {
                            attachmentFiles.push(fileInfo);
                        }
                    }
                } catch (error) {
                    console.warn('Error processing attachment link:', error);
                }
            }

            // Also look for inline images that could be attachments
            const inlineImages = document.querySelectorAll('img[src*="ci"], img[src*="attachment"]');
            for (const img of inlineImages) {
                try {
                    const src = img.getAttribute('src');
                    if (src && (src.includes('ci') || src.includes('attachment'))) {
                        const fileInfo = await this.extractFileFromImage(img);
                        if (fileInfo) {
                            attachmentFiles.push(fileInfo);
                        }
                    }
                } catch (error) {
                    console.warn('Error processing inline image:', error);
                }
            }

            console.log(`Found ${attachmentFiles.length} accessible attachments`);
            return attachmentFiles;

        } catch (error) {
            console.error('Gmail attachment detection error:', error);
            return [];
        }
    }

    async extractFileFromLink(link, fileName) {
        try {
            const href = link.getAttribute('href');
            if (!href || href.startsWith('javascript:') || href.startsWith('#')) {
                return null;
            }

            // For Gmail, attachment links often require authentication
            // We'll return the link info for now and handle download later
            return {
                name: fileName,
                type: this.guessFileType(fileName),
                url: href,
                element: link
            };

        } catch (error) {
            console.warn('Error extracting file from link:', error);
            return null;
        }
    }

    async extractFileFromImage(img) {
        try {
            const src = img.getAttribute('src');
            const alt = img.getAttribute('alt') || 'image';
            
            if (src && src.startsWith('data:')) {
                // Data URL - can extract directly
                const mimeMatch = src.match(/data:([^;]+)/);
                const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
                
                return {
                    name: alt + '.' + this.getExtensionFromMime(mimeType),
                    type: mimeType,
                    dataUrl: src,
                    element: img
                };
            } else if (src) {
                // External URL - return info for later processing
                return {
                    name: alt + '.jpg', // Default extension
                    type: 'image/jpeg',
                    url: src,
                    element: img
                };
            }

            return null;
        } catch (error) {
            console.warn('Error extracting file from image:', error);
            return null;
        }
    }

    guessFileType(fileName) {
        const ext = fileName.split('.').pop()?.toLowerCase();
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
            'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        };
        return mimeTypes[ext] || 'application/octet-stream';
    }

    getExtensionFromMime(mimeType) {
        const extensions = {
            'application/pdf': 'pdf',
            'application/msword': 'doc',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
            'text/plain': 'txt',
            'image/jpeg': 'jpg',
            'image/png': 'png',
            'image/gif': 'gif',
            'text/csv': 'csv',
            'application/vnd.ms-excel': 'xls',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx'
        };
        return extensions[mimeType] || 'bin';
    }
}

// Initialize the universal email assistant
console.log('Loading Email Assistant...');
new UniversalEmailAssistant();