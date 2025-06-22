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
            generateBtn.textContent = 'Generating...';
            generateBtn.style.opacity = '0.7';
            
            // Extract email context
            const emailContext = this.extractEmailContext(textElement);
            
            // Create overlay instance if needed
            if (!this.overlayInstance) {
                this.overlayInstance = new EmailOverlay(textElement, emailContext, 'gmail');
            }
            
            // Generate response with user's settings or defaults
            let settings = { geminiModel: 'gemini-1.5-flash', defaultTone: 'formal' };
            try {
                const stored = await chrome.storage.sync.get(['geminiModel', 'defaultTone', 'maxTokens', 'temperature']);
                settings = { ...settings, ...stored };
            } catch (e) {
                console.warn('Could not load settings, using defaults');
            }

            const response = await this.overlayInstance.geminiService.generateResponse(
                emailContext,
                settings.geminiModel || 'gemini-1.5-flash',
                settings.defaultTone || 'formal',
                settings.maxTokens || 300,
                settings.temperature || 0.7
            );
            
            if (response) {
                this.insertResponse(textElement, response);
                generateBtn.textContent = 'Regenerate';
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

    handleMenuClick() {
        console.log('Menu button clicked');
        // TODO: Implement dropdown menu
        alert('Menu feature coming soon!');
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
            recipient: '',
            originalEmail: '',
            isReply: false,
            isForward: false
        };

        try {
            // Look for subject field
            const subjectField = document.querySelector('input[name="subjectbox"]') ||
                                document.querySelector('[aria-label*="Subject"]');
            if (subjectField) {
                context.subject = subjectField.value || '';
                context.isReply = context.subject.toLowerCase().startsWith('re:');
                context.isForward = context.subject.toLowerCase().startsWith('fwd:');
            }

            // Look for quoted text in replies
            if (context.isReply || context.isForward) {
                const quotedText = document.querySelector('.gmail_quote') ||
                                 document.querySelector('[class*="quote"]');
                if (quotedText) {
                    context.originalEmail = quotedText.textContent.substring(0, 1000);
                }
            }
        } catch (error) {
            console.error('Context extraction error:', error);
        }

        return context;
    }
}

// Initialize the universal email assistant
console.log('Loading Email Assistant...');
new UniversalEmailAssistant();