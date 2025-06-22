// Gmail-specific content script
class GmailIntegration {
    constructor() {
        this.currentEmailData = null;
        this.overlayInstance = null;
        this.isInitialized = false;
        this.observer = null;
        
        this.init();
    }

    init() {
        if (this.isInitialized) return;
        
        // Wait for Gmail to load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupGmailIntegration());
        } else {
            this.setupGmailIntegration();
        }
        
        this.isInitialized = true;
    }

    setupGmailIntegration() {
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
        const composeWindows = document.querySelectorAll('[role="dialog"]');
        composeWindows.forEach(window => this.checkForComposeWindow(window));
    }

    checkForComposeWindow(element) {
        // Gmail compose window selectors
        const composeSelectors = [
            '.M9',  // Gmail compose window
            '[role="dialog"]',
            '.nH.if'  // Gmail compose area
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
        // Find the compose body
        const composeBody = composeWindow.querySelector('[contenteditable="true"]') || 
                           composeWindow.querySelector('[role="textbox"]') ||
                           composeWindow.querySelector('.Am.Al.editable');

        if (!composeBody) return;

        // Check if overlay already exists for this compose window
        if (composeWindow.querySelector('.ai-email-overlay')) return;

        // Extract email context
        const emailContext = this.extractEmailContext(composeWindow);
        
        // Create and inject overlay
        this.overlayInstance = new EmailOverlay(composeBody, emailContext, 'gmail');
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
            // Extract subject
            const subjectField = composeWindow.querySelector('input[name="subjectbox"]') ||
                                composeWindow.querySelector('[aria-label*="Subject"]');
            if (subjectField) {
                context.subject = subjectField.value || subjectField.textContent;
                context.isReply = context.subject.toLowerCase().startsWith('re:');
                context.isForward = context.subject.toLowerCase().startsWith('fwd:');
            }

            // Extract recipient
            const recipientField = composeWindow.querySelector('[email]') ||
                                 composeWindow.querySelector('.vR .vM');
            if (recipientField) {
                context.recipient = recipientField.getAttribute('email') || 
                                  recipientField.textContent;
            }

            // Extract original email content for replies
            if (context.isReply || context.isForward) {
                const quotedText = composeWindow.querySelector('.gmail_quote') ||
                                 composeWindow.querySelector('[class*="quote"]');
                if (quotedText) {
                    context.originalEmail = this.cleanEmailText(quotedText.textContent);
                }
            }

            // Alternative method: look for conversation thread
            if (!context.originalEmail) {
                const conversationElements = document.querySelectorAll('[data-message-id]');
                if (conversationElements.length > 1) {
                    // Get the previous message in the thread
                    const prevMessage = conversationElements[conversationElements.length - 2];
                    const messageBody = prevMessage.querySelector('[dir="ltr"]') || 
                                      prevMessage.querySelector('.ii.gt');
                    if (messageBody) {
                        context.originalEmail = this.cleanEmailText(messageBody.textContent);
                        context.isReply = true;
                    }
                }
            }

        } catch (error) {
            console.error('Error extracting email context:', error);
        }

        return context;
    }

    cleanEmailText(text) {
        if (!text) return '';
        
        // Remove common email artifacts
        return text
            .replace(/On .* wrote:/g, '')
            .replace(/From:.*?Subject:/gs, '')
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

// Initialize Gmail integration
let gmailIntegration;

if (window.location.hostname === 'mail.google.com') {
    gmailIntegration = new GmailIntegration();
    
    // Listen for messages
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (gmailIntegration) {
            gmailIntegration.handleMessage(message, sender, sendResponse);
        }
    });
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (gmailIntegration) {
        gmailIntegration.destroy();
    }
});