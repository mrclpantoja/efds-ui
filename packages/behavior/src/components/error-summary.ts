import { getMessages } from '../core/config';
import { ensureId } from '../core/dom';
import { composeErrorText, summaryTitle, type InvalidField } from '../core/form-errors';
import type { Behavior } from '../core/registry';
import { formControllerOf, type SummaryView } from './form-validation';
import { announce } from './status-region';

/** O formulário do resumo: o que o contém, `data-eds-error-summary="id"` ou o `<form>` vizinho. */
function formOf(el: HTMLElement): HTMLFormElement | null {
  const inside = el.closest('form');
  if (inside) return inside;
  const ref = el.getAttribute('data-eds-error-summary')?.trim();
  if (ref) {
    const found = el.ownerDocument.getElementById(ref);
    return found instanceof HTMLFormElement ? found : null;
  }
  for (const sibling of [el.nextElementSibling, el.previousElementSibling]) {
    if (sibling instanceof HTMLFormElement) return sibling;
  }
  return null;
}

/** Leva o foco ao campo (em grupo, ao primeiro focável); rola só se ele estiver fora da tela. */
function focusField(target: HTMLElement | null): void {
  if (!target) return;
  const focusable = target.matches('input, select, textarea, button, a[href], [tabindex]')
    ? target
    : target.querySelector<HTMLElement>('input, select, textarea, button');
  (focusable ?? target).focus();
}

/**
 * Resumo de erros (padrão GOV.UK, WCAG 3.3.1 e 3.3.3) no topo do formulário:
 *
 * ```html
 * <div class="eds-error-summary" data-eds-error-summary tabindex="-1" aria-labelledby="erros-titulo" hidden>
 *   <h2 class="eds-error-summary-title" id="erros-titulo"></h2>
 *   <ul class="eds-error-summary-list"></ul>
 * </div>
 * ```
 *
 * Ao recusar o envio, o JS preenche a lista (um link por campo, "Rótulo: mensagem"), põe a contagem
 * no título (singular e plural em `messages`), mostra o resumo e leva o foco a ele; cada link leva o
 * foco ao campo (não só rola). Ao corrigir, o item some e o título acompanha; quando zera, o resumo se
 * esconde e um anúncio discreto avisa. O resumo vem de dentro do `<form>`, de `data-eds-error-summary="id-do-form"`
 * ou de um `<form>` vizinho. Aciona a validação do formulário (ver `validateBehavior`).
 */
export const errorSummaryBehavior: Behavior = {
  name: 'error-summary',
  selector: '[data-eds-error-summary]',
  bind(root) {
    const form = formOf(root);
    if (!form) return;
    const controller = formControllerOf(form);
    const release = controller.retain();
    const doc = root.ownerDocument;
    const ac = new AbortController();

    if (!root.hasAttribute('tabindex')) root.setAttribute('tabindex', '-1');
    let title = root.querySelector<HTMLElement>('.eds-error-summary-title');
    if (!title) {
      title = doc.createElement('h2');
      title.className = 'eds-error-summary-title';
      root.prepend(title);
    }
    let list = root.querySelector<HTMLElement>('.eds-error-summary-list');
    if (!list) {
      list = doc.createElement('ul');
      list.className = 'eds-error-summary-list';
      root.append(list);
    }
    const titleEl = title;
    const listEl = list;
    if (!root.hasAttribute('aria-labelledby')) {
      root.setAttribute('aria-labelledby', ensureId(titleEl, 'error-summary-title'));
    }

    let count = 0;
    const byId = new Map<string, InvalidField>();

    const paint = (fields: readonly InvalidField[]) => {
      count = fields.length;
      byId.clear();
      titleEl.textContent = summaryTitle(fields.length, getMessages());
      listEl.replaceChildren(
        ...fields.map((field) => {
          byId.set(field.id, field);
          const li = doc.createElement('li');
          const a = doc.createElement('a');
          a.href = `#${field.id}`;
          a.textContent = composeErrorText(field.label, field.message);
          li.append(a);
          return li;
        }),
      );
    };

    const view: SummaryView = {
      render(fields) {
        paint(fields);
        root.hidden = false;
      },
      update(fields) {
        if (root.hidden) return;
        const before = count;
        if (fields.length === before && fields.every((f, i) => composeSame(f, listEl, i))) return;
        paint(fields);
        if (fields.length === 0) {
          root.hidden = true;
          if (before > 0) announce(getMessages().errorSummaryFixed);
        }
      },
      clear() {
        count = 0;
        byId.clear();
        listEl.replaceChildren();
        root.hidden = true;
      },
      focus() {
        if (root.hidden) return false;
        root.focus();
        return true;
      },
    };

    // Link do item: o foco vai ao campo (a âncora sozinha só rolaria, e um grupo não receberia foco).
    root.addEventListener(
      'click',
      (event) => {
        const link = (event.target as Element | null)?.closest('a[href^="#"]');
        if (!link || !root.contains(link)) return;
        const id = decodeURIComponent((link.getAttribute('href') ?? '').slice(1));
        const field = byId.get(id);
        const target = field?.element ?? doc.getElementById(id);
        if (!target) return;
        event.preventDefault();
        focusField(target);
      },
      { signal: ac.signal },
    );

    const detach = controller.addSummary(view);
    return () => {
      ac.abort();
      detach();
      release();
    };
  },
};

function composeSame(field: InvalidField, list: HTMLElement, index: number): boolean {
  const link = list.children[index]?.querySelector('a');
  return link?.textContent === composeErrorText(field.label, field.message);
}
