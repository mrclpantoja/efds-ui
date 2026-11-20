import { describeBy, ensureId } from './dom';

export interface ErrorSlot {
  /** Mostra a mensagem (e devolve o `<p class="eds-error">`). */
  show(message: string): HTMLElement;
  /** Esconde/remove a mensagem e tira `aria-invalid`. */
  clear(): void;
  /** O elemento de erro, se estiver visível. */
  readonly element: HTMLElement | null;
}

/**
 * Erro visível e associado a um campo (WCAG 3.3.1). Reaproveita um `p.eds-error` que o autor já
 * deixou no HTML e ligou por `aria-describedby` (ele só é mostrado e escondido, por `hidden`); sem
 * ele, cria um `p.eds-error` logo depois de `anchor` e o remove ao limpar.
 */
export function createErrorSlot(input: HTMLElement, anchor: () => Element): ErrorSlot {
  const owner = input.ownerDocument;
  const declared = (input.getAttribute('aria-describedby') ?? '')
    .split(/\s+/)
    .map((id) => (id ? owner.getElementById(id) : null))
    .find((el): el is HTMLElement => el !== null && el.classList.contains('eds-error'));
  let created: HTMLElement | null = null;
  let visible = false;

  const current = () => declared ?? created;
  return {
    show(message) {
      let el = current();
      if (!el) {
        el = owner.createElement('p');
        el.className = 'eds-error';
        el.id = `${ensureId(input, 'field')}-err`;
        anchor().after(el);
        created = el;
      }
      el.hidden = false;
      el.textContent = message;
      input.setAttribute('aria-invalid', 'true');
      describeBy(input, ensureId(el, 'err'), true);
      visible = true;
      return el;
    },
    clear() {
      if (!visible && !created) return;
      visible = false;
      input.removeAttribute('aria-invalid');
      if (declared) {
        declared.hidden = true;
        declared.textContent = '';
      } else if (created) {
        describeBy(input, created.id, false);
        created.remove();
        created = null;
      }
    },
    get element() {
      return visible ? current() : null;
    },
  };
}
