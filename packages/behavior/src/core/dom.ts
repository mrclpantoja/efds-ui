/** Utilidades de DOM compartilhadas. */

let counter = 0;

/** Id único e estável para a sessão da página. */
export function uid(prefix: string): string {
  counter += 1;
  return `eds-${prefix}-${counter}`;
}

/** Garante um `id` no elemento e o devolve. */
export function ensureId(el: Element, prefix: string): string {
  if (!el.id) el.id = uid(prefix);
  return el.id;
}

/**
 * Dispara `CustomEvent` `eds:<name>` (bubbles). Devolve `false` se algum ouvinte chamou
 * `preventDefault()` (só quando `cancelable`).
 */
export function emit<T>(el: Element, name: string, detail: T, cancelable = false): boolean {
  return el.dispatchEvent(new CustomEvent(`eds:${name}`, { bubbles: true, cancelable, detail }));
}

export const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Foca com segurança (o elemento pode ter sumido). */
export function focusEl(el: HTMLElement | null | undefined): boolean {
  if (!el || !el.isConnected) return false;
  el.focus();
  return document.activeElement === el;
}

/** `:modal`, `:popover-open` etc. sem estourar em navegador sem suporte. */
export function safeMatches(el: Element, selector: string): boolean {
  try {
    return el.matches(selector);
  } catch {
    return false;
  }
}

export function showPopover(el: HTMLElement): void {
  try {
    if (typeof el.showPopover === 'function' && !safeMatches(el, ':popover-open')) el.showPopover();
  } catch {
    /* sem suporte ou já aberto */
  }
}

export function hidePopover(el: HTMLElement): void {
  try {
    if (typeof el.hidePopover === 'function' && safeMatches(el, ':popover-open')) el.hidePopover();
  } catch {
    /* sem suporte ou já fechado */
  }
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Ícone "fechar" (X) decorativo. */
export function closeIcon(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '1em');
  svg.setAttribute('height', '1em');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', 'M18 6L6 18M6 6l12 12');
  svg.append(path);
  return svg;
}

/**
 * Região rolável focável por teclado (WCAG 2.1.1) só quando rola de fato: `tabindex`,
 * `role="region"` e `aria-labelledby`. Devolve a limpeza.
 */
export function watchScrollRegion(el: HTMLElement, labelledby: () => string): () => void {
  if (typeof ResizeObserver === 'undefined') return () => undefined;
  const sync = () => {
    const scrolls = el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight;
    if (scrolls) {
      el.tabIndex = 0;
      el.setAttribute('role', 'region');
      el.setAttribute('aria-labelledby', labelledby());
    } else {
      el.removeAttribute('tabindex');
      el.removeAttribute('role');
      el.removeAttribute('aria-labelledby');
    }
  };
  const observer = new ResizeObserver(sync);
  observer.observe(el);
  if (el.firstElementChild) observer.observe(el.firstElementChild);
  sync();
  return () => observer.disconnect();
}

/** Texto sem acento e sem diferença de caixa, para o filtro do Combobox. */
export function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}
