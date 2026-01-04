/**
 * DeepShare Notification Utility
 * A modern, beautiful toast notification system with glassmorphism and dark mode support.
 */

(function () {
    // --- Styles ---
    const styles = `
        :root {
            --ds-toast-bg-light: rgba(255, 255, 255, 0.85);
            --ds-toast-bg-dark: rgba(30, 30, 35, 0.85);
            --ds-toast-border-light: rgba(255, 255, 255, 0.5);
            --ds-toast-border-dark: rgba(255, 255, 255, 0.1);
            --ds-toast-text-light: #1f2937;
            --ds-toast-text-dark: #f3f4f6;
            --ds-toast-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
            --ds-toast-font: 'Inter', system-ui, -apple-system, sans-serif;
            --ds-toast-z-index: 9999;
        }

        .ds-toast-container {
            position: fixed;
            top: 24px;
            left: 50%;
            transform: translateX(-50%);
            z-index: var(--ds-toast-z-index);
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
            pointer-events: none;
            width: auto;
            max-width: 90vw;
        }

        .ds-toast {
            pointer-events: auto;
            display: flex;
            align-items: flex-start;
            padding: 12px 16px;
            background: var(--ds-toast-bg-light);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid var(--ds-toast-border-light);
            border-radius: 12px;
            box-shadow: var(--ds-toast-shadow);
            color: var(--ds-toast-text-light);
            font-family: var(--ds-toast-font);
            min-width: 300px;
            max-width: 400px;
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
            animation: ds-toast-enter 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        /* Dark Mode Support */
        @media (prefers-color-scheme: dark) {
            .ds-toast {
                background: var(--ds-toast-bg-dark);
                border-color: var(--ds-toast-border-dark);
                color: var(--ds-toast-text-dark);
            }
        }
        
        /* Manual Dark Mode Override */
        body.dark .ds-toast, html.dark .ds-toast {
            background: var(--ds-toast-bg-dark);
            border-color: var(--ds-toast-border-dark);
            color: var(--ds-toast-text-dark);
        }

        @keyframes ds-toast-enter {
            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }

        @keyframes ds-toast-exit {
            to {
                opacity: 0;
                transform: translateY(-10px) scale(0.95);
            }
        }

        .ds-toast.exiting {
            animation: ds-toast-exit 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .ds-toast__icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
            margin-right: 12px;
            flex-shrink: 0;
            /* Optical alignment for 24px icon with 20px line-height text (approx) */
            margin-top: 0px; 
        }

        .ds-toast__content {
            flex: 1;
            font-size: 14px;
            line-height: 1.5; /* 21px */
            font-weight: 500;
            padding-top: 1.5px; /* (24 - 21) / 2 = 1.5px to center text with icon */
        }

        .ds-toast__close {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 20px;
            height: 20px;
            margin-left: 12px;
            cursor: pointer;
            opacity: 0.5;
            transition: opacity 0.2s;
            flex-shrink: 0;
            margin-top: 2px; /* Align with icon center */
        }

        .ds-toast__close:hover {
            opacity: 1;
        }

        /* Icon Colors */
        .ds-toast--success .ds-toast__icon { color: #10b981; }
        .ds-toast--error .ds-toast__icon { color: #ef4444; }
        .ds-toast--info .ds-toast__icon { color: #3b82f6; }
        .ds-toast--loading .ds-toast__icon { color: #3b82f6; }

        /* Spinner */
        @keyframes ds-spin {
            to { transform: rotate(360deg); }
        }
        .ds-spinner {
            animation: ds-spin 1s linear infinite;
        }
    `;

    // --- Icons ---
    const icons = {
        success: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
        error: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
        info: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`,
        loading: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ds-spinner"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>`,
        close: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`
    };

    // --- State ---
    const activeToasts = new Map();
    let toastIdCounter = 0;

    // --- Initialization ---
    function injectStyles() {
        if (!document.getElementById('ds-toast-styles')) {
            const styleSheet = document.createElement('style');
            styleSheet.id = 'ds-toast-styles';
            styleSheet.textContent = styles;
            document.head.appendChild(styleSheet);
        }
    }

    function getContainer() {
        let container = document.querySelector('.ds-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'ds-toast-container';
            document.body.appendChild(container);
        }
        return container;
    }

    // --- Core Function ---
    function showToastNotification(message, type = 'success', duration = 3000) {
        injectStyles();
        const container = getContainer();
        const id = ++toastIdCounter;

        const toast = document.createElement('div');
        toast.className = `ds-toast ds-toast--${type}`;
        toast.setAttribute('role', 'alert');

        // Icon
        const iconDiv = document.createElement('div');
        iconDiv.className = 'ds-toast__icon';
        iconDiv.innerHTML = icons[type] || icons.info;

        // Content
        const contentDiv = document.createElement('div');
        contentDiv.className = 'ds-toast__content';

        // Strip HTML tags to show only plain text in toasts (avoid raw HTML showing as text)
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = message;
        contentDiv.textContent = tempDiv.textContent || tempDiv.innerText || message;

        // Close Button
        const closeDiv = document.createElement('div');
        closeDiv.className = 'ds-toast__close';
        closeDiv.innerHTML = icons.close;
        closeDiv.onclick = (e) => {
            e.stopPropagation();
            dismissToastNotification(id);
        };

        toast.appendChild(iconDiv);
        toast.appendChild(contentDiv);
        toast.appendChild(closeDiv);

        container.appendChild(toast);

        // Auto dismiss
        let timeoutId;
        if (duration > 0 && type !== 'loading') {
            timeoutId = setTimeout(() => {
                dismissToastNotification(id);
            }, duration);
        }

        // Store reference
        activeToasts.set(id, { element: toast, timeoutId });

        return id;
    }

    function dismissToastNotification(id) {
        const toastData = activeToasts.get(id);
        if (!toastData) return false;

        const { element, timeoutId } = toastData;

        if (timeoutId) clearTimeout(timeoutId);
        activeToasts.delete(id);

        // Add exit animation class
        element.classList.add('exiting');

        // Remove from DOM after animation
        element.addEventListener('animationend', () => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
            // Cleanup container if empty
            const container = document.querySelector('.ds-toast-container');
            if (container && container.children.length === 0) {
                container.remove();
            }
        });

        return true;
    }

    // --- Export ---
    window.showToastNotification = showToastNotification;
    window.dismissToastNotification = dismissToastNotification;

})();
