import { useEffect, type RefObject } from 'react';

/**
 * Região rolável focável por teclado (WCAG 2.1.1) só quando rola de fato: aplica
 * `tabindex`, `role="region"` e `aria-labelledby`; remove quando deixa de rolar.
 */
export function useScrollRegion(ref: RefObject<HTMLElement | null>, labelledby: string) {
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const sync = () => {
      const scrolls = el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight;
      if (scrolls) {
        el.tabIndex = 0;
        el.setAttribute('role', 'region');
        el.setAttribute('aria-labelledby', labelledby);
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
  }, [ref, labelledby]);
}
