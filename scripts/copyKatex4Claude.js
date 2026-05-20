/**
 * copyKatex4Claude.js
 * KaTeX formula copy functionality tuned for Claude.ai
 *
 * Key differences from the generic version:
 *  - Detects inline ($) vs display ($$) math correctly via .katex-display
 *  - Debounced MutationObserver to handle Claude's streaming token output
 *  - No chrome.i18n / chrome.storage dependency — works standalone or
 *    as a content script (just wire up configureSettings() from your popup)
 *  - Graceful fallback: if MathML conversion isn't available, falls back to
 *    $-wrapped LaTeX instead of silently returning raw code
 *  - Toast notification is self-contained (no external dependency)
 */

// ─── Configuration ────────────────────────────────────────────────────────────

const settings = {
    enabled: true,
    format: 'mathml',   // 'latex' | 'dollarLatex' | 'mathml'
    engine: 'mathjax',  // 'mathjax' | 'katex'  (used only when format === 'mathml')
};

/**
 * Call this from your extension popup / options page to update settings at runtime.
 * @param {Partial<typeof settings>} patch
 */
function configureSettings(patch) {
    Object.assign(settings, patch);
    refreshAllElements();
}

// ─── Core logic ───────────────────────────────────────────────────────────────

/**
 * Attach click-to-copy to every .katex element not yet processed.
 * Safe to call multiple times (idempotent via data attribute guard).
 */
function attachCopyHandlers() {
    document.querySelectorAll('.katex:not([data-c4c])').forEach(el => {
        el.dataset.c4c = '1';
        el.addEventListener('click', onFormulaClick);
        styleElement(el);
    });
}

/** Update cursor / title to reflect current enabled state. */
function styleElement(el) {
    if (settings.enabled) {
        el.style.cursor = 'pointer';
        el.title = 'Click to copy formula';
    } else {
        el.style.cursor = '';
        el.title = '';
    }
}

function refreshAllElements() {
    document.querySelectorAll('.katex[data-c4c]').forEach(styleElement);
}

/**
 * Click handler attached to each .katex element.
 * `this` is the clicked .katex node.
 */
async function onFormulaClick() {
    if (!settings.enabled) return;

    // Claude.ai KaTeX output always includes an <annotation> with the raw LaTeX.
    const annotation = this.querySelector(
        '.katex-mathml annotation[encoding="application/x-tex"]'
    );
    if (!annotation) return;

    const latex = annotation.textContent.trim();

    // Detect display vs inline by checking for the .katex-display wrapper.
    // .katex-display is added by KaTeX for block / $$...$$ expressions.
    const isDisplay = !!this.closest('.katex-display');

    try {
        const text = await resolveText(latex, isDisplay);
        await navigator.clipboard.writeText(text);
        showToast('Formula copied!', 'success');
    } catch (err) {
        console.error('[copyKatex4Claude] copy failed:', err);
        showToast('Copy failed — see console', 'error');
    }
}

/**
 * Resolve the final string to copy based on the current format setting.
 * @param {string} latex  raw LaTeX (no delimiters)
 * @param {boolean} isDisplay  true if this is a block/display formula
 * @returns {Promise<string>}
 */
async function resolveText(latex, isDisplay) {
    switch (settings.format) {
        case 'latex':
            // Plain LaTeX, no delimiters
            return latex;

        case 'dollarLatex':
            // Correct delimiter based on inline vs display
            return isDisplay ? `$$${latex}$$` : `$${latex}$`;

        case 'mathml':
        default: {
            // Try the in-page converter injected by the extension (MathJax / KaTeX)
            if (window.deepShareFormulaConverter?.convertLatexToMathML) {
                try {
                    return await window.deepShareFormulaConverter.convertLatexToMathML(
                        latex,
                        { displayMode: isDisplay, engine: settings.engine }
                    );
                } catch (convErr) {
                    console.warn('[copyKatex4Claude] MathML conversion failed, falling back to $LaTeX$:', convErr);
                }
            }
            // Fallback: dollar-wrapped LaTeX (still pasteable in most apps)
            console.warn('[copyKatex4Claude] deepShareFormulaConverter not available — using $LaTeX$ fallback');
            return isDisplay ? `$$${latex}$$` : `$${latex}$`;
        }
    }
}

// ─── MutationObserver (debounced for Claude's streaming output) ───────────────

let debounceTimer = null;

const observer = new MutationObserver(() => {
    // Claude streams tokens quickly; batch DOM mutations into a single scan
    // every 120 ms rather than running on every individual node insertion.
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(attachCopyHandlers, 120);
});

// ─── Toast notification (self-contained, no external dependency) ──────────────

const TOAST_ID = 'c4c-toast';

function showToast(message, type = 'success') {
    // Reuse existing toast element if present
    let toast = document.getElementById(TOAST_ID);
    if (!toast) {
        toast = document.createElement('div');
        toast.id = TOAST_ID;
        Object.assign(toast.style, {
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: '2147483647',
            padding: '10px 18px',
            borderRadius: '8px',
            fontSize: '14px',
            fontFamily: 'system-ui, sans-serif',
            fontWeight: '500',
            boxShadow: '0 4px 12px rgba(0,0,0,.18)',
            transition: 'opacity .25s ease, transform .25s ease',
            pointerEvents: 'none',
        });
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.style.background = type === 'success' ? '#1a7f4f' : '#c0392b';
    toast.style.color = '#fff';
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';

    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(6px)';
    }, 2200);
}

// ─── Chrome extension settings bridge (optional) ─────────────────────────────
// If this runs as a Chrome extension content script, sync with chrome.storage.

function tryBridgeChromeStorage() {
    if (typeof chrome === 'undefined' || !chrome.storage) return;

    // Load persisted settings on startup
    chrome.storage.sync.get(
        { enableFormulaCopy: true, formulaFormat: 'mathml', formulaEngine: 'mathjax' },
        ({ enableFormulaCopy, formulaFormat, formulaEngine }) => {
            configureSettings({ enabled: enableFormulaCopy, format: formulaFormat, engine: formulaEngine });
        }
    );

    // React to changes from the popup / options page
    chrome.storage.onChanged.addListener(changes => {
        const patch = {};
        if (changes.enableFormulaCopy) patch.enabled = changes.enableFormulaCopy.newValue;
        if (changes.formulaFormat)    patch.format  = changes.formulaFormat.newValue;
        if (changes.formulaEngine)    patch.engine  = changes.formulaEngine.newValue;
        if (Object.keys(patch).length) configureSettings(patch);
    });
}

// ─── Initialisation ───────────────────────────────────────────────────────────

function init() {
    console.debug('[copyKatex4Claude] initialised');

    tryBridgeChromeStorage();
    attachCopyHandlers();

    observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}