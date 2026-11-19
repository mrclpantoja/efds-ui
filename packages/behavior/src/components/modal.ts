import { emit, focusEl, watchScrollRegion } from '../core/dom';
import { bindAll, type Behavior } from '../core/registry';

/**
 * `<button data-eds-open="ID">` abre o `dialog.eds-modal`/`.eds-drawer` com `showModal()`
 * (foco preso, fundo inerte, Esc e retorno de foco são nativos).
 */
export const modalTriggerBehavior: Behavior = {
  name: 'modal-trigger',
  selector: '[data-eds-open]',
  bind(trigger) {
    const onClick = (event: Event) => {
      const id = trigger.getAttribute('data-eds-open');
      const dialog = id ? trigger.ownerDocument.getElementById(id) : null;
      if (!(dialog instanceof HTMLDialogElement) || dialog.open) return;
      event.preventDefault();
      dialog.showModal();
      // Informativo: o primeiro focável é o Fechar (nativo). Formulário: `autofocus`/`data-autofocus`.
      focusEl(dialog.querySelector<HTMLElement>('[data-autofocus]'));
      emit(dialog, 'modal-open', { trigger });
    };
    trigger.addEventListener('click', onClick);
    return () => trigger.removeEventListener('click', onClick);
  },
};

/**
 * Modal e Drawer: fechar pelo backdrop só se `pointerdown` e `click` ocorreram no próprio
 * `<dialog>` (WCAG 2.5.2; `data-eds-backdrop="static"` desliga), `[data-eds-close]` fecha, e o
 * corpo vira região rolável focável só quando rola.
 */
export const dialogBehavior: Behavior = {
  name: 'dialog',
  selector: 'dialog.eds-modal, dialog.eds-drawer',
  bind(dialog) {
    if (!(dialog instanceof HTMLDialogElement)) return;
    const ac = new AbortController();
    const { signal } = ac;

    let downOnDialog = false;
    dialog.addEventListener(
      'pointerdown',
      (event) => {
        downOnDialog = event.target === dialog;
      },
      { signal },
    );
    dialog.addEventListener(
      'click',
      (event) => {
        const target = event.target as Element;
        const closer = target.closest<HTMLElement>('[data-eds-close]');
        if (closer && closer.closest('dialog') === dialog) {
          dialog.close(closer.getAttribute('data-eds-close') || undefined);
          return;
        }
        const isBackdrop = downOnDialog && target === dialog;
        downOnDialog = false;
        if (isBackdrop && dialog.getAttribute('data-eds-backdrop') !== 'static') dialog.close();
      },
      { signal },
    );

    const body = dialog.querySelector<HTMLElement>('.eds-modal-body, .eds-drawer-body');
    const stopScroll = body
      ? watchScrollRegion(body, () => dialog.getAttribute('aria-labelledby') ?? '')
      : () => undefined;

    return () => {
      ac.abort();
      stopScroll();
    };
  },
};

export function initModal(root: ParentNode = document): () => void {
  return bindAll(root, [modalTriggerBehavior, dialogBehavior]);
}
