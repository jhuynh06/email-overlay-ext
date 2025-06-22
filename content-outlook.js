// Outlook-specific content script
class OutlookIntegration {
    constructor() {
        this.currentEmailData = null;
        this.overlayInstance = null;
        this.isInitialized = false;
        this.observer = null;
        
        this.init();
    }

    init() {
        if (this.isInitialized) return;
        
        // Wait for Outlook to load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupOutlookIntegration());
        } else {
            this.setupOutlookIntegration();
        }
        
        this.isInitialized = true;
    }

    setupOutlookIntegration() {
        // Use MutationObserver to detect when compose windows are opened
        this.observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        this.checkForComposeWindow(node);
                    }
                });
            });
        });

        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Check for existing compose windows
        this.checkExistingComposeWindows();
    }

    checkExistingComposeWindows() {
        // Outlook compose window selectors
        const composeSelectors = [
            '[role="dialog"][aria-label*="compose"]',
            '[role="dialog"][aria-label*="reply"]',
            '[data-app-section="Compose"]',
            '.ms-Panel-main',
            '[class*="compose"]'
        ];

        composeSelectors.forEach(selector => {
            const composeWindows = document.querySelectorAll(selector);
            composeWindows.forEach(window => this.checkForComposeWindow(window));
        });
    }

    checkForComposeWindow(element) {
        // Outlook compose window selectors
        const composeSelectors = [
            '[role="dialog"][aria-label*="compose"]',
            '[role="dialog"][aria-label*="reply"]',
            '[data-app-section="Compose"]',
            '.ms-Panel-main',
            '[class*="compose"]',
            '[class*="Compose"]'
        ];

        let composeWindow = null;
        
        for (const selector of composeSelectors) {
            if (element.matches && element.matches(selector)) {
                composeWindow = element;
                break;
            }
            
            const found = element.querySelector && element.querySelector(selector);
            if (found) {
                composeWindow = found;
                break;
            }
        }

        if (composeWindow) {
            setTimeout(() => this.handleComposeWindow(composeWindow), 500);
        }
    }

    async handleComposeWindow(composeWindow) {
        // Find the compose body - Outlook uses different selectors
        const composeBodySelectors = [
            '[role="textbox"][contenteditable="true"]',
            '[contenteditable="true"]',
            '.ms-TextField-field',
            '[data-testid="editor-body-tree"]',
            '.rps_e7c5',  // Outlook web specific
            '.elementToProof'
        ];

        let composeBody = null;
        
        for (const selector of composeBodySelectors) {
            composeBody = composeWindow.querySelector(selector);
            if (composeBody) break;
        }

        if (!composeBody) {
            // Try alternative approach - find any contenteditable element
            composeBody = composeWindow.querySelector('[contenteditable="true"]');
        }

        if (!composeBody) return;

        // Check if overlay already exists for this compose window
        if (composeWindow.querySelector('.ai-email-overlay')) return;

        // Extract email context
        const emailContext = this.extractEmailContext(composeWindow);
        
        // Create and inject overlay
        this.overlayInstance = new EmailOverlay(composeBody, emailContext, 'outlook');
        this.overlayInstance.inject();

        // Monitor for window close
        this.monitorComposeWindow(composeWindow);
    }

    extractEmailContext(composeWindow) {
        const context = {
            subject: '',
            recipient: '',
            originalEmail: '',
            isReply: false,
            isForward: false
        };

        try {
            // Extract subject - Outlook specific selectors
            const subjectSelectors = [
                'input[aria-label*="Subject"]',
                'input[placeholder*="Subject"]',
                '[data-testid="subject-field"]',
                '.ms-TextField-field[aria-label*="Subject"]'
            ];

            for (const selector of subjectSelectors) {
                const subjectField = composeWindow.querySelector(selector);
                if (subjectField) {
                    context.subject = subjectField.value || subjectField.textContent;
                    break;
                }
            }

            // Check for reply/forward indicators
            if (context.subject) {
                context.isReply = context.subject.toLowerCase().startsWith('re:') || 
                                 context.subject.toLowerCase().includes('reply');
                context.isForward = context.subject.toLowerCase().startsWith('fwd:') || 
                                   context.subject.toLowerCase().startsWith('fw:') ||
                                   context.subject.toLowerCase().includes('forward');
            }

            // Extract recipient
            const recipientSelectors = [
                '[aria-label*="To field"]',
                '[data-testid="to-field"]',
                '.ms-BasePicker-text',
                '.ms-PeoplePicker-text'
            ];

            for (const selector of recipientSelectors) {
                const recipientField = composeWindow.querySelector(selector);
                if (recipientField) {
                    context.recipient = recipientField.textContent || recipientField.value;
                    break;
                }
            }

            // Extract original email content for replies/forwards
            if (context.isReply || context.isForward) {
                const quotedSelectors = [
                    '[class*="quoted"]',
                    '[class*="original"]',
                    '.elementToProof',
                    '.rps_e7c5 .rps_e7c5', // Nested outlook content
                    '[data-testid="original-message"]'
                ];

                for (const selector of quotedSelectors) {
                    const quotedText = composeWindow.querySelector(selector);
                    if (quotedText) {
                        context.originalEmail = this.cleanEmailText(quotedText.textContent);
                        if (context.originalEmail.length > 100) break; // Use first substantial content
                    }
                }
            }

            // Alternative: Look for conversation thread in the main window
            if (!context.originalEmail && (context.isReply || context.isForward)) {
                const conversationSelectors = [
                    '[role="main"] [class*="message"]',
                    '[data-testid="message-body"]',
                    '.rps_e7c5'
                ];

                for (const selector of conversationSelectors) {
                    const messages = document.querySelectorAll(selector);
                    if (messages.length > 0) {
                        // Get the last message (most recent)
                        const lastMessage = messages[messages.length - 1];
                        const messageText = this.cleanEmailText(lastMessage.textContent);
                        if (messageText.length > 100) {
                            context.originalEmail = messageText;
                            break;
                        }
                    }
                }
            }

        } catch (error) {
            console.error('Error extracting Outlook email context:', error);
        }

        return context;
    }

    cleanEmailText(text) {
        if (!text) return '';
        
        // Remove common email artifacts
        return text
            .replace(/From:.*?Sent:.*?To:.*?Subject:.*/gs, '')
            .replace(/On .* wrote:/g, '')
            .replace(/________________________________/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 2000); // Limit length
    }

    monitorComposeWindow(composeWindow) {
        const observer = new MutationObserver((mutations) => {
            // Check if compose window is still in DOM
            if (!document.contains(composeWindow)) {
                if (this.overlayInstance) {
                    this.overlayInstance.destroy();
                    this.overlayInstance = null;
                }
                observer.disconnect();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // Handle messages from background script or popup
    handleMessage(message, sender, sendResponse) {
        switch (message.action) {
            case 'settingsUpdated':
                if (this.overlayInstance) {
                    this.overlayInstance.updateSettings();
                }
                break;
        }
    }

    destroy() {
        if (this.observer) {
            this.observer.disconnect();
        }
        if (this.overlayInstance) {
            this.overlayInstance.destroy();
        }
    }
}

// Initialize Outlook integration
let outlookIntegration;

if (window.location.hostname.includes('outlook')) {
    outlookIntegration = new OutlookIntegration();
    
    // Listen for messages
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (outlookIntegration) {
            outlookIntegration.handleMessage(message, sender, sendResponse);
        }
    });
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (outlookIntegration) {
        outlookIntegration.destroy();
    }
});