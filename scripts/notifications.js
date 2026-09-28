/**
 * DeepShare Notification Utility
 * A modern, beautiful toast notification system with glassmorphism and dark mode support.
 */

(function () {
    // Use a plugin-specific namespace: DeepSeek also defines .ds-toast classes.
    // --- Styles ---
    const styles = `
        :root {
            --deepshare-toast-bg-light: rgba(255, 255, 255, 0.85);
            --deepshare-toast-bg-dark: rgba(30, 30, 35, 0.85);
            --deepshare-toast-border-light: rgba(255, 255, 255, 0.5);
            --deepshare-toast-border-dark: rgba(255, 255, 255, 0.1);
            --deepshare-toast-text-light: #1f2937;
            --deepshare-toast-text-dark: #f3f4f6;
            --deepshare-toast-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
            --deepshare-toast-font: 'Inter', system-ui, -apple-system, sans-serif;
            --deepshare-toast-z-index: 9999;
        }

        .deepshare-toast-container {
            position: fixed;
            top: 24px;
            left: 50%;
            transform: translateX(-50%);
            z-index: var(--deepshare-toast-z-index);
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
            pointer-events: none;
            width: auto;
            max-width: 90vw;
        }

        .deepshare-toast {
            pointer-events: auto;
            display: flex;
            align-items: center;
            padding: 12px 16px;
            background: var(--deepshare-toast-bg-light);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid var(--deepshare-toast-border-light);
            border-radius: 12px;
            box-shadow: var(--deepshare-toast-shadow);
            color: var(--deepshare-toast-text-light);
            font-family: var(--deepshare-toast-font);
            min-width: 300px;
            max-width: 400px;
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
            animation: deepshare-toast-enter 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        /* Dark Mode Support */
        @media (prefers-color-scheme: dark) {
            .deepshare-toast {
                background: var(--deepshare-toast-bg-dark);
                border-color: var(--deepshare-toast-border-dark);
                color: var(--deepshare-toast-text-dark);
            }
        }
        
        /* Manual Dark Mode Override */
        body.dark .deepshare-toast, html.dark .deepshare-toast {
            background: var(--deepshare-toast-bg-dark);
            border-color: var(--deepshare-toast-border-dark);
            color: var(--deepshare-toast-text-dark);
        }

        @keyframes deepshare-toast-enter {
            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }

        @keyframes deepshare-toast-exit {
            to {
                opacity: 0;
                transform: translateY(-10px) scale(0.95);
            }
        }

        .deepshare-toast.exiting {
            animation: deepshare-toast-exit 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .deepshare-toast__icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
            margin-right: 12px;
            flex-shrink: 0;
        }

        .deepshare-toast__content {
            flex: 1;
            font-size: 14px;
            line-height: 1.5; /* 21px */
            font-weight: 500;
        }

        .deepshare-toast__link {
            color: #2563eb;
            font-weight: 700;
            text-decoration: none;
            white-space: nowrap;
        }

        .deepshare-toast__link:hover {
            text-decoration: underline;
        }

        .deepshare-toast__close {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
            margin-left: 12px;
            cursor: pointer;
            opacity: 0.5;
            transition: opacity 0.2s;
            flex-shrink: 0;
        }

        .deepshare-toast__close:hover {
            opacity: 1;
        }

        /* Icon Colors */
        .deepshare-toast--success .deepshare-toast__icon { color: #10b981; }
        .deepshare-toast--error .deepshare-toast__icon { color: #ef4444; }
        .deepshare-toast--info .deepshare-toast__icon { color: #3b82f6; }
        .deepshare-toast--loading .deepshare-toast__icon { color: #3b82f6; }

        /* Spinner */
        @keyframes deepshare-spin {
            to { transform: rotate(360deg); }
        }
        .deepshare-spinner {
            animation: deepshare-spin 1s linear infinite;
        }
    `;

    // --- Icons ---
    const icons = {
        success: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
        error: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
        info: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`,
        loading: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="deepshare-spinner"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>`,
        close: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`
    };

    // --- State ---
    const activeToasts = new Map();
    let toastIdCounter = 0;

    // --- Initialization ---
    function injectStyles() {
        if (!document.getElementById('deepshare-toast-styles')) {
            const styleSheet = document.createElement('style');
            styleSheet.id = 'deepshare-toast-styles';
            styleSheet.textContent = styles;
            document.head.appendChild(styleSheet);
        }
    }

    function getContainer() {
        let container = document.querySelector('.deepshare-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'deepshare-toast-container';
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
        toast.className = `deepshare-toast deepshare-toast--${type}`;
        toast.setAttribute('role', 'alert');

        // Icon
        const iconDiv = document.createElement('div');
        iconDiv.className = 'deepshare-toast__icon';
        iconDiv.innerHTML = icons[type] || icons.info;

        // Content
        const contentDiv = document.createElement('div');
        contentDiv.className = 'deepshare-toast__content';

        if (message && typeof message === 'object') {
            contentDiv.textContent = message.text || '';
            if (message.linkText && message.linkHref) {
                contentDiv.appendChild(document.createTextNode(' '));
                const link = document.createElement('a');
                link.className = 'deepshare-toast__link';
                link.textContent = message.linkText;
                link.href = message.linkHref;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                contentDiv.appendChild(link);
            }
        } else {
            // Strip HTML tags to show only plain text in toasts (avoid raw HTML showing as text)
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = message;
            contentDiv.textContent = tempDiv.textContent || tempDiv.innerText || message;
        }

        // Close Button
        const closeDiv = document.createElement('div');
        closeDiv.className = 'deepshare-toast__close';
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
            const container = document.querySelector('.deepshare-toast-container');
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
