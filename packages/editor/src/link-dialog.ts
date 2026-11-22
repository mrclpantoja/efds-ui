import type { EditorMessages } from './messages';
import { safeHref } from './url';

export interface LinkDialogValues {
  href: string;
  text: string;
  /** Já há link sob a seleção (mostra "Remover link"). */
  hasLink: boolean;
  /** Há texto selecionado: o campo Texto só aparece para link novo sem seleção. */
  hasSelection: boolean;
}

export interface LinkDialog {
  open: (values: LinkDialogValues) => void;
  destroy: () => void;
}

interface Callbacks {
  onApply: (href: string, text: string) => void;
  onRemove: () => void;
  /** O diálogo fechou: devolve o foco ao conteúdo. */
  onClose: () => void;
}

let uid = 0;

/**
 * Diálogo do link (Modal do core): Endereço e Texto, validação de protocolo e, com link
 * existente, "Remover link". Sem `<form>` próprio: o editor costuma estar dentro de um
 * formulário e formulários não se aninham.
 */
export function createLinkDialog(
  host: HTMLElement,
  messages: EditorMessages,
  callbacks: Callbacks,
): LinkDialog {
  const doc = host.ownerDocument;
  const id = `eds-editor-link-${++uid}`;
  const dialog = doc.createElement('dialog');
  dialog.className = 'eds-modal eds-modal-sm';
  dialog.setAttribute('aria-labelledby', `${id}-title`);
  dialog.innerHTML = `
    <header class="eds-modal-header"><h2 class="eds-modal-title" id="${id}-title"></h2></header>
    <div class="eds-modal-body">
      <div class="eds-stack eds-gap-4">
        <div class="eds-field">
          <label class="eds-label" for="${id}-href"></label>
          <input class="eds-input" id="${id}-href" type="text" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" />
          <p class="eds-error" id="${id}-error" role="alert" hidden></p>
        </div>
        <div class="eds-field" data-part="text">
          <label class="eds-label" for="${id}-text"></label>
          <input class="eds-input" id="${id}-text" type="text" autocomplete="off" />
        </div>
      </div>
    </div>
    <footer class="eds-modal-footer">
      <div class="eds-stack eds-stack-row eds-gap-3">
        <button type="button" class="eds-button eds-button-tertiary" data-part="remove"></button>
        <button type="button" class="eds-button eds-button-secondary" data-part="cancel"></button>
        <button type="button" class="eds-button eds-button-primary" data-part="apply"></button>
      </div>
    </footer>`;
  const q = <T extends HTMLElement>(selector: string) => dialog.querySelector<T>(selector)!;
  const title = q('.eds-modal-title');
  const hrefInput = q<HTMLInputElement>(`#${id}-href`);
  const textInput = q<HTMLInputElement>(`#${id}-text`);
  const error = q<HTMLElement>(`#${id}-error`);
  const textField = q('[data-part="text"]');
  const removeButton = q<HTMLButtonElement>('[data-part="remove"]');
  const cancelButton = q<HTMLButtonElement>('[data-part="cancel"]');
  const applyButton = q<HTMLButtonElement>('[data-part="apply"]');
  title.textContent = messages.linkDialogTitle;
  q<HTMLLabelElement>(`label[for="${id}-href"]`).textContent = messages.linkAddress;
  q<HTMLLabelElement>(`label[for="${id}-text"]`).textContent = messages.linkText;
  removeButton.textContent = messages.linkRemove;
  cancelButton.textContent = messages.linkCancel;
  applyButton.textContent = messages.linkApply;
  host.append(dialog);

  const showError = (text: string) => {
    error.textContent = text;
    error.hidden = text === '';
    if (text) {
      hrefInput.setAttribute('aria-invalid', 'true');
      hrefInput.setAttribute('aria-describedby', error.id);
    } else {
      hrefInput.removeAttribute('aria-invalid');
      hrefInput.removeAttribute('aria-describedby');
    }
  };

  const close = () => {
    if (dialog.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
    callbacks.onClose();
  };

  const apply = () => {
    const raw = hrefInput.value.trim();
    if (raw === '') {
      showError(messages.linkRequired);
      hrefInput.focus();
      return;
    }
    const href = safeHref(raw);
    if (href === null) {
      showError(messages.linkInvalid);
      hrefInput.focus();
      return;
    }
    close();
    callbacks.onApply(href, textInput.value);
  };

  applyButton.addEventListener('click', apply);
  cancelButton.addEventListener('click', close);
  removeButton.addEventListener('click', () => {
    close();
    callbacks.onRemove();
  });
  const onEnter = (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      apply();
    }
  };
  hrefInput.addEventListener('keydown', onEnter);
  textInput.addEventListener('keydown', onEnter);
  hrefInput.addEventListener('input', () => showError(''));
  // Esc fecha (nativo); o evento `close` devolve o foco.
  dialog.addEventListener('close', () => callbacks.onClose());
  let downOnBackdrop = false;
  dialog.addEventListener('pointerdown', (event) => {
    downOnBackdrop = event.target === dialog;
  });
  dialog.addEventListener('click', (event) => {
    if (downOnBackdrop && event.target === dialog) close();
    downOnBackdrop = false;
  });

  return {
    open(values) {
      showError('');
      hrefInput.value = values.href;
      textInput.value = values.text;
      textField.hidden = values.hasSelection || values.hasLink;
      removeButton.hidden = !values.hasLink;
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
      hrefInput.focus();
      hrefInput.select();
    },
    destroy() {
      dialog.remove();
    },
  };
}
