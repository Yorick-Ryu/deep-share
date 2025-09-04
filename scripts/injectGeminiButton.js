/**
 * DeepShare Gemini Button Injector
 * Injects a DOCX conversion button into the Gemini interface
 */

(function() {
    'use strict';

    let lastUrl = location.href;
    console.debug('DeepShare: Initializing DOCX button injection for Gemini');

    function findAndInjectButtons() {
        // Find button containers with the Gemini structure
        const buttonContainers = document.querySelectorAll('.buttons-container-v2, [class*="buttons-container"]');

        buttonContainers.forEach(container => {
            // Look for the copy button within this container
            const copyButton = container.querySelector('copy-button button[data-test-id="copy-button"], copy-button button[mattooltip*="复制"], copy-button button[aria-label*="复制"], copy-button button[aria-label*="Copy"]');
            
            if (copyButton && !container.querySelector('.deepshare-gemini-docx-btn')) {
                injectButton(copyButton, container);
            }
        });
    }

    const observer = new MutationObserver(() => {
        // On any DOM change, re-check for buttons
        findAndInjectButtons();

        // Also check if URL has changed for SPA navigation
        const currentUrl = location.href;
        if (currentUrl !== lastUrl) {
            console.debug(`DeepShare: URL changed to ${currentUrl}. Re-checking for buttons.`);
            lastUrl = currentUrl;
            // A small delay can help ensure the new content is loaded
            setTimeout(findAndInjectButtons, 500);
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });

    // Initial injection check after a small delay
    setTimeout(findAndInjectButtons, 1000);

    function injectButton(copyBtn, container) {
        console.debug('Injecting DOCX button for Gemini');

        // Create the wrapper component (following Gemini's Angular component structure)
        const buttonWrapper = document.createElement('deepshare-docx-button');
        buttonWrapper.className = 'deepshare-gemini-docx-btn ng-star-inserted';
        
        // Add Angular-style attributes to match the container's attributes
        const containerNgContent = container.getAttribute('_ngcontent-ng-c1687429729') || 
                                  container.querySelector('[_ngcontent-ng-c1687429729]')?.getAttribute('_ngcontent-ng-c1687429729') || '';
        
        if (containerNgContent !== null) {
            buttonWrapper.setAttribute('_ngcontent-ng-c1687429729', containerNgContent);
        }
        buttonWrapper.setAttribute('_nghost-ng-c3341669442', '');
        buttonWrapper.classList.add('ng-tns-c1687429729-17');

        // Create the actual button element with exact same structure as icon buttons
        const docxButton = document.createElement('button');
        // 修改为icon-button类型，与thumbs up/down按钮一致
        docxButton.className = 'mdc-icon-button mat-mdc-icon-button mat-mdc-button-base mat-mdc-tooltip-trigger icon-button mat-unthemed';
        docxButton.setAttribute('_ngcontent-ng-c3341669442', '');
        docxButton.setAttribute('mat-icon-button', ''); // 改为icon-button
        docxButton.setAttribute('tabindex', '0');
        docxButton.setAttribute('mattooltip', chrome.i18n.getMessage('docxButton') || '保存为Word');
        docxButton.setAttribute('aria-label', chrome.i18n.getMessage('docxButton') || '保存为Word');
        docxButton.setAttribute('data-test-id', 'docx-button');
        docxButton.setAttribute('mat-ripple-loader-class-name', 'mat-mdc-button-ripple');
        docxButton.setAttribute('mat-ripple-loader-centered', ''); // 添加居中属性

        // Create button inner structure exactly matching Gemini's icon buttons
        docxButton.innerHTML = `
            <span class="mat-mdc-button-persistent-ripple mdc-icon-button__ripple"></span>
            <mat-icon _ngcontent-ng-c3341669442="" role="img" fonticon="description" class="mat-icon notranslate gds-icon-m google-symbols mat-ligature-font mat-icon-no-color ng-star-inserted" aria-hidden="true" data-mat-icon-type="font" data-mat-icon-name="description">
                <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style="width: 20px; height: 20px;">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                </svg>
            </mat-icon>
            <span class="mat-focus-indicator"></span>
            <span class="mat-mdc-button-touch-target"></span>
        `;

        // Add comment nodes like Angular does
        const commentStart = document.createComment('');
        const commentEnd = document.createComment('');
        
        buttonWrapper.appendChild(commentStart);
        buttonWrapper.appendChild(docxButton);
        buttonWrapper.appendChild(commentEnd);

        // Insert after the copy button's parent wrapper
        const copyButtonWrapper = copyBtn.closest('copy-button');
        if (copyButtonWrapper) {
            copyButtonWrapper.insertAdjacentElement('afterend', buttonWrapper);
        }

        // Add click handler
        docxButton.addEventListener('click', async (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            const sourceButton = e.currentTarget;

            try {
                console.debug('DOCX button clicked for Gemini');

                // Disable button during processing
                sourceButton.setAttribute('disabled', 'true');
                sourceButton.style.opacity = '0.6';

                // Click the copy button to copy content to clipboard
                copyBtn.click();

                // Wait for clipboard to be populated
                await new Promise(resolve => setTimeout(resolve, 300));

                const clipboardContent = await navigator.clipboard.readText();

                if (clipboardContent && clipboardContent.trim()) {
                    console.debug('Successfully read AI response from clipboard for Gemini');
                    const conversationData = {
                        role: 'assistant',
                        content: clipboardContent,
                    };

                    const event = new CustomEvent('deepshare:convertToDocx', {
                        detail: {
                            messages: conversationData,
                            sourceButton: sourceButton,
                        },
                    });
                    document.dispatchEvent(event);
                } else {
                    console.warn('Clipboard content was empty after clicking copy button');
                    window.showToastNotification(chrome.i18n.getMessage('getClipboardError'), 'error');
                }
            } catch (error) {
                console.error('Error getting content from Gemini:', error);
                window.showToastNotification(`${chrome.i18n.getMessage('getClipboardError')}: ${error.message}`, 'error');
            } finally {
                // Re-enable button
                sourceButton.removeAttribute('disabled');
                sourceButton.style.opacity = '1';
            }
        });

        console.debug('DOCX button successfully injected for Gemini');
    }
})();