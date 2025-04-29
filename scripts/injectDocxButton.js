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
                    // Updated selector to match new DOM structure
                    const buttonContainers = document.querySelectorAll('.ds-flex[style*="margin-top: 12px"][style*="height: 20px"][style*="align-items: center"]');

                    buttonContainers.forEach(container => {
                        // Find the button container within this container - updated to support both gap values
                        const buttonGroup = container.querySelector('.ds-flex[style*="align-items: center"][style*="gap: 16px"], .ds-flex[style*="align-items: center"][style*="gap: 12px"], .ds-flex._965abe9');
                        if (!buttonGroup) return;

                        // Look for copy buttons
                        const copyButtons = buttonGroup.querySelectorAll('.ds-icon-button');

                        copyButtons.forEach(copyBtn => {
                            // Check if this is a copy button (first button in the new structure)
                            const isCopyButton = copyBtn === buttonGroup.querySelector('.ds-icon-button:first-child');

                            if (!isCopyButton) return;

                            // Check if we've already added our button next to this copy button
                            const nextSibling = copyBtn.nextElementSibling;
                            if (nextSibling && nextSibling.classList.contains('deepseek-docx-btn')) {
                                return; // Button already exists
                            }

                            // Create the DOCX button
                            const docxButton = document.createElement('div');
                            docxButton.className = 'ds-icon-button deepseek-docx-btn';
                            docxButton.tabIndex = 0;
                            docxButton.title = chrome.i18n.getMessage('docxButton');
                            docxButton.style = '--ds-icon-button-text-color: #909090; --ds-icon-button-size: 20px;';

                            // Create button inner content with outline icon (not filled)
                            docxButton.innerHTML = `
                                <div class="ds-icon" style="font-size: 20px; width: 20px; height: 20px;">
                                    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
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

                            // Insert after the copy button
                            copyBtn.parentNode.insertBefore(docxButton, copyBtn.nextSibling);

                            // Add click handler
                            docxButton.addEventListener('click', (e) => {
                                e.stopPropagation();

                                // Find the conversation container
                                const conversationEl = findConversationElement(docxButton);
                                if (!conversationEl) {
                                    console.error('Could not find conversation element');
                                    return;
                                }

                                // Extract conversation data
                                const conversationData = extractConversationData(conversationEl);

                                // Trigger the docx conversion and pass the button reference
                                const event = new CustomEvent('deepshare:convertToDocx', {
                                    detail: {
                                        messages: conversationData,
                                        sourceButton: docxButton // Pass the button reference
                                    }
                                });
                                document.dispatchEvent(event);
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
        let buttonContainer = buttonEl.closest('.ds-flex[style*="align-items: center"][style*="gap: 16px"], .ds-flex[style*="align-items: center"][style*="gap: 12px"], .ds-flex._965abe9');

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
    function extractConversationData(conversationEl) {
        // More robust extraction based on the container structure
        let role = 'unknown';
        let contentEl;

        // Try to determine role from container classes based on the HTML sample
        if (conversationEl.classList.contains('_4f9bf79') ||
            conversationEl.classList.contains('_43c05b5') ||
            conversationEl.classList.contains('d7dc56a8')) {
            role = 'assistant';
            // For assistant messages, look for markdown content
            contentEl = conversationEl.querySelector('.ds-markdown') || conversationEl;
        } else if (conversationEl.classList.contains('_9663006')) {
            role = 'user';
            // For user messages, look for the content container
            contentEl = conversationEl.querySelector('.fbb737a4') || conversationEl;
        } else {
            // Try to infer the role by looking at the content structure
            if (conversationEl.querySelector('.ds-markdown')) {
                role = 'assistant';
                contentEl = conversationEl.querySelector('.ds-markdown');
            } else if (conversationEl.querySelector('.fbb737a4')) {
                role = 'user';
                contentEl = conversationEl.querySelector('.fbb737a4');
            } else {
                // Default fallback
                contentEl = conversationEl;
            }
        }

        // Extract text content, ensuring we get a clean string
        const content = contentEl ? contentEl.textContent.trim() : '';
        console.debug(`Extracted ${role} content:`, content.substring(0, 50) + (content.length > 50 ? '...' : ''));

        return {
            role: role,
            content: content
        };
    }

    // Initialize the observer
    observeAndInjectButton();
}

// Initialize the button injection
injectDocxButton();
