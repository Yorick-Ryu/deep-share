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
                    // Look for copy buttons in conversation
                    const copyButtons = document.querySelectorAll('.ds-flex.abe97156 .ds-icon-button');
                    
                    copyButtons.forEach(copyBtn => {
                        // Check if this is a copy button by looking at its SVG content
                        const svgEl = copyBtn.querySelector('svg');
                        if (!svgEl) return;
                        
                        // Check if it's the copy button by looking for part of its path content
                        const pathEl = svgEl.querySelector('g path[d*="M5.03 14.64"]'); 
                        if (!pathEl) return;
                        
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
        
        while (element && maxIterations > 0) {
            // Try different class patterns that might identify a message
            if (element.classList.contains('fa81') || 
                element.classList.contains('c05b5566') || 
                element.classList.contains('ds-message')) {
                return element;
            }
            
            element = element.parentElement;
            maxIterations--;
            
            if (!element) return null;
        }
        
        return null;
    }

    // Helper function to extract conversation data
    function extractConversationData(conversationEl) {
        // More robust extraction based on the container structure
        let role = 'unknown';
        
        // Try to determine role from container classes
        if (conversationEl.classList.contains('f9bf7997') || 
            conversationEl.classList.contains('ds-message-assistant')) {
            role = 'assistant';
        } else {
            role = 'user';
        }
        
        // Try to find the content element that holds the main text
        let contentEl = conversationEl.querySelector('.ds-message-content') || 
                      conversationEl.querySelector('.markdown-body') ||
                      conversationEl;
                      
        // Extract text content
        return {
            role: role,
            content: contentEl.textContent.trim()
        };
    }

    // Initialize the observer
    observeAndInjectButton();
}

// Initialize the button injection
injectDocxButton();
