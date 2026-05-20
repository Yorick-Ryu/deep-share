/**
 * injectClaudeMarkdownButton.js
 * Injects a "Copy as Markdown" button into each Claude.ai assistant message action bar.
 *
 * DOM anchors (as of 2025):
 *   - Assistant message prose:  div.font-claude-message
 *   - Action bar (copy/thumbs): the sibling div that contains button[data-testid="copy-turn-action-button"]
 *     or any button with aria-label containing "copy" (Claude occasionally changes testids).
 *
 * Strategy:
 *   Walk the rendered HTML and reconstruct Markdown — same approach as injectGptButton.js
 *   but using Claude's class names / structure.
 */

(function () {
    'use strict';

    let lastUrl = location.href;
    console.debug('[DeepShare] Initialising Markdown button injection for Claude.ai');

    // ─── Inject buttons ───────────────────────────────────────────────────────

    function findAndInjectButtons() {
        // Try every known selector Claude has used for its copy button.
        let copyButtons = Array.from(document.querySelectorAll(
            'button[data-testid="copy-turn-action-button"],' +
            'button[aria-label="Copy response"],' +
            'button[aria-label="Copy message"],' +
            'button[aria-label="Copy"]'
        ));

        // Fallback: any button with "copy" in aria-label
        if (!copyButtons.length) {
            copyButtons = Array.from(document.querySelectorAll('button[aria-label]'))
                .filter(b => /copy/i.test(b.getAttribute('aria-label')));
        }

        copyButtons.forEach(copyBtn => {
            if (copyBtn.dataset.dsMarkdownInjected) return;
            copyBtn.dataset.dsMarkdownInjected = 'true';
            console.debug('[DeepShare] Found Claude copy button:', copyBtn.getAttribute('aria-label'), copyBtn);
            injectMarkdownButton(copyBtn);
        });
    }

    function injectMarkdownButton(copyBtn) {
        const mdBtn = document.createElement('button');
        mdBtn.className = copyBtn.className; // inherit Claude's button styling
        mdBtn.setAttribute('aria-label', chrome.i18n?.getMessage('copyAsMarkdown') || 'Copy as Markdown');
        mdBtn.dataset.dsMarkdownBtn = 'true';

        // Markdown "M↓" icon — matches the style of existing action buttons
        mdBtn.innerHTML = `
            <span style="display:flex;align-items:center;justify-content:center;width:1em;height:1em;">
                <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"
                     style="width:18px;height:18px;">
                    <path d="M20.56 18H3.44C2.65 18 2 17.37 2 16.59V7.41C2 6.63 2.65 6 3.44 6H20.56
                             C21.35 6 22 6.63 22 7.41V16.59C22 17.37 21.35 18 20.56 18M6.81 15.19V11.53
                             L8.73 13.88L10.65 11.53V15.19H12.58V8.81H10.65L8.73 11.16L6.81 8.81H4.89
                             V15.19H6.81M19.69 12H17.77V8.81H15.85V12H13.92L16.81 15.28L19.69 12Z"/>
                </svg>
            </span>
        `;

        // Tooltip
        let tooltip = null;
        mdBtn.addEventListener('mouseenter', () => {
            tooltip = document.createElement('div');
            tooltip.className = 'deepshare-gpt-tooltip'; // reuse your existing tooltip CSS
            tooltip.textContent = mdBtn.getAttribute('aria-label');
            document.body.appendChild(tooltip);

            const r = mdBtn.getBoundingClientRect();
            const tr = tooltip.getBoundingClientRect();
            let top = r.bottom + 8;
            let left = r.left + r.width / 2 - tr.width / 2;
            if (left < 5) left = 5;
            if (left + tr.width > window.innerWidth) left = window.innerWidth - tr.width - 5;
            tooltip.style.top = `${top}px`;
            tooltip.style.left = `${left}px`;
        });
        mdBtn.addEventListener('mouseleave', () => { tooltip?.remove(); tooltip = null; });

        // Click: extract → copy to clipboard
        mdBtn.addEventListener('click', async (e) => {
            e.stopPropagation();

            const messageEl = resolveMessageContainer(mdBtn);
            if (!messageEl) {
                console.error('[DeepShare] Could not find Claude message container');
                window.showToastNotification?.(
                    chrome.i18n?.getMessage('getClipboardError') || 'Could not find message', 'error'
                );
                return;
            }

            const markdown = extractMarkdown(messageEl);
            if (!markdown) {
                window.showToastNotification?.(
                    chrome.i18n?.getMessage('getClipboardError') || 'Nothing to copy', 'error'
                );
                return;
            }

            try {
                await navigator.clipboard.writeText(markdown);
                window.showToastNotification?.(
                    chrome.i18n?.getMessage('markdownCopied') || 'Markdown copied!', 'success'
                );
            } catch (err) {
                console.error('[DeepShare] Clipboard write failed:', err);
                window.showToastNotification?.(
                    chrome.i18n?.getMessage('copyFailed') || 'Copy failed', 'error'
                );
            }
        });

        // Insert right after the existing copy button
        copyBtn.insertAdjacentElement('afterend', mdBtn);
    }

    /**
     * Walk up from the button to find the assistant message prose container.
     * Claude's DOM structure changes frequently, so we try multiple strategies.
     *
     * Run this in DevTools to log what we find and help debug:
     *   document.querySelectorAll('[class*="font-claude"]').forEach(e => console.log(e.className))
     */
    function resolveMessageContainer(fromEl) {
        let el = fromEl.parentElement;

        while (el && el !== document.body) {
            // Strategy 1: Tailwind class that Claude uses for message prose
            const byClass = el.querySelector(
                'div.font-claude-message, ' +       // most common
                'div[class*="font-claude-message"]' // in case Tailwind adds prefixes
            );
            if (byClass) return byClass;

            // Strategy 2: data attribute Claude sets on the response container
            const byAttr =
                el.querySelector('[data-is-streaming]') ||
                el.querySelector('[data-testid="assistant-message"]') ||
                el.querySelector('[data-testid*="message-content"]');
            if (byAttr) return byAttr;

            // Strategy 3: a div that contains prose-like children (p, h1-h6, ul, ol, pre)
            // and is reasonably large — avoids accidentally grabbing toolbar divs
            const proseCandidate = el.querySelector(
                'div:has(> p), div:has(> ul), div:has(> ol), div:has(> pre), div:has(> h1), div:has(> h2)'
            );
            if (proseCandidate && proseCandidate.textContent.trim().length > 20) {
                return proseCandidate;
            }

            el = el.parentElement;
        }

        // Last resort: log all candidate classes so the user can report them
        console.warn(
            '[DeepShare] Could not find Claude message container. ' +
            'Classes found near button:',
            fromEl.closest('[class]')?.className
        );
        return null;
    }

    // ─── DOM → Markdown conversion ────────────────────────────────────────────
    // Mirrors injectGptButton.js / extractContentWithFormulas, adapted for Claude.

    function extractMarkdown(container) {
        let result = '';

        // ── helpers ──

        const getCodeBlockText = (codeNode) => {
            let text = '';
            const walk = (n) => {
                if (n.nodeType === Node.TEXT_NODE) { text += n.textContent; return; }
                if (n.tagName === 'BR') { text += '\n'; return; }
                n.childNodes.forEach(walk);
            };
            codeNode.childNodes.forEach(walk);
            return text.replace(/\n$/, '');
        };

        const normalizeCodeLang = (lang) => {
            const s = (lang || '').trim().toLowerCase();
            const aliases = { 'c++': 'cpp', 'c#': 'csharp', js: 'javascript', ts: 'typescript', shell: 'bash', zsh: 'bash' };
            return aliases[s] || (/^[a-z0-9_+\-]+$/.test(s) ? s : '');
        };

        const getCodeLang = (preNode, codeNode) => {
            const cls = codeNode.className.match(/language-([a-zA-Z0-9_+\-]+)/)?.[1];
            if (cls) return normalizeCodeLang(cls);
            // Claude sometimes puts the language in a label div above the code
            const labels = Array.from(preNode.querySelectorAll('div'))
                .filter(d => !d.contains(codeNode))
                .map(d => (d.textContent || '').trim())
                .filter(t => t && t.length <= 30);
            for (const l of labels) { const n = normalizeCodeLang(l); if (n) return n; }
            return '';
        };

        const processCell = (cell) => {
            let cellText = '';
            const walk = (n) => {
                if (n.nodeType === Node.TEXT_NODE) { cellText += n.textContent; return; }
                if (n.nodeType !== Node.ELEMENT_NODE) return;
                // Inline KaTeX inside table cells
                if (n.classList?.contains('katex') && !n.closest('.katex-display')) {
                    const ann = n.querySelector('annotation[encoding="application/x-tex"]');
                    if (ann) { cellText += '$' + ann.textContent.trim() + '$'; return; }
                }
                if (n.tagName === 'BR') { cellText += ' '; return; }
                if (n.tagName === 'A') { cellText += '[' + n.textContent + '](' + (n.href || '') + ')'; return; }
                if (n.tagName === 'STRONG' || n.tagName === 'B') { cellText += '**'; n.childNodes.forEach(walk); cellText += '**'; return; }
                if (n.tagName === 'EM' || n.tagName === 'I') { cellText += '*'; n.childNodes.forEach(walk); cellText += '*'; return; }
                if (n.tagName === 'CODE') { cellText += '`' + n.textContent + '`'; return; }
                n.childNodes.forEach(walk);
            };
            cell.childNodes.forEach(walk);
            return cellText.replace(/\|/g, '\\|').trim();
        };

        // ── main recursive processor ──

        const processNode = (node, indent = 0, inListItem = false, trimText = false) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
                const cl = node.classList;

                // Display formula  ($$...$$)
                if (cl?.contains('katex-display')) {
                    const ann = node.querySelector('annotation[encoding="application/x-tex"]');
                    if (ann) result += '\n$$\n' + ann.textContent.trim() + '\n$$\n';
                    return;
                }

                // Inline formula  ($...$)
                if (cl?.contains('katex') && !node.closest('.katex-display')) {
                    const ann = node.querySelector('annotation[encoding="application/x-tex"]');
                    if (ann) result += '$' + ann.textContent.trim() + '$';
                    return;
                }

                // Headings
                if (/^H[1-6]$/.test(node.tagName)) {
                    const hashes = '#'.repeat(parseInt(node.tagName[1]));
                    result += '\n' + hashes + ' ';
                    node.childNodes.forEach(c => processNode(c, indent, false));
                    result += '\n\n';
                    return;
                }

                // Paragraph
                if (node.tagName === 'P') {
                    if (inListItem) {
                        node.childNodes.forEach(c => processNode(c, indent, true));
                    } else {
                        node.childNodes.forEach(c => processNode(c, indent, false));
                        result += '\n\n';
                    }
                    return;
                }

                // Line break
                if (node.tagName === 'BR') {
                    result += inListItem ? '  \n' + '   '.repeat(indent) + '  ' : '\n';
                    return;
                }

                // Horizontal rule
                if (node.tagName === 'HR') { result += '\n---\n\n'; return; }

                // Blockquote
                if (node.tagName === 'BLOCKQUOTE') {
                    const saved = result; result = '';
                    node.childNodes.forEach(c => processNode(c, indent, false));
                    const lines = result.split('\n');
                    result = saved;
                    const quoted = lines
                        .map((l, i) => l.trim() ? '> ' + l.trim() : (i > 0 && i < lines.length - 1 ? '>' : ''))
                        .filter(Boolean)
                        .join('\n');
                    result += '\n' + quoted + '\n\n';
                    return;
                }

                // Table
                if (node.tagName === 'TABLE') {
                    result += '\n';
                    const rows = Array.from(node.querySelectorAll('tr'));
                    if (!rows.length) return;
                    let headerRow = node.querySelector('thead > tr') || rows[0];
                    const bodyRows = rows.filter(r => r !== headerRow && !r.closest('tfoot'));
                    const hCells = Array.from(headerRow.querySelectorAll('th, td')).map(processCell);
                    result += '| ' + hCells.join(' | ') + ' |\n';
                    result += '| ' + hCells.map(() => '---').join(' | ') + ' |\n';
                    bodyRows.forEach(row => {
                        const cells = Array.from(row.querySelectorAll('td, th')).map(processCell);
                        result += '| ' + cells.join(' | ') + ' |\n';
                    });
                    result += '\n';
                    return;
                }

                // Lists
                if (node.tagName === 'UL' || node.tagName === 'OL') {
                    const ordered = node.tagName === 'OL';
                    let idx = ordered && node.hasAttribute('start') ? parseInt(node.getAttribute('start')) : 1;
                    Array.from(node.children).filter(c => c.tagName === 'LI').forEach(li => {
                        const pad = '   '.repeat(indent);
                        const checkbox = li.querySelector('input[type="checkbox"]');
                        let prefix = checkbox
                            ? (checkbox.checked ? '* [x] ' : '* [ ] ')
                            : (ordered ? `${idx}. ` : '* ');
                        result += pad + prefix;
                        let hasContent = false;
                        li.childNodes.forEach(child => {
                            if (child.nodeType === Node.TEXT_NODE && !child.textContent.trim()) return;
                            if (child.tagName === 'INPUT' && child.type === 'checkbox') return;
                            if (child.tagName === 'UL' || child.tagName === 'OL') {
                                if (hasContent) result += '\n';
                                processNode(child, indent + 1, false);
                            } else {
                                const before = result.length;
                                processNode(child, indent, true);
                                if (result.length > before) hasContent = true;
                            }
                        });
                        result += '\n';
                        idx++;
                    });
                    if (indent === 0) result += '\n';
                    return;
                }

                // Inline formatting
                if (node.tagName === 'STRONG' || node.tagName === 'B') {
                    result += '**'; node.childNodes.forEach(c => processNode(c, indent, inListItem)); result += '**'; return;
                }
                if (node.tagName === 'EM' || node.tagName === 'I') {
                    result += '*'; node.childNodes.forEach(c => processNode(c, indent, inListItem)); result += '*'; return;
                }
                if (node.tagName === 'DEL') {
                    result += '~~'; node.childNodes.forEach(c => processNode(c, indent, inListItem)); result += '~~'; return;
                }

                // Code block
                if (node.tagName === 'PRE') {
                    const code = node.querySelector('code');
                    if (code) {
                        result += '\n```' + getCodeLang(node, code) + '\n';
                        result += getCodeBlockText(code);
                        result += '\n```\n\n';
                    }
                    return;
                }

                // Inline code
                if (node.tagName === 'CODE' && !node.closest('pre')) {
                    result += '`' + node.textContent + '`'; return;
                }

                // Links
                if (node.tagName === 'A') {
                    const href = node.getAttribute('href');
                    let text = '';
                    const getText = (n) => {
                        if (n.nodeType === Node.TEXT_NODE) text += n.textContent;
                        else if (!(n.tagName === 'SPAN' && n.querySelector('svg'))) n.childNodes?.forEach(getText);
                    };
                    node.childNodes.forEach(getText);
                    text = text.trim();
                    const title = node.getAttribute('title');
                    if (href && href !== text) {
                        result += title ? `[${text}](${href} "${title}")` : `[${text}](${href})`;
                    } else {
                        result += text;
                    }
                    return;
                }

                // Anything else with children — just recurse
                node.childNodes.forEach(c => processNode(c, indent, inListItem));
                return;
            }

            // Text node
            if (node.nodeType === Node.TEXT_NODE) {
                let text = node.textContent;
                if (trimText) {
                    if (typeof trimText === 'string') {
                        if (trimText.includes('start')) text = text.trimStart();
                        if (trimText.includes('end')) text = text.trimEnd();
                    }
                }
                result += text;
            }
        };

        // Claude puts response prose directly in font-claude-message.
        // Walk its direct children so we don't double-process nested wrappers.
        container.childNodes.forEach(child => processNode(child, 0, false));

        // Normalise whitespace
        return result.replace(/\n{3,}/g, '\n\n').trim();
    }

    // ─── MutationObserver (debounced) ─────────────────────────────────────────

    let debounceTimer = null;

    const observer = new MutationObserver(() => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            findAndInjectButtons();
            // SPA navigation check
            const currentUrl = location.href;
            if (currentUrl !== lastUrl) {
                lastUrl = currentUrl;
                setTimeout(findAndInjectButtons, 500);
            }
        }, 150);
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Initial pass after page settles
    setTimeout(findAndInjectButtons, 800);

})();