/**
 * DeepShare Notification Utility
 * Displays notifications using DeepSeek's native toast notification style
 */

// Store notifications by ID to allow specific dismissals
const activeToasts = new Map();
let toastCounter = 0;

// Function to show a toast notification in DeepSeek's native style
function showToastNotification(message, type = 'success', duration = 2000) {
    const toastId = ++toastCounter;
    
    // Check if there's already an existing notification container
    let container = document.querySelector('.ds-toast-container');
    
    // If no container exists, create one matching DeepSeek's structure
    if (!container) {
        container = document.createElement('div');
        container.className = 'ds-toast-container';
        container.style.cssText = `
            position: fixed;
            top: 16px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 9999;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            width: auto;
            pointer-events: none;
        `;
        
        document.body.appendChild(container);
    }
    
    // Create animation wrapper
    const animationWrapper = document.createElement('div');
    animationWrapper.className = 'ds-toast-animation';
    animationWrapper.dataset.toastId = toastId;
    animationWrapper.style.cssText = `
        pointer-events: auto;
        margin: 0 auto;
        display: flex;
        justify-content: center;
        width: auto;
    `;
    
    // Detect dark mode
    const isDarkMode = document.documentElement.classList.contains('dark') || 
                       document.body.classList.contains('dark') ||
                       window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Create toast element with appropriate dark mode styling
    const toast = document.createElement('div');
    toast.className = `ds-toast ds-toast--plain ds-toast--${type}`;
    toast.style.cssText = `
        background-color: ${isDarkMode ? '#3a3a45' : 'white'};
        color: ${isDarkMode ? '#e0e0e0' : '#333'};
        border-radius: 8px;
        box-shadow: ${isDarkMode ? '0 2px 12px rgba(0, 0, 0, 0.4)' : '0 2px 12px rgba(0, 0, 0, 0.15)'};
        padding: 8px 16px;
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 200px;
        max-width: 80vw;
    `;
    
    // Add icon based on type
    let iconSVG;
    let iconColor;
    
    if (type === 'success') {
        iconSVG = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 20 20"><g fill="none"><path d="M10 2a8 8 0 1 1 0 16a8 8 0 0 1 0-16zm3.358 5.646a.5.5 0 0 0-.637-.057l-.07.057L9 11.298L7.354 9.651l-.07-.058a.5.5 0 0 0-.695.696l.057.07l2 2l.07.057a.5.5 0 0 0 .568 0l.07-.058l4.004-4.004l.058-.07a.5.5 0 0 0-.058-.638z" fill="currentColor"></path></g></svg>';
        iconColor = '#4caf50';
    } else if (type === 'error') {
        iconSVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><g fill="none"><path d="M10 2a8 8 0 1 1 0 16a8 8 0 0 1 0-16zm0 1.5a6.5 6.5 0 1 0 0 13a6.5 6.5 0 0 0 0-13zM10 9a1 1 0 0 1 1 1v3a1 1 0 1 1-2 0v-3a1 1 0 0 1 1-1zm0-3a1 1 0 1 1 0 2a1 1 0 0 1 0-2z" fill="currentColor"></path></g></svg>';
        iconColor = '#f44336';
    } else { // info type
        iconSVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><g fill="none"><path d="M10 2a8 8 0 1 1 0 16a8 8 0 0 1 0-16zm0 1.5a6.5 6.5 0 1 0 0 13a6.5 6.5 0 0 0 0-13zM10 6a1 1 0 0 1 1 1v5a1 1 0 1 1-2 0V7a1 1 0 0 1 1-1zm0 9a1 1 0 1 1 0-2a1 1 0 0 1 0 2z" fill="currentColor"></path></g></svg>';
        iconColor = '#2196f3';
    }

    // Create icon container
    const iconDiv = document.createElement('div');
    iconDiv.className = 'ds-toast__icon';
    iconDiv.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        flex-shrink: 0;
        color: ${iconColor};
    `;
    iconDiv.innerHTML = iconSVG;
    
    // Create content
    const contentDiv = document.createElement('div');
    contentDiv.className = 'ds-toast__content';
    contentDiv.style.cssText = `
        flex: 1;
        font-size: 14px;
        line-height: 1.5;
    `;
    contentDiv.textContent = message;
    
    // Create close button with consistent styling in dark mode
    const closeDiv = document.createElement('div');
    closeDiv.className = 'ds-toast__close';
    closeDiv.style.cssText = `
        width: 16px;
        height: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        opacity: 0.6;
        transition: opacity 0.2s ease;
        flex-shrink: 0;
        color: ${isDarkMode ? '#e0e0e0' : '#333'};
    `;
    closeDiv.innerHTML = '<svg viewBox="0 0 10 11" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M9.314 1.187a.97.97 0 0 1 0 1.373L2.059 9.815A.97.97 0 1 1 .686 8.443l7.255-7.256a.97.97 0 0 1 1.373 0z" fill="currentColor"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M.686 1.185a.97.97 0 0 1 1.373 0l7.255 7.256A.97.97 0 0 1 7.94 9.814L.686 2.558a.97.97 0 0 1 0-1.373z" fill="currentColor"></path></svg>';
    
    // Add hover effect to close button
    closeDiv.addEventListener('mouseenter', () => {
        closeDiv.style.opacity = '1';
    });
    
    closeDiv.addEventListener('mouseleave', () => {
        closeDiv.style.opacity = '0.6';
    });
    
    // Assemble the toast
    toast.appendChild(iconDiv);
    toast.appendChild(contentDiv);
    toast.appendChild(closeDiv);
    
    // Add toast to animation wrapper
    animationWrapper.appendChild(toast);
    
    // Add to container
    container.appendChild(animationWrapper);
    
    // Apply fade-in animation
    animationWrapper.animate(
        [
            { opacity: 0, transform: 'translateY(10px) scale(0.95)' },
            { opacity: 1, transform: 'translateY(0) scale(1)' }
        ],
        { duration: 300, fill: 'forwards', easing: 'ease-out' }
    );
    
    // Function to remove the toast with animation
    function removeToast() {
        clearTimeout(timeoutId);
        activeToasts.delete(toastId);
        
        const fadeOutAnimation = animationWrapper.animate(
            [
                { opacity: 1, transform: 'translateY(0) scale(1)' },
                { opacity: 0, transform: 'translateY(-10px) scale(0.95)' }
            ],
            { duration: 300, fill: 'forwards', easing: 'ease-in' }
        );
        
        fadeOutAnimation.onfinish = () => {
            if (container.contains(animationWrapper)) {
                container.removeChild(animationWrapper);
            }
            
            // If no more toasts, remove the container
            if (container.children.length === 0) {
                if (document.body.contains(container)) {
                    document.body.removeChild(container);
                }
            }
        };
    }
    
    // Handle close button click
    closeDiv.addEventListener('click', () => {
        removeToast();
    });
    
    // Store the removeToast function so we can call it programmatically
    activeToasts.set(toastId, removeToast);
    
    // Auto-remove after duration (if not info type)
    const timeoutId = setTimeout(() => {
        removeToast();
    }, duration);
    
    return toastId; // Return ID for programmatic dismissal
}

// Function to dismiss a specific notification by ID
function dismissToastNotification(id) {
    const removeToast = activeToasts.get(id);
    if (removeToast) {
        removeToast();
        return true;
    }
    return false;
}

// Export the functions for other scripts to use
window.showToastNotification = showToastNotification;
window.dismissToastNotification = dismissToastNotification;
