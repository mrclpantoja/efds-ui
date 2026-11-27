import { emit } from '../core/dom';
import { format, getMessages } from '../core/config';
import { bindAll, type Behavior } from '../core/registry';
import { hubFor, isRemote, tableById } from '../core/table-hub';

/**
 * Barra de ações em lote: `[data-eds-table-bulk="ID"]` (vem `hidden`; aparece com a seleção).
 * Contagem em texto comum (o anúncio é o da região de status da tabela), `[data-eds-bulk-action]`
 * emite `eds:table-bulk-action` (cancelável), `[data-eds-bulk-all-results]` ("selecionar todos os
 * N", só tabela remota com `data-eds-total`) e `[data-eds-bulk-clear]`.
 */
export const tableBulkBehavior: Behavior = {
  name: 'table-bulk',
  selector: '[data-eds-table-bulk]',
  bind(el) {
    const bar = el;
    const doc = bar.ownerDocument;
    const table = tableById(doc, bar.getAttribute('data-eds-table-bulk'));
    if (!table) return;
    const hub = hubFor(table);
    const ac = new AbortController();
    const { signal } = ac;
    if (!bar.hasAttribute('aria-label') && !bar.hasAttribute('aria-labelledby')) {
      bar.setAttribute('aria-label', getMessages().bulkLabel);
    }
    if (!bar.hasAttribute('role')) bar.setAttribute('role', 'group');

    const countEl = bar.querySelector<HTMLElement>('[data-eds-bulk-count]');
    const allBtn = bar.querySelector<HTMLElement>('[data-eds-bulk-all-results]');
    const totalEl = bar.querySelector<HTMLElement>('[data-eds-bulk-total]');

    /** Linhas marcadas e visíveis (a mesma regra da seleção da tabela). */
    const checkedRows = (): HTMLTableRowElement[] =>
      Array.from(table.querySelectorAll<HTMLInputElement>('input[data-eds-select-row]'))
        .filter((box) => box.checked)
        .map((box) => box.closest('tr'))
        .filter((row): row is HTMLTableRowElement => row !== null && !row.hidden);
    const idsOf = (rows: HTMLTableRowElement[]) =>
      rows.map((row) => row.getAttribute('data-eds-row-id')).filter((id): id is string => !!id);
    const total = () => Number(table.getAttribute('data-eds-total')) || 0;

    const update = () => {
      const m = getMessages();
      const rows = checkedRows();
      const count = rows.length;
      const active = doc.activeElement;
      const hasFocus = active instanceof HTMLElement && bar.contains(active);
      if (count === 0) hub.scope = 'page';
      if (countEl) {
        countEl.textContent =
          hub.scope === 'all'
            ? format(m.bulkAllSelected, { total: total() })
            : count === 1
              ? m.bulkCountOne
              : format(m.bulkCount, { count });
      }
      // "Selecionar todos os N": cabeçalho marca todas as linhas da página e há mais resultados.
      const all = table.querySelector<HTMLInputElement>('input[data-eds-select-all]');
      const pageRows = table.querySelectorAll('input[data-eds-select-row]').length;
      const offer =
        isRemote(table) &&
        hub.scope === 'page' &&
        all?.checked === true &&
        total() > pageRows &&
        count > 0;
      if (allBtn) allBtn.hidden = !offer;
      if (totalEl) totalEl.textContent = String(total());
      const wasHidden = bar.hidden;
      bar.hidden = count === 0;
      if (count === 0 && hasFocus && !wasHidden) {
        (all ?? table.closest<HTMLElement>('.eds-table-wrap') ?? table).focus?.();
      }
    };

    table.addEventListener('eds:table-select-change', update, { signal });
    table.addEventListener('eds:table-filtered', update, { signal });
    update();

    bar.addEventListener(
      'click',
      (event) => {
        const target = event.target as Element;
        const action = target.closest<HTMLElement>('[data-eds-bulk-action]');
        if (action && bar.contains(action)) {
          const rows = checkedRows();
          emit(
            table,
            'table-bulk-action',
            {
              action: action.getAttribute('data-eds-bulk-action') ?? '',
              ids: idsOf(rows),
              rows,
              count: rows.length,
              scope: hub.scope,
            },
            true,
          );
          return;
        }
        if (target.closest('[data-eds-bulk-clear]')) {
          hub.clearSelection();
          return;
        }
        if (target.closest('[data-eds-bulk-all-results]')) {
          hub.scope = 'all';
          update();
          hub.announce(format(getMessages().bulkAllSelected, { total: total() }));
          emit(table, 'table-select-all-results', { total: total() });
          bar.querySelector<HTMLElement>('[data-eds-bulk-action]')?.focus();
        }
      },
      { signal },
    );

    return () => ac.abort();
  },
};

export function initTableBulk(root: ParentNode = document): () => void {
  return bindAll(root, [tableBulkBehavior]);
}
