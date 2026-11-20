import { emit, ensureId, watchScrollRegion } from '../core/dom';
import { format, getLocale, getMessages } from '../core/config';
import { bindAll, type Behavior } from '../core/registry';
import { parseDate, parseNumber, sortValues, type SortDirection } from '../core/data';

export type { SortDirection };

/**
 * Região `role="status"` da tabela: a indicada por `data-eds-status="ID"`, a irmã do wrap
 * (filha do mesmo pai) ou, na falta, uma nova (oculta e vazia) logo depois do wrap.
 */
function statusRegion(table: HTMLElement): HTMLElement {
  const byId = table.getAttribute('data-eds-status');
  const explicit = byId ? table.ownerDocument.getElementById(byId) : null;
  if (explicit) return explicit;
  const wrap = table.closest<HTMLElement>('.eds-table-wrap') ?? table;
  const sibling = Array.from(wrap.parentElement?.children ?? []).find(
    (el): el is HTMLElement => el instanceof HTMLElement && el.getAttribute('role') === 'status',
  );
  if (sibling) return sibling;
  const created = table.ownerDocument.createElement('div');
  created.className = 'eds-visually-hidden';
  created.setAttribute('role', 'status');
  wrap.after(created);
  return created;
}

const cellValue = (cell: Element | undefined): string => {
  if (!cell) return '';
  return (cell.getAttribute('data-sort-value') ?? cell.textContent ?? '').trim();
};

export { parseDate, parseNumber };

/** Ordena as linhas por uma coluna; vazios ficam por último. Estável. */
export function sortRows(
  rows: HTMLTableRowElement[],
  column: number,
  direction: SortDirection,
): HTMLTableRowElement[] {
  return sortValues(rows, (row) => cellValue(row.cells[column]), direction, getLocale());
}

/**
 * Tabela: ordenação no cliente (`button.eds-table-sort` em `th`, `eds:table-sort` cancelável),
 * seleção (`input[data-eds-select-all]` / `input[data-eds-select-row]`), anúncio no
 * `[role=status]` e região rolável focável só quando rola.
 */
export const tableBehavior: Behavior = {
  name: 'table',
  selector: 'table.eds-table',
  bind(table) {
    if (!(table instanceof HTMLTableElement)) return;
    const ac = new AbortController();
    const { signal } = ac;
    const status = statusRegion(table);
    const messages = () => getMessages();

    const announce = (text: string) => {
      status.textContent = text;
    };

    // ---- Região rolável ----------------------------------------------------------------
    const wrap = table.closest<HTMLElement>('.eds-table-wrap');
    const caption = table.querySelector('caption');
    const stopScroll =
      wrap && caption
        ? watchScrollRegion(wrap, () => ensureId(caption, 'table-caption'))
        : () => undefined;

    // ---- Ordenação ---------------------------------------------------------------------
    const headers = () =>
      Array.from(table.querySelectorAll<HTMLTableCellElement>('thead th')).filter((th) =>
        th.querySelector('.eds-table-sort'),
      );

    table.addEventListener(
      'click',
      (event) => {
        const button = (event.target as Element).closest<HTMLElement>('.eds-table-sort');
        const th = button?.closest('th');
        if (!button || !th || !table.contains(th)) return;
        const direction: SortDirection =
          th.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending';
        const column = th.cellIndex;
        const label = (button.textContent ?? '').replace(/\s+/g, ' ').trim();
        // Com preventDefault o consumidor ordena (e atualiza aria-sort) no servidor.
        if (!emit(table, 'table-sort', { column, label, direction, th }, true)) return;

        const body = table.tBodies[0];
        if (body) {
          const rows = Array.from(body.rows).filter(
            (row) => !row.querySelector('.eds-table-empty'),
          );
          // Uma única inserção: as linhas vão para um fragmento e voltam de uma vez.
          const fragment = body.ownerDocument.createDocumentFragment();
          for (const row of sortRows(rows, column, direction)) fragment.append(row);
          body.append(fragment);
        }
        for (const other of headers()) {
          other.setAttribute('aria-sort', other === th ? direction : 'none');
        }
        const m = messages();
        announce(
          format(m.sortedBy, {
            column: label,
            direction: direction === 'ascending' ? m.sortAscending : m.sortDescending,
          }),
        );
      },
      { signal },
    );

    // ---- Seleção -----------------------------------------------------------------------
    const selectAll = () => table.querySelector<HTMLInputElement>('input[data-eds-select-all]');
    const allBoxes = () =>
      Array.from(table.querySelectorAll<HTMLInputElement>('input[data-eds-select-row]'));
    // Regra com filtro: o cabeçalho, "selecionar todos" e a contagem olham só as linhas
    // visíveis; uma linha oculta e marcada continua marcada (e segue no envio do form).
    const rowBoxes = () => allBoxes().filter((box) => !box.closest('tr')?.hidden);

    const syncAll = (): number => {
      const boxes = rowBoxes().filter((box) => !box.disabled);
      const checked = boxes.filter((box) => box.checked).length;
      const all = selectAll();
      if (all) {
        all.checked = boxes.length > 0 && checked === boxes.length;
        all.indeterminate = checked > 0 && checked < boxes.length;
      }
      return checked;
    };

    let checkedTotal = 0;
    const announceSelection = (count: number) => {
      const m = messages();
      // Linhas marcadas e ocultas pelo filtro: diz as da busca e o total (4.1.3).
      const total = checkedTotal;
      if (total !== count) {
        announce(
          count === 0
            ? format(m.selectedInSearchNone, { total })
            : count === 1
              ? format(m.selectedInSearchOne, { total })
              : format(m.selectedInSearchMany, { count, total }),
        );
        return;
      }
      announce(
        count === 0
          ? m.selectedNone
          : count === 1
            ? m.selectedOne
            : format(m.selectedMany, { count }),
      );
    };

    table.addEventListener(
      'change',
      (event) => {
        const input = event.target;
        if (!(input instanceof HTMLInputElement) || !table.contains(input)) return;
        if (input.hasAttribute('data-eds-select-all')) {
          for (const box of rowBoxes()) if (!box.disabled) box.checked = input.checked;
        } else if (!input.hasAttribute('data-eds-select-row')) return;
        const count = syncAll();
        // allBoxes() é consultado uma vez por change.
        const boxes = allBoxes();
        checkedTotal = boxes.filter((box) => box.checked).length;
        announceSelection(count);
        const rows = rowBoxes()
          .filter((box) => box.checked)
          .map((box) => box.closest('tr'));
        const total = checkedTotal;
        emit(table, 'table-select-change', { count, rows, total });
      },
      { signal },
    );
    // O filtro mudou as linhas visíveis: o cabeçalho reflete as visíveis.
    table.addEventListener('eds:table-filtered', () => void syncAll(), { signal });
    syncAll();

    return () => {
      ac.abort();
      stopScroll();
    };
  },
};

export function initTable(root: ParentNode = document): () => void {
  return bindAll(root, [tableBehavior]);
}
