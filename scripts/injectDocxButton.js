/**
 * DeepShare DOCX Button Injector
 * Injects a DOCX conversion button into the DeepSeek interface
 */

function injectDocxButton() {
    console.log('Initializing DOCX button injection');

    // Function to observe and inject the button
    function observeAndInjectButton() {
        // Create a mutation observer to watch for the copy button
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    // More robust selector targeting button containers and groups
                    const buttonContainers = document.querySelectorAll('.ds-flex[style*="align-items"][style*="gap"], div[class*="ds-flex"][style*="align-items: center"]');

                    buttonContainers.forEach(container => {
                        // Find button groups more flexibly - look for containers with gap and align-items
                        const buttonGroup = container.querySelector('.ds-flex[style*="align-items"][style*="gap"], div[class*="ds-flex"][style*="align-items"]') || container;
                        
                        // Look for copy buttons using multiple strategies
                        let copyButtons = buttonGroup.querySelectorAll('[role="button"][tabindex]');
                        
                        // Fallback: look for clickable divs that might be buttons
                        if (copyButtons.length === 0) {
                            copyButtons = buttonGroup.querySelectorAll('div[tabindex][role], div[style*="cursor"][role]');
                        }
                        
                        // Further fallback: look for elements with button-like characteristics
                        if (copyButtons.length === 0) {
                            copyButtons = buttonGroup.querySelectorAll('div[class*="button"], div[class*="btn"], div[style*="cursor: pointer"]');
                        }

                        copyButtons.forEach(copyBtn => {
                            // More flexible check for copy button - look for SVG with copy-like paths or first button
                            const isCopyButton = copyBtn === buttonGroup.querySelector('[role="button"]') || 
                                               copyBtn.querySelector('svg path[d*="M6.14926"]') || // Copy icon path signature
                                               copyBtn === Array.from(buttonGroup.children).find(child => 
                                                   child.hasAttribute('role') && child.getAttribute('role') === 'button');

                            if (!isCopyButton) return;

                            // Check if we've already added our button next to this copy button
                            const nextSibling = copyBtn.nextElementSibling;
                            if (nextSibling && nextSibling.classList.contains('deepseek-docx-btn')) {
                                return; // Button already exists
                            }

                            // Create the DOCX button with flexible styling to match existing buttons
                            const docxButton = document.createElement('div');
                            
                            // Copy classes from the copy button to match styling
                            const copyButtonClasses = copyBtn.className;
                            docxButton.className = copyButtonClasses + ' deepseek-docx-btn';
                            
                            // Copy attributes from copy button for consistency
                            docxButton.tabIndex = copyBtn.tabIndex || -1;
                            docxButton.setAttribute('role', 'button');
                            docxButton.setAttribute('aria-disabled', 'false');
                            docxButton.title = chrome.i18n.getMessage('docxButton');
                            
                            // Copy styling from copy button
                            const copyButtonStyle = copyBtn.getAttribute('style') || '';
                            docxButton.style.cssText = copyButtonStyle;

                            // Create button inner content that matches existing icon structure
                            const copyIcon = copyBtn.querySelector('.ds-icon, svg, [class*="icon"]');
                            let iconHTML = '';
                            
                            if (copyIcon) {
                                // Get icon sizing from existing icon
                                const iconStyle = copyIcon.getAttribute('style') || '';
                                const iconClass = copyIcon.className || 'ds-icon';
                                
                                // Enhance icon size for better visibility
                                const enhancedIconStyle = iconStyle.replace(/font-size:\s*\d+px/g, 'font-size: 20px')
                                                                   .replace(/width:\s*\d+px/g, 'width: 20px')
                                                                   .replace(/height:\s*\d+px/g, 'height: 20px');
                                
                                iconHTML = `
                                    <div class="${iconClass}" style="${enhancedIconStyle || 'font-size: 20px; width: 20px; height: 20px;'}">
                                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M16 18H4C3.45 18 3 17.55 3 17V3C3 2.45 3.45 2 4 2H12L17 7V17C17 17.55 16.55 18 16 18Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
                                            <path d="M12 2V7H17" stroke="currentColor" stroke-width="1.5" fill="none"/>
                                            <path d="M6 10.5H14" stroke="currentColor" stroke-width="1.5"/>
                                            <path d="M6 14H12" stroke="currentColor" stroke-width="1.5"/>
                                            <path d="M8.5 6.5L7.5 7.5L8.5 8.5" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>
                                            <path d="M11.5 6.5L12.5 7.5L11.5 8.5" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>
                                            <path d="M10 5.5L10 9.5" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>
                                        </svg>
                                    </div>
                                `;
                            } else {
                                // Fallback icon structure
                                iconHTML = `
                                    <div class="ds-icon" style="font-size: 16px; width: 16px; height: 16px;">
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M12.8 14.4H3.2C2.76 14.4 2.4 14.04 2.4 13.6V2.4C2.4 1.96 2.76 1.6 3.2 1.6H9.6L13.6 5.6V13.6C13.6 14.04 13.24 14.4 12.8 14.4Z" stroke="currentColor" stroke-width="1.2" fill="none"/>
                                            <path d="M9.6 1.6V5.6H13.6" stroke="currentColor" stroke-width="1.2" fill="none"/>
                                            <path d="M4.8 8.4H11.2" stroke="currentColor" stroke-width="1.2"/>
                                            <path d="M4.8 11.2H9.6" stroke="currentColor" stroke-width="1.2"/>
                                            <path d="M6.8 5.2L6 6L6.8 6.8" stroke="currentColor" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round"/>
                                            <path d="M9.2 5.2L10 6L9.2 6.8" stroke="currentColor" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round"/>
                                            <path d="M8 4.4L8 7.6" stroke="currentColor" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round"/>
                                        </svg>
                                    </div>
                                `;
                            }
                            
                            docxButton.innerHTML = iconHTML;

                            // Insert after the copy button
                            copyBtn.parentNode.insertBefore(docxButton, copyBtn.nextSibling);

                            // Add tooltip listeners
                            let tooltip = null;

                            docxButton.addEventListener('mouseenter', () => {
                                // Use the button's title for the tooltip text
                                const tooltipText = docxButton.title;
                                if (!tooltipText) return;

                                tooltip = document.createElement('div');
                                tooltip.className = 'deepseek-tooltip';
                                tooltip.textContent = tooltipText;
                                document.body.appendChild(tooltip);

                                const btnRect = docxButton.getBoundingClientRect();
                                const tooltipRect = tooltip.getBoundingClientRect();

                                // Position above the button
                                let top = btnRect.top - tooltipRect.height - 10;
                                let left = btnRect.left + (btnRect.width / 2) - (tooltipRect.width / 2);

                                // Adjust if it goes off-screen top
                                if (top < 5) {
                                    top = btnRect.bottom + 8; // move below if not enough space on top
                                }

                                // Adjust if it goes off-screen left/right
                                if (left < 5) {
                                    left = 5;
                                }
                                if ((left + tooltipRect.width) > (window.innerWidth - 5)) {
                                    left = window.innerWidth - tooltipRect.width - 5;
                                }

                                tooltip.style.top = `${top}px`;
                                tooltip.style.left = `${left}px`;
                            });

                            docxButton.addEventListener('mouseleave', () => {
                                if (tooltip) {
                                    tooltip.remove();
                                    tooltip = null;
                                }
                            });

                            // Add click handler
                            docxButton.addEventListener('click', async (e) => {
                                e.stopPropagation();

                                // Find the conversation container
                                const conversationEl = findConversationElement(docxButton);
                                if (!conversationEl) {
                                    console.error('Could not find conversation element');
                                    return;
                                }

                                // Extract conversation data
                                const conversationData = await extractConversationData(conversationEl);

                                // Trigger the docx conversion and pass the button reference
                                if (conversationData) {
                                    const event = new CustomEvent('deepshare:convertToDocx', {
                                        detail: {
                                            messages: conversationData,
                                            sourceButton: docxButton // Pass the button reference
                                        }
                                    });
                                    document.dispatchEvent(event);
                                }
                            });
                        });
                    });
                }
            }
        });

        // Start observing the body with all subtrees
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Clean up on page unload
        window.addEventListener('beforeunload', () => {
            observer.disconnect();
        });
    }

    // Helper function to find the conversation element
    function findConversationElement(buttonEl) {
        // Search for parent elements that might contain the conversation
        let element = buttonEl;
        let maxIterations = 10; // Safety check to prevent infinite loop

        console.debug('Finding conversation element starting from button:', buttonEl);

        while (element && maxIterations > 0) {
            // Try different class patterns that might identify a message
            // New class patterns based on the latest HTML structure
            if (element.classList.contains('_4f9bf79') || // Assistant message container
                element.classList.contains('_43c05b5') || // Assistant message class
                element.classList.contains('fbb737a4') || // Content container
                element.classList.contains('dad65929') || // Main conversation container
                element.classList.contains('ds-message')) {

                console.debug('Found conversation element with class:', [...element.classList]);
                return element;
            }

            element = element.parentElement;
            maxIterations--;

            if (!element) {
                console.debug('Reached null parent element');
                return null;
            }
        }

        // Fallback: Check if we're inside a message container by looking at parent structure
        element = buttonEl;
        let buttonContainer = buttonEl.closest('.ds-flex[style*="align-items"][style*="gap"], div[class*="ds-flex"][style*="align-items"]');

        if (buttonContainer) {
            // Try to find the closest message container by walking up a few levels
            let parent = buttonContainer.parentElement;
            for (let i = 0; i < 5; i++) { // Fixed A5 to 5
                if (!parent) break;

                // Check for message container classes from the HTML sample
                if (parent.classList.contains('_9663006') ||
                    parent.classList.contains('_4f9bf79') ||
                    parent.classList.contains('_43c05b5')) {
                    console.debug('Found message container through fallback method:', parent);
                    return parent;
                }

                // Check if this element contains markdown content (likely an assistant message)
                if (parent.querySelector('.ds-markdown')) {
                    console.debug('Found message container with markdown content:', parent);
                    return parent;
                }

                parent = parent.parentElement;
            }
        }

        console.error('Could not find conversation element after trying all methods');
        return null;
    }

    // Helper function to extract conversation data
    async function extractConversationData(conversationEl) {
        // Always use assistant role for docx conversion
        let role = 'assistant';
        
        // Try to find the copy button near our conversation element with more robust selectors
        const buttonContainer = conversationEl.querySelector('.ds-flex[style*="align-items"][style*="gap"], div[class*="ds-flex"][style*="align-items"]');
        
        if (buttonContainer) {
            // More flexible copy button detection
            const copyButton = buttonContainer.querySelector('[role="button"]') || 
                              buttonContainer.querySelector('div[tabindex][role]') ||
                              buttonContainer.querySelector('div[class*="button"]:first-child') ||
                              buttonContainer.children[0]; // Last resort - first child
            
            if (copyButton) {
                try {
                    // Click the copy button to copy content to clipboard
                    copyButton.click();
                    
                    // Wait for clipboard to be populated
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    // Get content from clipboard
                    const clipboardContent = await navigator.clipboard.readText();
                    
                    if (clipboardContent) {
                        console.debug('Successfully read AI response from clipboard');
                        return {
                            role: role,
                            content: clipboardContent
                        };
                    } else {
                        console.warn('Clipboard content was empty after clicking copy button');
                        window.showToastNotification(chrome.i18n.getMessage('getClipboardError'), 'error');
                        return null;
                    }
                } catch (error) {
                    console.error('Error reading from clipboard:', error);
                    window.showToastNotification(`${chrome.i18n.getMessage('getClipboardError')}: ${error.message}`, 'error');
                    return null;
                }
            }
        }
        
        // Fallback error message if copy button isn't found
        window.showToastNotification(chrome.i18n.getMessage('getClipboardError'), 'error');
        return null;
    }

    // Initialize the observer
    observeAndInjectButton();
}

// Initialize the button injection
injectDocxButton();
