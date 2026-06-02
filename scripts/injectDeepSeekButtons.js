// This script will inject the "Save as Image" and "Save as DOCX" buttons.
console.log("injectDeepSeekButtons.js loaded");

function injectDeepSeekButtons() {
    const targetNode = document.body;

    const observer = new MutationObserver(mutationsList => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                const shareContainer = document.querySelector('._43d222b');
                if (shareContainer) {
                    const buttonContainer = shareContainer.querySelector('.fab07e97');
                    const createLinkButton = buttonContainer?.querySelector('.ds-basic-button--primary:not(#save-as-image-btn):not(#save-as-docx-btn), .ds-button--primary:not(#save-as-image-btn):not(#save-as-docx-btn)');

                    if (buttonContainer && createLinkButton) {
                        // Inject "Save as Image" button if it doesn't exist
                        if (!document.getElementById('save-as-image-btn')) {
                            const saveAsImageButton = createLinkButton.cloneNode(true);
                            saveAsImageButton.id = 'save-as-image-btn';
                            saveAsImageButton.querySelector('span').textContent = chrome.i18n?.getMessage('saveAsImageButton');
                            
                            hideClonedButtonIcon(saveAsImageButton);

                            saveAsImageButton.addEventListener('click', () => {
                                document.dispatchEvent(new Event('deepshare:saveAsImage'));
                            });

                            buttonContainer.insertBefore(saveAsImageButton, createLinkButton);
                        }

                        // Inject "Save as DOCX" button if it doesn't exist
                        const saveAsImageButton = document.getElementById('save-as-image-btn');
                        if (saveAsImageButton && !document.getElementById('save-as-docx-btn')) {
                            const saveAsDocxButton = saveAsImageButton.cloneNode(true);
                            saveAsDocxButton.id = 'save-as-docx-btn';
                            saveAsDocxButton.querySelector('span').textContent = chrome.i18n?.getMessage('docxButton');
                            
                            saveAsDocxButton.addEventListener('click', () => {
                                document.dispatchEvent(new Event('deepshare:saveAsDocx'));
                            });

                            buttonContainer.insertBefore(saveAsDocxButton, saveAsImageButton);

                            const syncDisabledState = () => syncClonedButtonsDisabled(createLinkButton, [saveAsImageButton, saveAsDocxButton]);
                            syncDisabledState();

                            // Observe the createLinkButton for state changes
                            const buttonObserver = new MutationObserver(syncDisabledState);

                            buttonObserver.observe(createLinkButton, { attributes: true, attributeFilter: ['aria-disabled', 'class'] });
                        }
                    }
                }
            }
        }
    });

    observer.observe(targetNode, { childList: true, subtree: true });
}

function hideClonedButtonIcon(button) {
    const iconWrapper = button.querySelector('.ds-button__icon');
    if (iconWrapper) {
        iconWrapper.style.display = 'none';
        return;
    }

    const iconContainer = button.querySelector('.ds-icon');
    if (iconContainer) {
        iconContainer.remove();
    }
}

function syncClonedButtonsDisabled(sourceButton, buttons) {
    const isDisabled = isButtonDisabled(sourceButton);

    buttons.forEach(button => {
        if (!button) return;

        button.disabled = isDisabled;
        button.setAttribute('aria-disabled', isDisabled.toString());
        button.style.pointerEvents = isDisabled ? 'none' : '';

        if (isDisabled) {
            button.classList.add('ds-atom-button--disabled', 'ds-button--disabled');
        } else {
            button.classList.remove('ds-atom-button--disabled', 'ds-button--disabled');
        }
    });
}

function isButtonDisabled(button) {
    return button.getAttribute('aria-disabled') === 'true' ||
        button.classList.contains('ds-atom-button--disabled') ||
        button.classList.contains('ds-button--disabled');
}

injectDeepSeekButtons();
