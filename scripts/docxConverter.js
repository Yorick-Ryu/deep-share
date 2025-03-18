/**
 * DeepShare DOCX Converter Module
 * Handles conversion of conversation to DOCX format
 */

// Function to initialize the DOCX conversion feature
function initDocxConverter() {
    console.log('DOCX converter initialized');
    
    // Listen for messages from the main content script
    document.addEventListener('deepshare:convertToDocx', async (event) => {
        const message = event.detail?.messages || {};
        const sourceButton = event.detail?.sourceButton; // New: get the source button
        await convertToDocx(message, sourceButton);
    });
}

// Function to handle the conversion process
async function convertToDocx(message, sourceButton) {
    try {
        // Step 1: Find the correct copy button that's next to the clicked DOCX button
        let copyBtn;
        
        // If we have the sourceButton reference, use it to find the adjacent copy button
        if (sourceButton && sourceButton instanceof Element) {
            // The copy button should be the previous sibling of the DOCX button
            copyBtn = sourceButton.previousElementSibling;
            if (!copyBtn || !copyBtn.classList.contains('ds-icon-button')) {
                throw new Error('Copy button not found next to the DOCX button');
            }
        } else {
            // Fallback to the old method if somehow sourceButton is not available
            const docxBtn = document.querySelector('.deepseek-docx-btn');
            if (!docxBtn) {
                throw new Error('DOCX button not found');
            }
            
            copyBtn = docxBtn.previousElementSibling;
            if (!copyBtn || !copyBtn.classList.contains('ds-icon-button')) {
                throw new Error('Copy button not found');
            }
        }
        
        // Click the copy button to copy content to clipboard
        copyBtn.click();
        
        // Wait for clipboard to be populated
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Step 2: Get content from clipboard
        const clipboardContent = await navigator.clipboard.readText();
        if (!clipboardContent) {
            throw new Error('Failed to get content from clipboard');
        }
        
        // Step 3: Call the conversion API
        const response = await fetch('http://127.0.0.1:8000/convert-text', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: clipboardContent,
                filename: generateFilename(message)
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API error: ${response.status} ${errorText}`);
        }
        
        // Step 4: Download the file
        const blob = await response.blob();
        const filename = response.headers.get('content-disposition')?.split('filename=')[1] || 'document.docx';
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        
        // Clean up
        URL.revokeObjectURL(url);
        showSuccessNotification();
        
    } catch (error) {
        console.error('DOCX conversion failed:', error);
        showErrorNotification(error.message);
    }
}

// Helper function to generate a filename based on the message content
function generateFilename(message) {
    const role = message.role || 'conversation';
    const content = message.content || '';
    
    // Extract the first line or first few words for the filename
    let filename = content.split('\n')[0] || 'document';
    // Limit length and remove special characters
    filename = filename.substring(0, 30).trim().replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '_');
    
    // Add role and timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    return `deepseek_${role}_${filename}_${timestamp}`;
}

// Function to show a success notification
function showSuccessNotification() {
    const notification = document.createElement('div');
    notification.className = 'deepseek-notification success';
    notification.textContent = chrome.i18n.getMessage('docxConversionSuccess');
    
    // Style the notification
    Object.assign(notification.style, {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        padding: '10px 20px',
        backgroundColor: '#4caf50',
        color: 'white',
        borderRadius: '4px',
        boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
        zIndex: '9999',
        opacity: '0',
        transition: 'opacity 0.3s ease'
    });
    
    document.body.appendChild(notification);
    
    // Fade in
    setTimeout(() => {
        notification.style.opacity = '1';
    }, 10);
    
    // Fade out and remove after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Function to show an error notification
function showErrorNotification(errorMessage) {
    const notification = document.createElement('div');
    notification.className = 'deepseek-notification error';
    
    // Add error message
    const defaultMessage = chrome.i18n.getMessage('docxConversionError');
    notification.textContent = defaultMessage;
    
    // Add details if available
    if (errorMessage) {
        const details = document.createElement('div');
        details.style.fontSize = '0.8em';
        details.style.marginTop = '5px';
        details.textContent = errorMessage;
        notification.appendChild(details);
    }
    
    // Style the notification
    Object.assign(notification.style, {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        padding: '10px 20px',
        backgroundColor: '#f44336',
        color: 'white',
        borderRadius: '4px',
        boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
        zIndex: '9999',
        opacity: '0',
        transition: 'opacity 0.3s ease'
    });
    
    document.body.appendChild(notification);
    
    // Fade in
    setTimeout(() => {
        notification.style.opacity = '1';
    }, 10);
    
    // Fade out and remove after 5 seconds for errors (longer than success)
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 5000);
}

// Initialize the module
initDocxConverter();
