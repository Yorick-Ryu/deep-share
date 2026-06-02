/**
 * DeepShare Gemini Share Export Buttons
 * Injects Word and Markdown export buttons before the native "Try Gemini Canvas" CTA.
 */
(function () {
    'use strict';

    const SHARE_PATH_PATTERN = /^\/share\/[^/]+/;
    let lastUrl = location.href;

    console.debug('DeepShare: Initializing Gemini share export buttons');

    function isGeminiSharePage() {
        return location.hostname === 'gemini.google.com' && SHARE_PATH_PATTERN.test(location.pathname);
    }

    function injectShareExportButtons() {
        if (!isGeminiSharePage()) return;

        const nativeCanvasButton = document.querySelector('button[data-test-id="copy-canvas-button"]');
        if (!nativeCanvasButton) return;

        const actionButtons = nativeCanvasButton.closest('.action-buttons');
        if (!actionButtons || actionButtons.querySelector('.deepshare-share-export-buttons')) return;

        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'deepshare-share-export-buttons';
        buttonGroup.setAttribute('data-test-id', 'deepshare-share-export-buttons');

        const wordButton = createShareButton({
            className: 'deepshare-share-word-button',
            label: chrome.i18n?.getMessage('docxButton') || 'Save as Word',
            fontIcon: 'docs'
        });

        const markdownButton = createShareButton({
            className: 'deepshare-share-markdown-button',
            label: chrome.i18n?.getMessage('saveAsMarkdown') || 'Save as Markdown',
            fontIcon: 'article'
        });

        wordButton.addEventListener('click', (event) => handleExportClick(event, 'word'));
        markdownButton.addEventListener('click', (event) => handleExportClick(event, 'markdown'));

        buttonGroup.append(wordButton, markdownButton);
        nativeCanvasButton.insertAdjacentElement('beforebegin', buttonGroup);

        console.debug('DeepShare: Gemini share export buttons injected');
    }

    function createShareButton({ className, label, fontIcon }) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `deepshare-share-export-button ${className}`;
        button.setAttribute('aria-label', label);
        button.innerHTML = `
            <mat-icon role="img" fonticon="${fontIcon}" class="mat-icon notranslate deepshare-share-export-icon google-symbols lumi-symbols mat-ligature-font mat-icon-no-color" aria-hidden="true" data-mat-icon-type="font" data-mat-icon-name="${fontIcon}" data-mat-icon-namespace="lumi-symbols"></mat-icon>
            <span class="deepshare-share-export-label">${label}</span>
        `;
        return button;
    }

    async function handleExportClick(event, type) {
        event.stopPropagation();
        event.preventDefault();

        const button = event.currentTarget;
        const exporter = window.DeepShareGeminiCanvasExport;
        if (!exporter) {
            window.showToastNotification(chrome.i18n?.getMessage('getClipboardError') || '无法获取内容', 'error');
            return;
        }

        try {
            setButtonLoading(button, true);

            if (type === 'word') {
                await exporter.exportWord(button);
            } else {
                await exporter.exportMarkdown();
            }
        } catch (error) {
            console.error(`DeepShare: Error exporting Gemini share content as ${type}:`, error);
            window.showToastNotification(`${chrome.i18n?.getMessage('getClipboardError') || '获取内容失败'}: ${error.message}`, 'error');
        } finally {
            setButtonLoading(button, false);
        }
    }

    function setButtonLoading(button, isLoading) {
        button.disabled = isLoading;
        button.style.opacity = isLoading ? '0.6' : '';
    }

    const observer = new MutationObserver(() => {
        injectShareExportButtons();

        if (location.href !== lastUrl) {
            lastUrl = location.href;
            setTimeout(injectShareExportButtons, 300);
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(injectShareExportButtons, 500);
})();
