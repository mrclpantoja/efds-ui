import { closeIcon, emit, FOCUSABLE } from '../core/dom';
import { format, getMessages } from '../core/config';
import { bindAll, type Behavior } from '../core/registry';

const KEY_PREFIX = 'eds:banner:';

function dismissedBefore(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

/**
 * Leva o foco ao próximo elemento focável depois de `el` na ordem do documento. Candidatos que não
 * aceitam foco (ocultos, inertes) são pulados: sem isso o foco se perderia no `body`.
 */
function focusNext(el: HTMLElement): void {
  const doc = el.ownerDocument;
  for (const c of Array.from(doc.querySelectorAll<HTMLElement>(FOCUSABLE))) {
    if (el.contains(c)) continue;
    if (!(el.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
    c.focus();
    if (doc.activeElement === c) return;
  }
}

/**
 * Banner de sistema (`.eds-banner[data-eds-banner]`). Com botão `[data-eds-banner-close]` (ou
 * `data-eds-dismissible`, que o cria) o banner fecha com `hidden`; o fechamento é lembrado por id
 * (o valor de `data-eds-banner`; `localStorage`, só `1`) e some nas próximas páginas. Desligue a
 * lembrança com `data-eds-banner-remember="off"` (some só até recarregar). Evento
 * `eds:banner-close` (`detail { id }`).
 */
export const bannerBehavior: Behavior = {
  name: 'banner',
  selector: '[data-eds-banner]',
  bind(banner) {
    const id = (banner.getAttribute('data-eds-banner') ?? '').trim();
    const remember =
      id !== '' &&
      !['off', 'false'].includes(banner.getAttribute('data-eds-banner-remember') ?? '');
    const key = `${KEY_PREFIX}${id}`;
    if (remember && dismissedBefore(key)) banner.hidden = true;

    let close = banner.querySelector<HTMLButtonElement>('[data-eds-banner-close]');
    let created = false;
    if (!close && banner.hasAttribute('data-eds-dismissible')) {
      close = banner.ownerDocument.createElement('button');
      close.type = 'button';
      close.className =
        'eds-button eds-button-ghost eds-button-icon eds-button-sm eds-banner-close';
      close.setAttribute('data-eds-banner-close', '');
      close.setAttribute('aria-label', format(getMessages().bannerClose, {}));
      close.append(closeIcon());
      banner.append(close);
      created = true;
    }
    if (!close) return;
    const button = close;

    const onClick = () => {
      const focusWasHere = banner.contains(banner.ownerDocument.activeElement);
      banner.hidden = true;
      if (remember) {
        try {
          window.localStorage.setItem(key, '1');
        } catch {
          /* sem armazenamento: some só nesta página */
        }
      }
      if (focusWasHere) focusNext(banner);
      emit(banner, 'banner-close', { id: id === '' ? null : id });
    };
    button.addEventListener('click', onClick);
    return () => {
      button.removeEventListener('click', onClick);
      if (created) button.remove();
    };
  },
};

export function initBanner(root: ParentNode = document): () => void {
  return bindAll(root, [bannerBehavior]);
}
