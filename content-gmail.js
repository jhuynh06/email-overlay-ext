// Gmail-specific content script - Grammarly-style integration
class GmailIntegration {
    constructor() {
        this.overlayInstances = new Map(); // Track overlays by element
        this.isInitialized = false;
        this.observer = null;
        
        console.log('Gmail Integration: Starting...');
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
        console.log('Gmail Integration: Setting up...');
        
        // Monitor for new compose areas
        this.observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        this.scanForComposeAreas(node);
                    }
                });
            });
        });

        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Scan existing content
        this.scanForComposeAreas(document.body);
        
        // Also check periodically in case we miss something
        setInterval(() => this.scanForComposeAreas(document.body), 2000);
    }

    scanForComposeAreas(element) {
        // Look for contenteditable areas that could be email compose boxes
        const composeSelectors = [
            '[contenteditable="true"]',
            '[role="textbox"]',
            '.editable',
            '.Am.Al.editable', // Gmail specific
            'div[contenteditable]',
            'textarea'
        ];

        composeSelectors.forEach(selector => {
            const elements = element.querySelectorAll ? element.querySelectorAll(selector) : [];
            elements.forEach(el => this.checkElement(el));
        });

        // Also check the element itself
        if (element.matches) {
            composeSelectors.forEach(selector => {
                if (element.matches(selector)) {
                    this.checkElement(element);
                }
            });
        }
    }

    checkElement(element) {
        // Skip if already has overlay
        if (this.overlayInstances.has(element)) return;
        
        // Skip if element is too small or hidden
        const rect = element.getBoundingClientRect();
        if (rect.width < 100 || rect.height < 50) return;
        
        // Check if this looks like an email compose area
        if (this.isEmailComposeArea(element)) {
            console.log('Gmail Integration: Found compose area', element);
            this.addOverlayToElement(element);
        }
    }

    isEmailComposeArea(element) {
        // Check various indicators that this is an email compose area
        const text = element.textContent || '';
        const placeholder = element.getAttribute('placeholder') || '';
        const ariaLabel = element.getAttribute('aria-label') || '';
        const className = element.className || '';
        const id = element.id || '';
        
        // Gmail-specific indicators
        const gmailIndicators = [
            // Class names
            className.includes('editable'),
            className.includes('compose'),
            className.includes('reply'),
            
            // Aria labels
            ariaLabel.toLowerCase().includes('message'),
            ariaLabel.toLowerCase().includes('compose'),
            ariaLabel.toLowerCase().includes('reply'),
            ariaLabel.toLowerCase().includes('email'),
            
            // Placeholder text
            placeholder.toLowerCase().includes('message'),
            placeholder.toLowerCase().includes('compose'),
            placeholder.toLowerCase().includes('reply'),
            
            // Check if it's in a dialog or compose area
            element.closest('[role="dialog"]') !== null,
            element.closest('.nH') !== null, // Gmail container
            element.closest('.M9') !== null, // Gmail compose
            
            // Check parent context
            element.parentElement && element.parentElement.className.includes('editable'),
            
            // Minimum size check (email compose areas are usually big)
            element.getBoundingClientRect().height > 80
        ];
        
        // At least one indicator should be true
        return gmailIndicators.some(indicator => indicator);
    }

    addOverlayToElement(element) {
        try {
            // Extract email context
            const emailContext = this.extractEmailContext(element);
            
            // Create overlay instance
            const overlayInstance = new EmailOverlay(element, emailContext, 'gmail');
            
            // Store reference
            this.overlayInstances.set(element, overlayInstance);
            
            // Inject overlay
            overlayInstance.inject();
            
            console.log('Gmail Integration: Overlay added to element', element);
            
            // Monitor element removal
            this.monitorElementRemoval(element);
            
        } catch (error) {
            console.error('Gmail Integration: Error adding overlay', error);
        }
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
            // Look for compose dialog or container
            const dialog = element.closest('[role="dialog"]') || 
                          element.closest('.nH') ||
                          element.closest('.M9');
            
            if (dialog) {
                // Extract subject
                const subjectField = dialog.querySelector('input[name="subjectbox"]') ||
                                    dialog.querySelector('[aria-label*="Subject"]') ||
                                    dialog.querySelector('[placeholder*="Subject"]');
                if (subjectField) {
                    context.subject = subjectField.value || subjectField.textContent || '';
                    context.isReply = context.subject.toLowerCase().startsWith('re:');
                    context.isForward = context.subject.toLowerCase().startsWith('fwd:');
                }

                // Extract recipient
                const recipientField = dialog.querySelector('[email]') ||
                                     dialog.querySelector('.vR .vM') ||
                                     dialog.querySelector('[aria-label*="To"]');
                if (recipientField) {
                    context.recipient = recipientField.getAttribute('email') || 
                                      recipientField.textContent || '';
                }

                // Extract original email content for replies
                if (context.isReply || context.isForward) {
                    const quotedText = dialog.querySelector('.gmail_quote') ||
                                     dialog.querySelector('[class*="quote"]') ||
                                     dialog.querySelector('.ii.gt');
                    if (quotedText) {
                        context.originalEmail = this.cleanEmailText(quotedText.textContent);
                    }
                }
            }

            // Fallback: look in the broader page context
            if (!context.originalEmail && (context.isReply || context.isForward)) {
                const messages = document.querySelectorAll('[data-message-id]');
                if (messages.length > 1) {
                    const lastMessage = messages[messages.length - 2];
                    const messageBody = lastMessage.querySelector('[dir="ltr"]') || 
                                      lastMessage.querySelector('.ii.gt');
                    if (messageBody) {
                        context.originalEmail = this.cleanEmailText(messageBody.textContent);
                    }
                }
            }

        } catch (error) {
            console.error('Gmail Integration: Error extracting context', error);
        }

        return context;
    }

    cleanEmailText(text) {
        if (!text) return '';
        
        return text
            .replace(/On .* wrote:/g, '')
            .replace(/From:.*?Subject:/gs, '')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 2000);
    }

    monitorElementRemoval(element) {
        const checkInterval = setInterval(() => {
            if (!document.contains(element)) {
                // Element removed, clean up overlay
                const overlay = this.overlayInstances.get(element);
                if (overlay) {
                    overlay.destroy();
                    this.overlayInstances.delete(element);
                }
                clearInterval(checkInterval);
            }
        }, 1000);
    }

    handleMessage(message, sender, sendResponse) {
        switch (message.action) {
            case 'settingsUpdated':
                // Update all overlay instances
                this.overlayInstances.forEach(overlay => {
                    overlay.updateSettings();
                });
                break;
        }
    }

    destroy() {
        if (this.observer) {
            this.observer.disconnect();
        }
        
        // Clean up all overlays
        this.overlayInstances.forEach(overlay => {
            overlay.destroy();
        });
        this.overlayInstances.clear();
    }
}

// Initialize Gmail integration
let gmailIntegration;

if (window.location.hostname === 'mail.google.com') {
    console.log('Gmail detected, initializing integration...');
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