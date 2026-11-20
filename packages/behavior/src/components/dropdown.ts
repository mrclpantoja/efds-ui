import { emit, ensureId, hidePopover, safeMatches } from '../core/dom';
import { bindAll, type Behavior } from '../core/registry';

/**
 * Dropdown (disclosure, sem `role="menu"`): sincroniza `aria-expanded` dos gatilhos
 * (`[popovertarget]`) com o evento `toggle`, fecha quando o foco sai por Tab (o popover `auto`
 * só fecha com Esc e clique fora) e ignora clique em item `aria-disabled`. Emite
 * `eds:dropdown-open` e `eds:dropdown-close` no menu.
 */
export const dropdownBehavior: Behavior = {
  name: 'dropdown',
  selector: '.eds-dropdown[popover]',
  bind(menu) {
    const id = ensureId(menu, 'dropdown');
    const doc = menu.ownerDocument;
    const triggers = () =>
      Array.from(doc.querySelectorAll<HTMLElement>(`[popovertarget="${id}"]`)).filter(
        (el) => !menu.contains(el),
      );

    const setExpanded = (open: boolean) => {
      for (const trigger of triggers()) trigger.setAttribute('aria-expanded', String(open));
    };

    const isOpen = (event?: Event): boolean => {
      const state = (event as Partial<ToggleEvent> | undefined)?.newState;
      if (state) return state === 'open';
      return safeMatches(menu, ':popover-open');
    };

    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as Node | null;
      if (!target || menu.contains(target)) return;
      if (triggers().some((trigger) => trigger.contains(target))) return;
      hidePopover(menu);
    };

    const onToggle = (event: Event) => {
      const open = isOpen(event);
      setExpanded(open);
      emit(menu, open ? 'dropdown-open' : 'dropdown-close', {});
      if (open) doc.addEventListener('focusin', onFocusIn);
      else doc.removeEventListener('focusin', onFocusIn);
    };

    const onClick = (event: Event) => {
      const item = (event.target as Element).closest<HTMLElement>('[aria-disabled="true"]');
      if (item && menu.contains(item)) event.preventDefault();
    };

    menu.addEventListener('toggle', onToggle);
    menu.addEventListener('click', onClick);
    setExpanded(isOpen());
    if (isOpen()) doc.addEventListener('focusin', onFocusIn);

    return () => {
      menu.removeEventListener('toggle', onToggle);
      menu.removeEventListener('click', onClick);
      doc.removeEventListener('focusin', onFocusIn);
    };
  },
};

export function initDropdown(root: ParentNode = document): () => void {
  return bindAll(root, [dropdownBehavior]);
}
