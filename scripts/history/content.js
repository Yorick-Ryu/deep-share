/* DeepSeek settings export → local library → selected Markdown attachment. */
(() => {
    if (globalThis.__deepShareHistoryUI) return;
    globalThis.__deepShareHistoryUI = true;
    const H = globalThis.DeepShareHistory;
    let dialog, launch, archive, activeId, statusValue, previousFocus;
    let selected = new Set(), query = '', multiple = false;
    const element = (tag, className, text) => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    };
    const button = (text, action, className = '') => {
        const node = element('button', `dsh-button ${className}`, text);
        node.type = 'button'; node.addEventListener('click', action); return node;
    };
    async function request(action, payload = {}) {
        const response = await chrome.runtime.sendMessage({ ...payload, action });
        if (!response?.ok) throw new Error(response?.error || '插件连接中断，请刷新页面再试。');
        return response;
    }
    const showError = text => window.showToastNotification?.({ text }, 'error', 5000);
    const all = () => archive?.conversations || [];
    const chosenConversations = () => selected.size
        ? all().filter(c => selected.has(c.id))
        : all().filter(c => c.id === activeId);
    function highlighted(tag, className, text) {
        const node = element(tag, className);
        const needle = query.trim();
        if (!needle) { node.textContent = text; return node; }
        const pattern = new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'giu');
        let offset = 0;
        for (const match of text.matchAll(pattern)) {
            node.append(document.createTextNode(text.slice(offset, match.index)), element('mark', 'dsh-match', match[0]));
            offset = match.index + match[0].length;
        }
        node.append(document.createTextNode(text.slice(offset)));
        return node;
    }
    function matches(c) {
        const needle = query.trim().toLocaleLowerCase();
        return !needle || `${c.title}\n${H.selectedMessages(c).map(m => m.content).join('\n')}`.toLocaleLowerCase().includes(needle);
    }
    function chosenMarkdown() {
        return H.markdown(chosenConversations(), { thinking: dialog.querySelector('#dsh-thinking').checked });
    }
    function updateSelection() {
        const count = chosenConversations().length;
        const bytes = count ? new Blob([chosenMarkdown()]).size : 0;
        const summary = dialog.querySelector('.dsh-summary');
        summary.textContent = `${selected.size ? `已选 ${selected.size} 个对话` : count ? '当前对话' : '未选择对话'} · ${(bytes / 1024).toFixed(1)} KB`;
        summary.title = summary.textContent;
        dialog.querySelectorAll('[data-dsh-export]').forEach(b => { b.disabled = !count; });
    }
    function renderPreview() {
        const preview = dialog.querySelector('.dsh-preview');
        const changedConversation = preview.dataset.conversationId !== (activeId || '');
        preview.dataset.conversationId = activeId || '';
        preview.replaceChildren();
        const c = all().find(c => c.id === activeId);
        if (!c) {
            preview.append(element('p', 'dsh-muted', '点击左侧对话预览，勾选需要带入新对话的内容。'));
            return;
        }
        preview.append(highlighted('h3', '', c.title));
        for (const message of H.selectedMessages(c)) {
            const article = element('article', 'dsh-message');
            article.append(element('strong', '', message.role === 'user' ? '用户' : 'DeepSeek'));
            if (dialog.querySelector('#dsh-thinking').checked && message.thinking) {
                const details = element('details');
                details.append(element('summary', '', '思考内容'), highlighted('pre', '', message.thinking));
                article.append(details);
            }
            article.append(highlighted('pre', '', message.content || '（无文本正文）'));
            if (message.files.length) article.append(element('p', 'dsh-muted', `附件：${message.files.join('、')}（仅文件名）`));
            preview.append(article);
        }
        if (changedConversation) preview.scrollTop = 0;
    }
    function renderList() {
        renderSelectionTools();
        const list = dialog.querySelector('.dsh-list');
        const scrollTop = list.scrollTop;
        list.classList.toggle('dsh-multiple', multiple);
        list.replaceChildren();
        const filtered = all().filter(matches);
        if (!filtered.some(c => c.id === activeId)) {
            activeId = filtered[0]?.id;
            renderPreview();
        }
        if (!all().length) {
            list.append(element('p', 'dsh-empty', '还没有历史对话。请在 DeepSeek「系统设置 → 数据管理」导出所有历史对话，待生成完成后点“下载”，也可以点击底部“导入”选择已下载的导出包。'));
        } else if (!filtered.length) list.append(element('p', 'dsh-empty', '没有找到匹配的对话，试试其他关键词。'));
        const fragment = document.createDocumentFragment();
        let group, groupLabel;
        for (const c of filtered) {
            const label = H.dateGroup(c.date);
            if (label !== groupLabel) {
                groupLabel = label; group = element('section', 'dsh-date-group');
                group.append(element('h4', 'dsh-date-heading', label)); fragment.append(group);
            }
            const row = element('div', `dsh-row${c.id === activeId ? ' dsh-active' : ''}`);
            const check = element('input'); check.type = 'checkbox'; check.checked = selected.has(c.id);
            check.setAttribute('aria-label', `选择 ${c.title}`);
            check.addEventListener('change', () => {
                check.checked ? selected.add(c.id) : selected.delete(c.id);
                open.setAttribute('aria-pressed', String(check.checked));
                updateSelection();
            });
            const open = button('', () => {
                if (multiple) {
                    selected.has(c.id) ? selected.delete(c.id) : selected.add(c.id);
                    check.checked = selected.has(c.id);
                    open.setAttribute('aria-pressed', String(check.checked));
                    updateSelection(); return;
                }
                activeId = c.id;
                for (const item of list.querySelectorAll('.dsh-row')) {
                    const current = item === row;
                    item.classList.toggle('dsh-active', current);
                    const itemButton = item.querySelector('.dsh-conversation');
                    if (current) itemButton.setAttribute('aria-current', 'true');
                    else itemButton.removeAttribute('aria-current');
                }
                renderPreview(); updateSelection();
            }, 'dsh-conversation');
            if (multiple) open.setAttribute('aria-pressed', String(selected.has(c.id)));
            else if (c.id === activeId) open.setAttribute('aria-current', 'true');
            open.append(highlighted('strong', '', c.title));
            open.title = c.title;
            const checkSlot = element('span', 'dsh-check-slot');
            checkSlot.inert = !multiple;
            checkSlot.setAttribute('aria-hidden', String(!multiple));
            check.disabled = !multiple;
            checkSlot.append(check);
            row.append(checkSlot, open); group.append(row);
        }
        list.append(fragment); list.scrollTop = scrollTop; updateSelection();
    }
    function setMultiple(value) {
        multiple = value;
        if (!multiple) selected.clear();
        // Keep row nodes mounted so checkbox width/opacity animate in both directions.
        const list = dialog.querySelector('.dsh-list');
        list.classList.toggle('dsh-multiple', multiple);
        for (const row of list.querySelectorAll('.dsh-row')) {
            const slot = row.querySelector('.dsh-check-slot');
            const check = slot.querySelector('input');
            const open = row.querySelector('.dsh-conversation');
            slot.inert = !multiple;
            slot.setAttribute('aria-hidden', String(!multiple));
            check.disabled = !multiple;
            if (!multiple) check.checked = false;
            if (multiple) {
                open.removeAttribute('aria-current');
                open.setAttribute('aria-pressed', String(check.checked));
            } else {
                open.removeAttribute('aria-pressed');
                if (row.classList.contains('dsh-active')) open.setAttribute('aria-current', 'true');
            }
        }
        renderSelectionTools(); updateSelection();
    }
    function exitMultiple() {
        setMultiple(false);
        dialog.querySelector('.dsh-multi-toggle')?.focus({ preventScroll: true });
    }
    function renderSelectionTools() {
        const tools = dialog.querySelector('.dsh-selection-tools');
        let toggle = tools.querySelector('.dsh-multi-toggle');
        if (!toggle) {
            toggle = button('', () => setMultiple(!multiple), 'dsh-multi-toggle');
            toggle.setAttribute('aria-describedby', 'dsh-multi-tooltip');
            tools.append(toggle);
        }
        toggle.hidden = !multiple && !all().some(matches);
        const label = multiple ? '退出多选' : '多选';
        toggle.setAttribute('aria-label', label);
        toggle.setAttribute('aria-pressed', String(multiple));
        if (multiple) toggle.setAttribute('aria-keyshortcuts', 'Escape');
        else toggle.removeAttribute('aria-keyshortcuts');
        toggle.replaceChildren();
        if (multiple) {
            toggle.append(dialog.querySelector('.dsh-close svg').cloneNode(true));
        } else {
            const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            icon.setAttribute('viewBox', '0 0 16 16'); icon.setAttribute('aria-hidden', 'true');
            const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            group.setAttribute('transform', 'translate(0.9 1.4)');
            for (const d of [
                'M14.2004 9.73944V11.0402H7.40356V9.73944H14.2004Z',
                'M14.2004 2.15491V3.45569H7.40356V2.15491H14.2004Z',
                'M4.31055 10.3903C4.31055 9.61068 3.71825 8.9692 2.95898 8.89221L2.80566 8.8844C1.9742 8.8844 1.2998 9.5588 1.2998 10.3903L1.30762 10.5436C1.37947 11.2522 1.94276 11.8153 2.65137 11.8873L2.80566 11.8951C3.58507 11.895 4.22575 11.3027 4.30273 10.5436L4.31055 10.3903ZM5.61035 10.3903C5.61016 11.9394 4.35481 13.1947 2.80566 13.1949C1.25635 13.1949 0.000196493 11.9395 0 10.3903C0 8.84083 1.25623 7.58459 2.80566 7.58459C4.35493 7.58479 5.61035 8.84095 5.61035 10.3903Z',
                'M4.31091 2.80566C4.31091 2.02619 3.7185 1.38466 2.95935 1.30762L2.80603 1.2998C1.97463 1.2998 1.30017 1.97426 1.30017 2.80566L1.30798 2.95898C1.37989 3.66756 1.94316 4.23082 2.65173 4.30273L2.80603 4.31055C3.58529 4.3103 4.22608 3.71798 4.3031 2.95898L4.31091 2.80566ZM5.61072 2.80566C5.61046 4.35465 4.35502 5.61009 2.80603 5.61035C1.25682 5.61035 0.000624607 4.35481 0.000366211 2.80566C0.000366211 1.25629 1.25666 0 2.80603 0C4.35518 0.000258397 5.61072 1.25645 5.61072 2.80566Z'
            ]) {
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', d); path.setAttribute('fill', 'currentColor'); group.append(path);
            }
            icon.append(group); toggle.append(icon);
        }
        const tooltip = element('span', 'dsh-tooltip', label);
        tooltip.id = 'dsh-multi-tooltip'; tooltip.setAttribute('role', 'tooltip');
        toggle.append(tooltip);
    }
    function filename() { return H.filename(chosenConversations()); }
    function download() {
        const url = URL.createObjectURL(new Blob([chosenMarkdown()], { type: 'text/markdown;charset=utf-8' }));
        const a = element('a'); a.href = url; a.download = filename(); a.click();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
    }
    function exportWord() {
        if (!chosenConversations().length) return;
        document.dispatchEvent(new CustomEvent('deepshare:convertToDocx', {
            detail: {
                messages: { content: chosenMarkdown() },
                documentTitle: filename().replace(/\.md$/, '')
            }
        }));
    }
    async function upload() {
        const input = [...document.querySelectorAll('input[type="file"]')].find(node => {
            const accept = node.accept.toLowerCase();
            return !node.disabled && (!accept || accept.split(',').some(type => ['.md', '.markdown', 'text/*', 'text/markdown', 'text/plain', '*/*'].includes(type.trim())));
        });
        if (!input) {
            showError('暂未找到可用的文档上传入口。请下载 MD，再通过 DeepSeek 输入框的附件按钮上传。');
            return;
        }
        const uploadButton = dialog.querySelector('.dsh-upload');
        uploadButton.disabled = true;
        try {
            const file = new File([chosenMarkdown()], filename(), { type: 'text/markdown' });
            const transfer = new DataTransfer(); transfer.items.add(file);
            input.files = transfer.files;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            // Return to the composer; DeepSeek displays the attachment's upload status.
            closeLibrary();
        } catch {
            showError('浏览器未能自动附加文件，请下载 MD 后从 DeepSeek 附件按钮上传。');
        } finally { uploadButton.disabled = false; }
    }
    async function loadArchive() {
        const target = dialog;
        if (!target?.open) return;
        try {
            const result = await request('history:read');
            if (dialog !== target || !target.open || target.dataset.closing) return;
            archive = result.archive;
            selected = new Set([...selected].filter(id => all().some(c => c.id === id)));
            if (!all().some(c => c.id === activeId)) activeId = all()[0]?.id;
            renderList(); renderPreview();
        } catch (error) { if (dialog === target && target.open) showError(error.message); }
    }
    function closeLibrary() {
        const target = dialog;
        if (!target?.open || target.dataset.closing) return;
        target.dataset.closing = 'true';
        const finish = () => { if (target.open) target.close(); };
        // Keep the native dialog in the top layer until the exit animation ends.
        const fallback = setTimeout(finish, 250);
        Promise.allSettled(target.getAnimations().map(animation => animation.finished)).then(() => {
            clearTimeout(fallback); finish();
        });
    }
    async function openLibrary() {
        if (dialog?.open) return;
        previousFocus = document.activeElement;
        dialog = element('dialog', 'dsh-dialog');
        dialog.tabIndex = -1;
        const header = element('header', 'dsh-header');
        const title = element('div');
        const heading = element('h2', '', '导入历史对话'); heading.id = 'dsh-title';
        title.append(heading);
        const close = button('', closeLibrary, 'dsh-close');
        close.setAttribute('aria-label', '关闭');
        close.title = '关闭';
        const closeIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        closeIcon.setAttribute('viewBox', '0 0 16 16');
        closeIcon.setAttribute('aria-hidden', 'true');
        for (const d of [
            'M14.1871 13.1265L13.1265 14.1872L1.81275 2.87347L2.87341 1.81281L14.1871 13.1265Z',
            'M13.1265 1.81282L14.1871 2.87348L2.8734 14.1872L1.81274 13.1265L13.1265 1.81282Z'
        ]) {
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', d); path.setAttribute('fill', 'currentColor'); closeIcon.append(path);
        }
        close.append(closeIcon);
        header.append(title, close); dialog.append(header); dialog.setAttribute('aria-labelledby', 'dsh-title');
        const workspace = element('div', 'dsh-workspace');
        const sidebar = element('aside', 'dsh-sidebar');
        sidebar.setAttribute('aria-label', '历史对话列表');
        const main = element('div', 'dsh-main');
        const toolbar = element('div', 'dsh-toolbar');
        const search = element('input', 'dsh-search'); search.type = 'search'; search.placeholder = '搜索标题或对话正文'; search.setAttribute('aria-label', '搜索历史对话'); search.value = query;
        let timer;
        search.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => { query = search.value; renderList(); renderPreview(); }, 150); });
        const selectionTools = element('div', 'dsh-selection-tools');
        toolbar.append(search);
        const listShell = element('div', 'dsh-list-shell');
        listShell.append(element('div', 'dsh-list'), selectionTools);
        sidebar.append(toolbar, listShell);
        main.append(element('section', 'dsh-preview'));
        workspace.append(sidebar, main); dialog.append(workspace);
        const footer = element('footer', 'dsh-footer');
        const thinkingLabel = element('label', 'dsh-thinking-label');
        const thinking = element('input'); thinking.type = 'checkbox'; thinking.id = 'dsh-thinking'; thinking.setAttribute('role', 'switch');
        thinking.addEventListener('change', () => { renderPreview(); updateSelection(); });
        thinkingLabel.append(thinking, document.createTextNode(' 包含思考内容'));
        const actions = element('div', 'dsh-actions');
        const downloadButton = button('下载Markdown', download); downloadButton.dataset.dshExport = ''; downloadButton.disabled = true;
        const wordButton = button('导出 Word', exportWord); wordButton.dataset.dshExport = ''; wordButton.disabled = true;
        wordButton.title = '使用 DeepShare 文档转换服务，发送所选内容并沿用插件的 API-Key 设置';
        const uploadButton = button('导入', upload, 'dsh-primary dsh-upload'); uploadButton.dataset.dshExport = ''; uploadButton.disabled = true;
        actions.append(downloadButton, wordButton, uploadButton);
        footer.append(element('span', 'dsh-summary'), thinkingLabel, actions); dialog.append(footer);
        const bottom = element('div', 'dsh-bottom');
        let clearArmed = false;
        const resetClear = () => {
            clearArmed = false;
            clearButton.textContent = '清除本地历史库';
        };
        const clearButton = button('清除本地历史库', async () => {
            if (!clearArmed) {
                clearArmed = true;
                clearButton.textContent = '确认清除？';
                return;
            }
            clearArmed = false;
            clearButton.disabled = true;
            clearButton.textContent = '清除中…';
            try {
                await request('history:clear'); selected.clear();
                if (dialog === currentDialog && currentDialog.open) await loadArchive();
            } catch (error) {
                if (dialog === currentDialog) showError(error.message);
            } finally {
                resetClear(); clearButton.disabled = false;
            }
        }, 'dsh-clear');
        clearButton.addEventListener('blur', () => { if (clearArmed) resetClear(); });
        const archiveInput = element('input');
        archiveInput.type = 'file'; archiveInput.accept = '.zip,.json'; archiveInput.hidden = true;
        const importButton = button('导入', () => archiveInput.click(), 'dsh-import-archive');
        importButton.title = '导入已下载的 DeepSeek ZIP 导出包或 conversations.json';
        archiveInput.addEventListener('change', async () => {
            const file = archiveInput.files[0];
            archiveInput.value = '';
            if (!file) return;
            importButton.disabled = true; clearButton.disabled = true;
            importButton.textContent = '导入中…';
            let id;
            try {
                if (file.size > H.MAX_BYTES) throw new Error('导出包超过 64 MB。');
                const text = /\.zip$/i.test(file.name)
                    ? await H.unzipConversations(await file.arrayBuffer())
                    : /\.json$/i.test(file.name) ? await file.text() : (() => { throw new Error('请选择 DeepSeek 导出的 ZIP 或 JSON 文件。'); })();
                ({ id } = await request('history:import:start', { length: text.length }));
                for (let offset = 0; offset < text.length; offset += 262144) {
                    await request('history:import:chunk', { id, offset, chunk: text.slice(offset, offset + 262144) });
                }
                await request('history:import:finish', { id }); id = null;
                selected.clear(); activeId = undefined; query = ''; multiple = false;
                if (dialog === currentDialog && currentDialog.open) {
                    search.value = ''; await loadArchive();
                }
            } catch (error) {
                if (id) await request('history:import:cancel', { id }).catch(() => {});
                if (dialog === currentDialog) showError(`导入失败，已有历史库仍保留。${error.message}`);
            } finally {
                importButton.disabled = false; clearButton.disabled = false;
                importButton.textContent = '导入';
            }
        });
        bottom.append(button('刷新', loadArchive), importButton, clearButton, archiveInput); footer.prepend(bottom);
        const currentDialog = dialog;
        const returnFocus = previousFocus;
        let outsidePointer = null;
        const isOutside = event => {
            const rect = currentDialog.getBoundingClientRect();
            return event.target === currentDialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom);
        };
        currentDialog.addEventListener('pointerdown', event => {
            if (clearArmed && !clearButton.contains(event.target)) resetClear();
            outsidePointer = event.button === 0 && isOutside(event) ? event.pointerId : null;
        });
        currentDialog.addEventListener('pointerup', event => {
            if (outsidePointer === event.pointerId && isOutside(event)) closeLibrary();
            outsidePointer = null;
        });
        currentDialog.addEventListener('pointercancel', () => { outsidePointer = null; });
        currentDialog.addEventListener('cancel', event => {
            event.preventDefault();
            if (multiple) exitMultiple(); else closeLibrary();
        });
        currentDialog.addEventListener('close', () => {
            clearTimeout(timer); currentDialog.remove();
            if (dialog === currentDialog) dialog = null;
            if (returnFocus?.isConnected) returnFocus.focus();
        }, { once: true });
        document.body.append(dialog); syncAppearance(); dialog.showModal();
        document.dispatchEvent(new Event('deepshare:dialog-opened'));
        // Native settings focuses the surface on open, not the close button.
        // Keyboard navigation still shows focus indicators on controls.
        dialog.focus({ preventScroll: true });
        await loadArchive();
    }
    function settingsStatus() {
        if (statusValue?.state === 'ready' && Number.isFinite(statusValue.count)) {
            return `已保存 ${statusValue.count} 个历史对话。如需同步最新对话，请先重新导出，待生成完成后再点击下载。`;
        }
        return statusValue?.message || '请先导出历史对话，待生成完成后点击下载同步；如需获取最新对话，请先重新导出。';
    }
    function nativeExportRow() {
        // Resolve the current row again after every native settings tab change.
        const heading = [...document.querySelectorAll('div,span,p,h3')].find(node => node.childElementCount === 0 && /^(导出所有历史对话|Export (all )?(chat )?history|Export data)$/i.test(node.textContent.trim()) && node.getClientRects().length);
        let row = heading?.parentElement;
        for (let i = 0; row && i < 4; i++, row = row.parentElement) {
            if (/删除所有对话|Delete all chats/i.test(row.textContent)) return;
            if ([...row.querySelectorAll('button,[role="button"]')].some(node =>
                !node.closest('.dsh-settings') && /^(下载|导出|Download|Export)$/i.test(node.textContent.trim()))) return row;
        }
    }
    function nativeHistoryControl(action) {
        const pattern = action === '重新导出' ? /^(重新导出|Re-export|Export again)$/i : /^(下载|Download)$/i;
        return [...(nativeExportRow()?.querySelectorAll('button,[role="button"]') || [])].find(node =>
            !node.closest('.dsh-settings') && node.getClientRects().length && !node.disabled &&
            node.getAttribute('aria-disabled') !== 'true' && pattern.test(node.textContent.trim()));
    }
    function updateSettingsLabel(label) {
        const text = settingsStatus();
        const actions = ['重新导出', '下载'].filter(action => text.includes(action) && nativeHistoryControl(action));
        const links = actions.join(',');
        if (label.textContent === text && label.dataset.links === links) return;
        const parts = text.split(/(重新导出|下载)/g).map(part => {
            if (!actions.includes(part)) return document.createTextNode(part);
            const link = element('button', 'dsh-settings-link', part);
            link.type = 'button';
            link.addEventListener('click', () => nativeHistoryControl(part)?.click());
            return link;
        });
        label.dataset.links = links;
        label.replaceChildren(...parts);
    }
    function settingsNote() {
        const row = nativeExportRow();
        let note = document.querySelector('.dsh-settings');
        if (!row) { note?.remove(); return; }
        if (!note) {
            note = element('div', 'dsh-settings');
            note.append(element('span'), button('查看历史库', openLibrary));
        }
        updateSettingsLabel(note.querySelector('span'));
        // Initialize theme before insertion so dark settings never paints a
        // light border while waiting for the general reconciliation timer.
        syncAppearance([note]);
        if (row.nextElementSibling !== note) row.after(note);
    }
    function syncAppearance(nodes = [dialog, launch, document.querySelector('.dsh-settings')]) {
        // Read the site's rendered foreground so a manual DeepSeek theme takes
        // precedence over the OS setting. Keep our CSS scoped to this feature.
        const source = document.querySelector('textarea') || document.body;
        const computed = getComputedStyle(source);
        const channels = computed.color.match(/[\d.]+/g)?.slice(0, 3).map(Number);
        const dark = channels?.length === 3 && channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722 > 150;
        for (const node of nodes.filter(Boolean)) {
            const theme = dark ? 'dark' : 'light';
            if (node.dataset.dshTheme !== theme) node.dataset.dshTheme = theme;
            if (node.style.fontFamily !== computed.fontFamily) node.style.fontFamily = computed.fontFamily;
        }
    }
    function findAttachmentButton() {
        // DeepSeek keeps the file input next to the attachment button in its
        // bottom toolbar. Anchor to that relationship, not hashed CSS classes.
        for (const input of document.querySelectorAll('input[type="file"]')) {
            if (input.accept && !input.accept.split(',').some(type => ['.md', '.markdown', 'text/*', 'text/markdown', '*/*'].includes(type.trim().toLowerCase()))) continue;
            const controls = input.parentElement?.querySelectorAll(':scope > button, :scope > [role="button"]') || [];
            const attachment = [...controls].find(node => node !== launch && node.getClientRects().length && getComputedStyle(node).visibility !== 'hidden');
            if (attachment) return attachment;
        }
        return null;
    }
    function reconcile() {
        if (!document.body) return;
        if (!launch) launch = button('导入历史对话', openLibrary, 'dsh-launch');
        const attachment = findAttachmentButton();
        if (attachment) {
            if (attachment.previousElementSibling !== launch) attachment.before(launch);
        } else {
            launch.remove();
        }
        settingsNote();
        syncAppearance();
    }
    chrome.storage.local.get('deepShareHistoryStatus').then(data => { statusValue = data.deepShareHistoryStatus; reconcile(); });
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local' || !changes.deepShareHistoryStatus) return;
        statusValue = changes.deepShareHistoryStatus.newValue; reconcile();
        if (dialog?.open) {
            if (statusValue?.state === 'ready') loadArchive();
            else if (statusValue?.state === 'error' && statusValue.message) showError(statusValue.message);
        }
    });
    let timer;
    new MutationObserver(records => {
        if (records.every(r => r.target.closest?.('.dsh-dialog,.dsh-settings,.dsh-launch'))) return;
        // Native settings replaces its rows when switching tabs. Remove or
        // re-anchor our sibling in this microtask, before the next paint;
        // waiting for the general debounce flashes the orphan at the top.
        settingsNote();
        clearTimeout(timer); timer = setTimeout(reconcile, 200);
    }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'data-theme', 'hidden', 'disabled', 'aria-disabled'] });
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => syncAppearance());
    window.addEventListener('resize', reconcile);
    window.addEventListener('scroll', reconcile, { passive: true });
    reconcile();
})();
