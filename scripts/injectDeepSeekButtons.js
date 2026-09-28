// This script will inject the "Save as Image", "Save as DOCX", and "Save as Markdown" buttons.
console.log("injectDeepSeekButtons.js loaded");

let observedCreateLinkButton = null;
let createLinkButtonObserver = null;
const markdownButtonTemplates = new WeakMap();

function injectDeepSeekButtons() {
    const targetNode = document.body;

    const observer = new MutationObserver(reconcileDeepSeekButtons);

    observer.observe(targetNode, { childList: true, subtree: true });
    window.addEventListener('resize', reconcileDeepSeekButtons);
    reconcileDeepSeekButtons();
}

function reconcileDeepSeekButtons() {
    const shareContainer = document.querySelector('._43d222b');
    const buttonContainer = shareContainer?.querySelector('.fab07e97');
    const createLinkButton = buttonContainer?.querySelector('.ds-basic-button--primary:not(#save-as-image-btn):not(#save-as-docx-btn):not(#save-as-markdown-btn), .ds-button--primary:not(#save-as-image-btn):not(#save-as-docx-btn):not(#save-as-markdown-btn)');

    if (!shareContainer || !buttonContainer || !createLinkButton) return;

    const saveAsImageButton = getOrCreateDeepSeekButton({
        id: 'save-as-image-btn',
        sourceButton: createLinkButton,
        label: chrome.i18n?.getMessage('saveAsImageButton'),
        eventName: 'deepshare:saveAsImage'
    });

    if (!saveAsImageButton.parentElement) {
        buttonContainer.insertBefore(saveAsImageButton, createLinkButton);
    }

    const saveAsDocxButton = getOrCreateDeepSeekButton({
        id: 'save-as-docx-btn',
        sourceButton: saveAsImageButton,
        label: chrome.i18n?.getMessage('docxButton'),
        eventName: 'deepshare:saveAsDocx'
    });

    if (!saveAsDocxButton.parentElement) {
        buttonContainer.insertBefore(saveAsDocxButton, saveAsImageButton);
    }

    const saveAsMarkdownButton = getOrCreateDeepSeekButton({
        id: 'save-as-markdown-btn',
        sourceButton: saveAsDocxButton,
        label: chrome.i18n?.getMessage('saveAsMarkdown') || 'Save as Markdown',
        eventName: 'deepshare:saveAsMarkdown'
    });

    if (!moveMarkdownButtonToSelectionHeader(saveAsMarkdownButton)) {
        matchMarkdownButtonAppearance(saveAsMarkdownButton, saveAsDocxButton);
        saveAsMarkdownButton.style.marginLeft = '';
        saveAsMarkdownButton.style.marginRight = '';
        if (saveAsMarkdownButton.parentElement !== buttonContainer || saveAsDocxButton.nextElementSibling !== saveAsMarkdownButton) {
            saveAsDocxButton.after(saveAsMarkdownButton);
        }
    }

    const clonedButtons = [saveAsImageButton, saveAsDocxButton, saveAsMarkdownButton];
    syncClonedButtonsDisabled(createLinkButton, clonedButtons);
    observeCreateLinkButton(createLinkButton);
}

function getOrCreateDeepSeekButton({ id, sourceButton, label, eventName }) {
    const existingButton = document.getElementById(id);
    if (existingButton) return existingButton;

    const button = sourceButton.cloneNode(true);
    const labelElement = button.querySelector('.ds-button__content, span');

    button.id = id;
    if (labelElement) labelElement.textContent = label;
    hideClonedButtonIcon(button);

    button.addEventListener('click', () => {
        document.dispatchEvent(new Event(eventName));
    });

    return button;
}

