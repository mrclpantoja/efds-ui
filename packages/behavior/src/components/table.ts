import { emit, ensureId, watchScrollRegion } from '../core/dom';
import { format, getMessages } from '../core/config';
import { bindAll, type Behavior } from '../core/registry';

export type SortDirection = 'ascending' | 'descending';

const collator = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });

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

/** "R$ 1.280,50", "1280.5", "-3" -> número (pt-BR por padrão); senão `null`. */
export function parseNumber(text: string): number | null {
  const t = text.replace(/\s|R\$|€|£|%/g, '');
  if (/^[+-]?\d{1,3}(\.\d{3})+(,\d+)?$/.test(t))
    return Number(t.replace(/\./g, '').replace(',', '.'));
  if (/^[+-]?\d+,\d+$/.test(t)) return Number(t.replace(',', '.'));
  if (/^[+-]?\d+(\.\d+)?$/.test(t)) return Number(t);
  return null;
}

/** "31/12/2025" ou "2025-12-31" (opcional hora) -> timestamp; senão `null`. */
export function parseDate(text: string): number | null {
  let match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2}))?$/.exec(text);
  if (match) {
    const [, d, m, y, hh, mm] = match;
    return new Date(
      Number(y),
      Number(m) - 1,
      Number(d),
      Number(hh ?? 0),
      Number(mm ?? 0),
    ).getTime();
  }
  match = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2}))?/.exec(text);
  if (match) {
    const [, y, m, d, hh, mm] = match;
    return new Date(
      Number(y),
      Number(m) - 1,
      Number(d),
      Number(hh ?? 0),
      Number(mm ?? 0),
    ).getTime();
  }
  return null;
}

/** Ordena as linhas por uma coluna; vazios ficam por último. Estável. */
export function sortRows(
  rows: HTMLTableRowElement[],
  column: number,
  direction: SortDirection,
): HTMLTableRowElement[] {
  const values = rows.map((row) => cellValue(row.cells[column]));
  const filled = values.filter((v) => v !== '');
  const numbers = filled.map(parseNumber);
  const dates = filled.map(parseDate);
  const kind =
    filled.length > 0 && numbers.every((n) => n !== null)
      ? 'number'
      : filled.length > 0 && dates.every((d) => d !== null)
        ? 'date'
        : 'text';
  const sign = direction === 'ascending' ? 1 : -1;
  const keyed = rows.map((row, i) => {
    const raw = values[i] ?? '';
    const key = kind === 'number' ? parseNumber(raw) : kind === 'date' ? parseDate(raw) : raw;
    return { row, key, empty: raw === '' };
  });
  keyed.sort((a, b) => {
    if (a.empty || b.empty) return a.empty === b.empty ? 0 : a.empty ? 1 : -1;
    if (kind === 'text') return sign * collator.compare(String(a.key), String(b.key));
    return sign * ((a.key as number) - (b.key as number));
  });
  return keyed.map((k) => k.row);
}

/**
 * Tabela: ordenação no cliente (`button.eds-table-sort` em `th`, `eds:sort` cancelável),
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
        if (!emit(table, 'sort', { column, label, direction, th }, true)) return;

        const body = table.tBodies[0];
        if (body) {
          const rows = Array.from(body.rows).filter(
            (row) => !row.querySelector('.eds-table-empty'),
          );
          for (const row of sortRows(rows, column, direction)) body.append(row);
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
    const rowBoxes = () =>
      Array.from(table.querySelectorAll<HTMLInputElement>('input[data-eds-select-row]'));

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

    const announceSelection = (count: number) => {
      const m = messages();
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
        announceSelection(count);
        const rows = rowBoxes()
          .filter((box) => box.checked)
          .map((box) => box.closest('tr'));
        emit(table, 'select-change', { count, rows });
      },
      { signal },
    );
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
