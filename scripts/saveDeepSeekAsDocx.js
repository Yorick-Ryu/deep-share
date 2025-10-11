// This script handles saving selected DeepSeek conversations as a DOCX file.
console.log("saveDeepSeekAsDocx.js loaded");

document.addEventListener('deepshare:saveAsDocx', async () => {
    console.log('Save as DOCX clicked');
    try {
        const messages = await getSelectedDeepSeekMessages();
        if (messages.length === 0) {
            window.showToastNotification(chrome.i18n.getMessage('noMessageSelected') || 'Please select at least one message', 'error');
            return;
        }
        const content = messages.map(m => `**${m.role}**: \n${m.content}`).join('\n\n---\n\n');
        
        // Dispatch event for docxConverter to handle
        document.dispatchEvent(new CustomEvent('deepshare:convertToDocx', {
            detail: {
                messages: { content: content },
                sourceButton: document.getElementById('save-as-docx-btn')
            }
        }));

    } catch (error) {
        if (error.message === 'NO_SELECTION') {
            window.showToastNotification(chrome.i18n.getMessage('noMessageSelected') || 'Please select at least one message', 'error');
        } else {
            console.error('Error getting messages for DOCX conversion:', error);
            window.showToastNotification('Error getting messages.', 'error');
        }
    }
});

async function getSelectedDeepSeekMessages() {
    const messages = [];
    const messageCheckboxes = document.querySelectorAll('.d30139ff .ds-checkbox');
    
    if (messageCheckboxes.length === 0) {
        return []; // No selection interface found
    }

    const selectedCheckboxes = Array.from(messageCheckboxes).filter(checkbox => checkbox.classList.contains('ds-checkbox--active'));

    if (selectedCheckboxes.length === 0) {
        throw new Error('NO_SELECTION');
    }

    for (const checkbox of selectedCheckboxes) {
        const messageDiv = checkbox.closest('._9663006, [class*="_4f9bf79"]');
        if (messageDiv) {
            if (messageDiv.matches('._9663006') || messageDiv.querySelector('.d29f3d7d')) {
                const userElement = messageDiv.querySelector('.fbb737a4');
                const userText = Array.from(userElement?.childNodes || [])
                    .find(node => node.nodeType === Node.TEXT_NODE)?.textContent?.trim();
                if (userText) {
                    messages.push({
                        role: "User",
                        content: userText
                    });
                }
            } else {
                const copyButton = messageDiv.querySelector('.ds-icon-button svg path[d*="M6.14926"]')?.closest('[role="button"]');
                if (copyButton) {
                    try {
                        const content = await getContentViaCopyButton(copyButton);
                        if (content) {
                            messages.push({
                                role: "Assistant",
                                content: content
                            });
                        }
                    } catch (error) {
                        console.error('Failed to get content via copy button:', error);
                        const response = messageDiv.querySelector('.ds-markdown')?.textContent.trim() || '';
                        if (response) {
                            messages.push({
                                role: "Assistant",
                                content: response
                            });
                        }
                    }
                } else {
                     const response = messageDiv.querySelector('.ds-markdown')?.textContent.trim() || '';
                    if (response) {
                        messages.push({
                            role: "Assistant",
                            content: response
                        });
                    }
                }
            }
        }
    }
    
    return messages;
}

function getContentViaCopyButton(copyButton) {
    return new Promise(async (resolve, reject) => {
        let originalClipboard = '';
        try {
            originalClipboard = await navigator.clipboard.readText();
        } catch (clipError) {
            console.warn('Could not read clipboard:', clipError.message);
        }
        
        copyButton.click();
        
        setTimeout(async () => {
            try {
                const clipboardContent = await navigator.clipboard.readText();
                if (originalClipboard) {
                    await navigator.clipboard.writeText(originalClipboard);
                }
                resolve(clipboardContent);
            } catch (error) {
                reject(error);
            }
        }, 300);
    });
}


// This function is now standalone and not called directly by an event listener in this file.
// It's called by the event listener for 'deepshare:saveAsDocx'

