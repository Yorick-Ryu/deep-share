/**
 * DeepShare DOCX Button Injector
 * Injects a DOCX conversion button into the DeepSeek interface
 */

function injectDocxButton() {
    console.debug('Initializing DOCX button injection');
    let floatingContainer = null;

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
                            // More flexible check for copy button with prioritized strategies
                            // Strategy 1: .ds-icon-button class with role attribute and SVG path starting with M6.149
                            const isStrategy1 = copyBtn.classList.contains('ds-icon-button') &&
                                copyBtn.hasAttribute('role') &&
                                copyBtn.querySelector('svg path[d^="M6.149"]');

                            // Strategy 2 (most stable): First button with role="button"
                            const isStrategy2 = copyBtn === buttonGroup.querySelector('[role="button"]') ||
                                copyBtn === Array.from(buttonGroup.children).find(child =>
                                    child.hasAttribute('role') && child.getAttribute('role') === 'button');

                            const isCopyButton = isStrategy1 || isStrategy2;

                            if (!isCopyButton) return;

                            // Check if this is an AI response (not a user message)
                            // Strategy: Look for distinctive patterns between user messages and AI responses

                            // 1. User messages have the "d29f3d7d" class in their ds-message container
                            const isUserMessage = copyBtn.closest('.d29f3d7d, [class*="d29f3d7d"]');

                            // 2. AI responses are in containers with "_4f9bf79" class
                            const isAIContainer = copyBtn.closest('._4f9bf79, [class*="_4f9bf79"]');

                            // 3. AI responses typically have markdown content nearby
                            const nearbyMarkdown = copyBtn.closest('div').querySelector('.ds-markdown') ||
                                copyBtn.parentElement?.parentElement?.querySelector('.ds-markdown');

                            // 4. Check if button is in an AI response context
                            const isAIResponse = isAIContainer || (nearbyMarkdown && !isUserMessage);

                            // Only inject button for AI responses
                            if (isUserMessage || !isAIResponse) {
                                console.debug('Skipping injection - detected user message or not AI response context');
                                return;
                            }

                            console.debug('Detected AI response - proceeding with button injection');

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

                            // Get the icon wrapper style (font-size, width, height)
                            let iconStyle = '';
                            if (copyIcon) {
                                const iconStyleAttr = copyIcon.getAttribute('style');
                                iconStyle = iconStyleAttr || 'font-size: 16px; width: 16px; height: 16px;';
                            } else {
                                iconStyle = 'font-size: 16px; width: 16px; height: 16px;';
                            }

                            const iconHTML = `
                                <div class="ds-icon-button__hover-bg"></div>
                                <div class="ds-icon" style="${iconStyle}">
                                    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 16px; height: 16px;">
                                        <g transform="translate(10, 10) scale(1.1) translate(-10, -10)">
                                            <path d="M16 18H4C3.45 18 3 17.55 3 17V3C3 2.45 3.45 2 4 2H12L17 7V17C17 17.55 16.55 18 16 18Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
                                            <path d="M12 2V7H17" stroke="currentColor" stroke-width="1.5" fill="none"/>
                                            <path d="M6 10.5H14" stroke="currentColor" stroke-width="1.5"/>
                                            <path d="M6 14H12" stroke="currentColor" stroke-width="1.5"/>
                                        </g>
                                    </svg>
                                </div>
                            `;

                            docxButton.innerHTML = iconHTML;

                            // Insert after the copy button
                            copyBtn.parentNode.insertBefore(docxButton, copyBtn.nextSibling);

                            // Add tooltip listeners to match DeepSeek's UI
                            let tooltipWrapper = null;

                            docxButton.addEventListener('mouseenter', () => {
                                const tooltipText = docxButton.title;
                                if (!tooltipText) return;

                                // Find or create the global floating container
                                if (!floatingContainer) {
                                    floatingContainer = document.querySelector('.ds-floating-container');
                                    if (!floatingContainer) {
                                        floatingContainer = document.createElement('div');
                                        floatingContainer.className = 'ds-floating-container';
                                        floatingContainer.style.zIndex = '9999'; // Ensure it's on top
                                        document.body.appendChild(floatingContainer);
                                    }
                                }

                                // Create tooltip elements
                                tooltipWrapper = document.createElement('div');
                                tooltipWrapper.className = 'ds-floating-position-wrapper ds-theme';
                                tooltipWrapper.style.zIndex = '10000'; // Higher z-index for the tooltip itself

                                const tooltipElement = document.createElement('div');
                                tooltipElement.className = 'ds-tooltip ds-tooltip--s ds-elevated ds-theme';
                                tooltipElement.textContent = tooltipText;

                                tooltipWrapper.appendChild(tooltipElement);
                                floatingContainer.appendChild(tooltipWrapper);

                                // Position the tooltip
                                const btnRect = docxButton.getBoundingClientRect();

                                // Temporarily set opacity to 0 to measure without flashing
                                tooltipWrapper.style.opacity = '0';
                                const tooltipRect = tooltipWrapper.getBoundingClientRect();
                                tooltipWrapper.style.opacity = '1';

                                // Position below the button, centered
                                let top = btnRect.bottom + 4;
                                let left = btnRect.left + (btnRect.width / 2) - (tooltipRect.width / 2);
                                tooltipWrapper.setAttribute('data-transform-origin', 'bottom');

                                // Adjust if it goes off-screen left/right
                                if (left < 5) left = 5;
                                if ((left + tooltipRect.width) > (window.innerWidth - 5)) {
                                    left = window.innerWidth - tooltipRect.width - 5;
                                }

                                tooltipWrapper.style.top = `${top}px`;
                                tooltipWrapper.style.left = `${left}px`;
                            });

                            docxButton.addEventListener('mouseleave', () => {
                                if (tooltipWrapper) {
                                    tooltipWrapper.remove();
                                    tooltipWrapper = null;
                                }
                            });

                            // Add click handler
                            docxButton.addEventListener('click', async (e) => {
                                e.stopPropagation();

                                // Extract conversation data directly using the copy button we already have
                                const conversationData = await extractConversationData(copyBtn);

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


    // Helper function to extract conversation data
    async function extractConversationData(copyButton) {
        // Always use assistant role for docx conversion
        let role = 'assistant';

        if (copyButton) {
            let originalClipboardContent = null;
            try {
                // 1. Backup original clipboard content
                try {
                    originalClipboardContent = await navigator.clipboard.readText();
                } catch (e) {
                    console.debug('Could not backup clipboard content (this is normal if permission not granted or clipboard empty):', e);
                }

                // 2. Click the copy button to copy content to clipboard
                copyButton.click();

                // 3. Wait for clipboard to be populated
                await new Promise(resolve => setTimeout(resolve, 500));

                // 4. Get content from clipboard
                const clipboardContent = await navigator.clipboard.readText();

                // 5. Restore original clipboard content if we successfully backed it up
                if (originalClipboardContent !== null) {
                    try {
                        await navigator.clipboard.writeText(originalClipboardContent);
                        console.debug('Clipboard content restored');
                    } catch (e) {
                        console.warn('Failed to restore clipboard content:', e);
                    }
                }

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

                // Attempt restoration even on error if we had a backup
                if (originalClipboardContent !== null) {
                    try {
                        await navigator.clipboard.writeText(originalClipboardContent);
                    } catch (ex) { }
                }

                const errorMessage = error.message && error.message.includes('Read permission denied')
                    ? chrome.i18n.getMessage('clipboardPermissionError')
                    : `${chrome.i18n.getMessage('getClipboardError')}: ${error.message}`;

                window.showToastNotification(errorMessage, 'error');
                return null;
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
