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
                    const createLinkButton = buttonContainer?.querySelector('.ds-basic-button--primary');

                    if (buttonContainer && createLinkButton) {
                        // Inject "Save as Image" button if it doesn't exist
                        if (!document.getElementById('save-as-image-btn')) {
                            const saveAsImageButton = createLinkButton.cloneNode(true);
                            saveAsImageButton.id = 'save-as-image-btn';
                            saveAsImageButton.querySelector('span').textContent = chrome.i18n.getMessage('saveAsImageButton');
                            
                            const iconContainer = saveAsImageButton.querySelector('.ds-icon');
                            if (iconContainer) {
                                iconContainer.remove();
                            }

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
                            saveAsDocxButton.querySelector('span').textContent = chrome.i18n.getMessage('docxButton');
                            
                            saveAsDocxButton.addEventListener('click', () => {
                                document.dispatchEvent(new Event('deepshare:saveAsDocx'));
                            });

                            buttonContainer.insertBefore(saveAsDocxButton, saveAsImageButton);
                        }
                    }
                }
            }
        }
    });

    observer.observe(targetNode, { childList: true, subtree: true });
}

injectDeepSeekButtons();