function moveMarkdownButtonToSelectionHeader(saveAsMarkdownButton) {
    const selectionHeader = Array.from(document.querySelectorAll('.the-header')).find(header => {
        // DeepSeek retains a hidden selection header on desktop layouts.
        // Moving the button there would hide it along with the entire header.
        return header.getClientRects().length > 0 &&
            getComputedStyle(header).visibility === 'visible' &&
            findSelectionHeaderCancelButton(header);
    });
    const cancelButton = selectionHeader && findSelectionHeaderCancelButton(selectionHeader);

    if (!selectionHeader || !cancelButton) return false;

    matchMarkdownButtonAppearance(saveAsMarkdownButton, cancelButton);
    saveAsMarkdownButton.style.marginLeft = 'auto';
    saveAsMarkdownButton.style.marginRight = '8px';
    cancelButton.style.marginLeft = '0';

    if (saveAsMarkdownButton.parentElement !== selectionHeader || saveAsMarkdownButton.nextElementSibling !== cancelButton) {
        selectionHeader.insertBefore(saveAsMarkdownButton, cancelButton);
    }

    return true;
}

function findSelectionHeaderCancelButton(header) {
    return header.querySelector('[role="button"].ds-button--outlinedNeutral:not(#save-as-markdown-btn), button.ds-button--outlinedNeutral:not(#save-as-markdown-btn)');
}

function matchMarkdownButtonAppearance(button, sourceButton) {
    button.className = sourceButton.className;
    if (markdownButtonTemplates.get(button) === sourceButton) return;

    // Outlined buttons include inner decoration nodes that filled buttons lack.
    // Keep our button (and click handler), but copy the complete native contents.
    const template = sourceButton.cloneNode(true);
    const label = chrome.i18n?.getMessage('saveAsMarkdown') || 'Save as Markdown';
    const labelElement = template.querySelector('.ds-button__content, span');
    if (labelElement) {
        labelElement.textContent = label;
    } else {
        const textNode = Array.from(template.childNodes).find(node =>
            node.nodeType === Node.TEXT_NODE && node.textContent.trim());
        if (textNode) textNode.textContent = label;
        else template.appendChild(document.createTextNode(label));
    }
    hideClonedButtonIcon(template);
    markdownButtonTemplates.set(button, sourceButton);
    button.replaceChildren(...template.childNodes);
}

function observeCreateLinkButton(createLinkButton) {
    if (observedCreateLinkButton === createLinkButton) return;

    createLinkButtonObserver?.disconnect();
    observedCreateLinkButton = createLinkButton;
    createLinkButtonObserver = new MutationObserver(() => {
        syncClonedButtonsDisabled(createLinkButton, [
            document.getElementById('save-as-image-btn'),
            document.getElementById('save-as-docx-btn'),
            document.getElementById('save-as-markdown-btn')
        ]);
    });

    createLinkButtonObserver.observe(createLinkButton, {
        attributes: true,
        attributeFilter: ['aria-disabled', 'class']
    });
}

function hideClonedButtonIcon(button) {
    const iconWrapper = button.querySelector('.ds-button__icon');
    if (iconWrapper) {
        iconWrapper.style.display = 'none';
        return;
    }

    const iconContainer = button.querySelector('.ds-icon');
    if (iconContainer) {
        iconContainer.remove();
    }
}

function syncClonedButtonsDisabled(sourceButton, buttons) {
    const isDisabled = isButtonDisabled(sourceButton);

    buttons.forEach(button => {
        if (!button) return;

        button.disabled = isDisabled;
        button.setAttribute('aria-disabled', isDisabled.toString());
        button.style.pointerEvents = isDisabled ? 'none' : '';

        if (isDisabled) {
            button.classList.add('ds-atom-button--disabled', 'ds-button--disabled');
        } else {
            button.classList.remove('ds-atom-button--disabled', 'ds-button--disabled');
        }
    });
}

function isButtonDisabled(button) {
    return button.getAttribute('aria-disabled') === 'true' ||
        button.classList.contains('ds-atom-button--disabled') ||
        button.classList.contains('ds-button--disabled');
}

injectDeepSeekButtons();
