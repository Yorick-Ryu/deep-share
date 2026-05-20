/**
 * KaTeX formula copy for Perplexity (perplexity.ai).
 *
 * Perplexity renders math with KaTeX inside answer blocks. The DOM structure
 * is the standard `.katex` container with a hidden
 * `.katex-mathml annotation[encoding="application/x-tex"]` carrying the
 * original LaTeX source — same as ChatGPT / DeepSeek — so we can reuse the
 * shared handler from copyKatex.js.
 *
 * Why a separate file: Perplexity rerenders answer turns aggressively while
 * streaming, and uses a virtualised scroll container for long threads. A
 * generic `setInterval` scan (as in copyKatex.js) misses formulas that mount
 * after the initial pass. We attach a MutationObserver to the main answer
 * region so newly streamed formulas get the click handler immediately.
 */

(function () {
    'use strict';

    // Reuse settings + handler exposed by copyKatex.js (loaded before this file).
    const sharedEnable = typeof window.enableKatexCopy === 'function'
        ? window.enableKatexCopy
        : null;

    function scan(root) {
        const nodes = (root || document).querySelectorAll('.katex');
        nodes.forEach((el) => {
            if (el.dataset.katexCopyEnabled) return;
            el.dataset.katexCopyEnabled = 'true';
            el.style.cursor = 'pointer';
            el.title = chrome.i18n?.getMessage('clickToCopyFormula') || 'Click to copy formula';
            el.addEventListener('click', async (e) => {
                e.stopPropagation(); // Perplexity captures clicks for source previews
                const ann = el.querySelector('.katex-mathml annotation[encoding="application/x-tex"]');
                if (!ann) return;
                const latex = ann.textContent.trim();
                try {
                    await navigator.clipboard.writeText(latex);
                    window.showToastNotification?.(
                        chrome.i18n?.getMessage('formulaCopied') || 'Formula copied!',
                        'success'
                    );
                } catch (err) {
                    console.error('[DeepShare/Perplexity] copy failed', err);
                    window.showToastNotification?.(
                        chrome.i18n?.getMessage('copyFailed') || 'Copy failed',
                        'error'
                    );
                }
            });
        });
    }

    function init() {
        // Prefer shared implementation when available; otherwise use local scan.
        if (sharedEnable) sharedEnable(); else scan(document);

        const target = document.querySelector('main') || document.body;
        const observer = new MutationObserver((mutations) => {
            for (const m of mutations) {
                if (m.addedNodes.length) {
                    if (sharedEnable) sharedEnable();
                    else scan(document);
                    break;
                }
            }
        });
        observer.observe(target, { childList: true, subtree: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
