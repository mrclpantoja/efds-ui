import { emit, ensureId, focusEl, hidePopover, safeMatches } from '../core/dom';
import { bindAll, type Behavior } from '../core/registry';

/**
 * Sidebar do app shell (`.eds-app > .eds-sidebar[popover]`, off-canvas no mobile): enquanto
 * aberta, header, main e skip link ficam `inert`; sincroniza `aria-expanded` do gatilho, cuida do
 * foco ao abrir/fechar e fecha ao navegar por um link.
 */
export const sidebarBehavior: Behavior = {
  name: 'sidebar',
  selector: '.eds-app > .eds-sidebar[popover]',
  bind(nav) {
    const app = nav.parentElement;
    if (!app) return;
    const id = ensureId(nav, 'sidebar');
    const doc = nav.ownerDocument;
    // Gatilhos de fora: o botão de fechar (.eds-sidebar-close) fica dentro da própria sidebar.
    const triggers = () =>
      Array.from(doc.querySelectorAll<HTMLElement>(`[popovertarget="${id}"]`)).filter(
        (el) => !nav.contains(el),
      );
    const siblings = () =>
      Array.from(
        app.querySelectorAll<HTMLElement>(
          ':scope > .eds-app-header, :scope > .eds-app-main, :scope > .eds-skip-link',
        ),
      );

    let navigated = false;
    const madeInert = new Set<HTMLElement>();

    const onToggle = (event: Event) => {
      const state = (event as Partial<ToggleEvent>).newState;
      const open = state ? state === 'open' : safeMatches(nav, ':popover-open');
      for (const trigger of triggers()) trigger.setAttribute('aria-expanded', String(open));

      if (open) {
        for (const el of siblings()) {
          if (!el.hasAttribute('inert')) {
            el.setAttribute('inert', '');
            madeInert.add(el);
          }
        }
        focusEl(
          nav.querySelector<HTMLElement>('[aria-current="page"]') ??
            nav.querySelector<HTMLElement>('a[href], button'),
        );
        return;
      }

      for (const el of madeInert) el.removeAttribute('inert');
      madeInert.clear();
      if (navigated) {
        navigated = false;
        const main = app.querySelector<HTMLElement>(':scope > .eds-app-main');
        if (main && !main.hasAttribute('tabindex')) main.tabIndex = -1;
        focusEl(main);
      } else if (doc.activeElement === doc.body || nav.contains(doc.activeElement)) {
        // O gatilho estava inerte: o retorno de foco nativo do popover falha.
        focusEl(triggers()[0]);
      }
    };

    const onClick = (event: Event) => {
      const link = (event.target as Element).closest('a[href]');
      if (!link || !nav.contains(link) || !safeMatches(nav, ':popover-open')) return;
      navigated = true;
      hidePopover(nav);
    };

    nav.addEventListener('toggle', onToggle);
    nav.addEventListener('click', onClick);
    return () => {
      nav.removeEventListener('toggle', onToggle);
      nav.removeEventListener('click', onClick);
      for (const el of madeInert) el.removeAttribute('inert');
      madeInert.clear();
    };
  },
};

/** Botão de colapsar: alterna `data-collapsed` na sidebar e `aria-expanded` no botão. */
export const sidebarCollapseBehavior: Behavior = {
  name: 'sidebar-collapse',
  selector: '[data-eds-sidebar-collapse]',
  bind(button) {
    const sidebar = button.closest<HTMLElement>('.eds-sidebar');
    if (!sidebar) return;
    if (!button.hasAttribute('aria-controls')) {
      button.setAttribute('aria-controls', ensureId(sidebar, 'sidebar'));
    }
    const sync = () => {
      button.setAttribute('aria-expanded', String(!sidebar.hasAttribute('data-collapsed')));
    };
    sync();
    const onClick = () => {
      const collapsed = !sidebar.hasAttribute('data-collapsed');
      if (collapsed) sidebar.setAttribute('data-collapsed', '');
      else sidebar.removeAttribute('data-collapsed');
      sync();
      emit(sidebar, 'sidebar-collapse', { collapsed });
    };
    button.addEventListener('click', onClick);
    return () => button.removeEventListener('click', onClick);
  },
};

export function initSidebar(root: ParentNode = document): () => void {
  return bindAll(root, [sidebarBehavior, sidebarCollapseBehavior]);
}
