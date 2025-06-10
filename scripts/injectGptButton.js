/**
 * DeepShare ChatGPT Button Injector
 * Injects a DOCX conversion button into the ChatGPT interface.
 */

function injectGptDocxButton() {
    console.log('Initializing DOCX button injection for ChatGPT');

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length) {
                // More specific selector for the button group
                const buttonGroups = document.querySelectorAll('div[class*="group-hover/turn-messages"]');

                buttonGroups.forEach(group => {
                    const copyButton = group.querySelector('button[data-testid="copy-turn-action-button"]');
                    if (copyButton && !group.querySelector('.deepshare-docx-btn')) {
                        injectButton(copyButton);
                    }
                });
            }
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });

    function injectButton(copyBtn) {
        // Create the DOCX button
        const docxButton = document.createElement('button');
        docxButton.className = 'text-token-text-secondary hover:bg-token-bg-secondary rounded-lg deepshare-docx-btn';
        docxButton.setAttribute('aria-label', chrome.i18n.getMessage('docxButton') || 'Save as Word document');
        
        const span = document.createElement('span');
        span.className = 'touch:w-10 flex h-8 w-8 items-center justify-center';
        
        // Re-use the SVG from injectDocxButton.js for style consistency
        span.innerHTML = `
            <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 20px; height: 20px;">
                <path d="M16 18H4C3.45 18 3 17.55 3 17V3C3 2.45 3.45 2 4 2H12L17 7V17C17 17.55 16.55 18 16 18Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
                <path d="M12 2V7H17" stroke="currentColor" stroke-width="1.5" fill="none"/>
                <path d="M6 10.5H14" stroke="currentColor" stroke-width="1.5"/>
                <path d="M6 14H12" stroke="currentColor" stroke-width="1.5"/>
            </svg>
        `;
        docxButton.appendChild(span);

        // Insert after the copy button
        copyBtn.insertAdjacentElement('afterend', docxButton);

        // Add tooltip listeners
        let tooltip = null;

        docxButton.addEventListener('mouseenter', () => {
            if (docxButton.hasAttribute('disabled')) return;

            tooltip = document.createElement('div');
            tooltip.className = 'deepshare-gpt-tooltip';
            tooltip.textContent = docxButton.getAttribute('aria-label');
            document.body.appendChild(tooltip);

            const btnRect = docxButton.getBoundingClientRect();
            const tooltipRect = tooltip.getBoundingClientRect();

            let top = btnRect.bottom + 8;
            let left = btnRect.left + (btnRect.width / 2) - (tooltipRect.width / 2);

            if (left < 5) left = 5;
            if (left + tooltipRect.width > window.innerWidth) {
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
            const sourceButton = e.currentTarget;

            try {
                // The copy button in ChatGPT might have a confirmation state.
                // We'll look for the "Copy" label to be sure.
                if (copyBtn.getAttribute('aria-label').includes(chrome.i18n.getMessage('copyButton')) || copyBtn.getAttribute('aria-label').includes('Copy')) {
                    copyBtn.click();
                } else {
                    // It may already be in a "Copied" state, so we might not need to click.
                    // Or we find the original button if the state changes the element.
                    // For now, let's assume clicking it again won't hurt.
                    copyBtn.click();
                }

                await new Promise(resolve => setTimeout(resolve, 150));

                const clipboardContent = await navigator.clipboard.readText();

                if (clipboardContent) {
                    console.log('Successfully read AI response from clipboard for ChatGPT.');
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
                    window.showToastNotification(chrome.i18n.getMessage('getClipboardError'), 'error');
                }
            } catch (error) {
                console.error('Error getting content from ChatGPT:', error);
                window.showToastNotification(`${chrome.i18n.getMessage('getClipboardError')}: ${error.message}`, 'error');
            }
        });
    }
}

// The script is injected by manifest.json only on matching URLs,
// so no need to check hostname here.
injectGptDocxButton(); 