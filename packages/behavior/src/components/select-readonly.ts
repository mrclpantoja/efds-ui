const READONLY = 'select[aria-readonly="true"]';

// Teclas que mudam a escolha ou abrem a lista. Tab, Enter (envia o formulário) e atalhos seguem.
const BLOCKED_KEYS = new Set([
  'ArrowDown',
  'ArrowUp',
  'ArrowLeft',
  'ArrowRight',
  'Home',
  'End',
  'PageUp',
  'PageDown',
  ' ',
]);

/**
 * Select somente leitura em HTML (`<select aria-readonly="true">`, o `<select>` não tem o atributo
 * `readonly`): a lista não abre e a escolha não muda, mas o campo continua focável, é lido como
 * somente leitura e vai no envio do formulário (ao contrário de `disabled`). Ouvintes delegados
 * em `root`; um `change` que passe mesmo assim (seletor nativo de toque) volta à escolha anterior.
 * Devolve a limpeza.
 */
export function initSelectReadonly(root: ParentNode = document): () => void {
  const target = root as unknown as EventTarget;
  const committed = new WeakMap<HTMLSelectElement, number>();
  const readonlySelect = (event: Event): HTMLSelectElement | null => {
    const el = event.target;
    return el instanceof HTMLSelectElement && el.matches(READONLY) && !el.disabled ? el : null;
  };
  const onFocusIn = (event: Event) => {
    const select = readonlySelect(event);
    if (select) committed.set(select, select.selectedIndex);
  };
  const onMouseDown = (event: Event) => {
    const select = readonlySelect(event);
    if (!select) return;
    // `pointerdown` e `mousedown` cobrem mouse e caneta; o touch fica no `touchend`.
    // Sem abrir a lista, mas com foco (o preventDefault do mousedown tira o foco: devolve-o).
    event.preventDefault();
    select.focus();
  };
  // Toque: o seletor nativo abre no fim do toque (ou no clique sintetizado). Cancelar o
  // `touchend` impede a lista de piscar; o `touchstart` fica livre para não travar a rolagem.
  const onTouchEnd = (event: Event) => {
    const select = readonlySelect(event);
    if (!select) return;
    if (event.cancelable) event.preventDefault();
    select.focus();
  };
  const onKeyDown = (event: Event) => {
    const select = readonlySelect(event);
    if (!select) return;
    const key = event as KeyboardEvent;
    const typeahead = key.key.length === 1 && key.key !== ' ' && !key.ctrlKey && !key.metaKey;
    if (BLOCKED_KEYS.has(key.key) || typeahead) event.preventDefault();
  };
  const onChange = (event: Event) => {
    const select = readonlySelect(event);
    if (!select) return;
    const previous = committed.get(select);
    if (previous !== undefined && select.selectedIndex !== previous) {
      select.selectedIndex = previous;
      event.stopImmediatePropagation();
    }
  };
  target.addEventListener('focusin', onFocusIn, true);
  target.addEventListener('pointerdown', onMouseDown, true);
  target.addEventListener('mousedown', onMouseDown, true);
  target.addEventListener('touchend', onTouchEnd, { capture: true, passive: false });
  target.addEventListener('keydown', onKeyDown, true);
  target.addEventListener('change', onChange, true);
  return () => {
    target.removeEventListener('focusin', onFocusIn, true);
    target.removeEventListener('pointerdown', onMouseDown, true);
    target.removeEventListener('mousedown', onMouseDown, true);
    target.removeEventListener('touchend', onTouchEnd, true);
    target.removeEventListener('keydown', onKeyDown, true);
    target.removeEventListener('change', onChange, true);
  };
}
