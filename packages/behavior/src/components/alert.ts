import { emit, FOCUSABLE, focusEl } from '../core/dom';
import { bindAll, type Behavior } from '../core/registry';

const usable = (el: HTMLElement) => !el.closest('[hidden], [inert]');

/** Elemento lógico seguinte (ou, na falta, o anterior; por fim o `<main>`) para receber o foco. */
function nextFocusTarget(alert: HTMLElement): HTMLElement | null {
  const doc = alert.ownerDocument;
  const all = Array.from(doc.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !alert.contains(el) && usable(el),
  );
  const following = all.find(
    (el) => alert.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING,
  );
  if (following) return following;
  const preceding = [...all]
    .reverse()
    .find((el) => alert.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING);
  if (preceding) return preceding;
  const main = doc.querySelector<HTMLElement>('main');
  if (main && !main.hasAttribute('tabindex')) main.tabIndex = -1;
  return main;
}

/**
 * Alert fechável: `[data-eds-dismiss]` dentro de `.eds-alert` remove o aviso e move o foco para
 * o elemento lógico seguinte. `eds:dismiss` (cancelável) sai antes; com `preventDefault` o aviso
 * fica.
 */
export const alertDismissBehavior: Behavior = {
  name: 'alert-dismiss',
  selector: '.eds-alert [data-eds-dismiss]',
  bind(button) {
    const onClick = (event: Event) => {
      const alert = button.closest<HTMLElement>('.eds-alert');
      if (!alert) return;
      event.preventDefault();
      if (!emit(alert, 'dismiss', { alert }, true)) return;
      // O botão acionado sai do DOM (e nem todo navegador o foca ao clicar): sempre move o foco.
      const target = nextFocusTarget(alert);
      alert.remove();
      focusEl(target);
    };
    button.addEventListener('click', onClick);
    return () => button.removeEventListener('click', onClick);
  },
};

export function initAlert(root: ParentNode = document): () => void {
  return bindAll(root, [alertDismissBehavior]);
}
