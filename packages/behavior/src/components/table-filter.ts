import { format, getMessages } from '../core/config';
import { emit, normalizeText } from '../core/dom';
import { bindAll, type Behavior } from '../core/registry';
import { createAnnouncer } from '../core/status';

const DEBOUNCE_MS = 150;

const isEmptyRow = (row: HTMLTableRowElement) =>
  row.hasAttribute('data-eds-filter-empty') || row.querySelector('.eds-table-empty') !== null;

/** Colunas (base 1) de `data-eds-filter-columns="1,2"`; `null` = todas. */
function parseColumns(value: string | null): Set<number> | null {
  if (!value) return null;
  const set = new Set(
    value
      .split(',')
      .map((part) => Number(part.trim()))
      .filter((n) => Number.isInteger(n) && n > 0),
  );
  return set.size > 0 ? set : null;
}

/** Texto pesquisável da linha: células (ou as colunas pedidas), sem `data-eds-filter-ignore`. */
export function rowText(row: HTMLTableRowElement, columns: Set<number> | null): string {
  const parts: string[] = [];
  Array.from(row.cells).forEach((cell, i) => {
    if (cell.hasAttribute('data-eds-filter-ignore')) return;
    if (columns && !columns.has(i + 1)) return;
    parts.push(cell.textContent ?? '');
  });
  return normalizeText(parts.join(' ').replace(/\s+/g, ' '));
}

/**
 * Filtro local das linhas do `tbody`: `input[data-eds-table-filter="ID"]` (na toolbar ou onde
 * for). Só alcança as linhas que estão no DOM (paginação no servidor filtra no servidor).
 */
export const tableFilterBehavior: Behavior = {
  name: 'table-filter',
  selector: 'input[data-eds-table-filter]',
  bind(el) {
    const input = el as HTMLInputElement;
    const doc = input.ownerDocument;
    const ac = new AbortController();
    const { signal } = ac;

    const region = doc.createElement('div');
    region.className = 'eds-visually-hidden';
    region.setAttribute('role', 'status');
    input.after(region);
    const announcer = createAnnouncer(region);

    let table: HTMLTableElement | null = null;
    let observer: MutationObserver | null = null;
    let created: HTMLTableRowElement | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let queued = false;
    let lastQuery = '';

    const findTable = (): HTMLTableElement | null => {
      const id = input.getAttribute('data-eds-table-filter');
      const found = id ? doc.getElementById(id) : null;
      return found instanceof HTMLTableElement ? found : null;
    };

    const allRows = (t: HTMLTableElement): HTMLTableRowElement[] =>
      Array.from(t.tBodies).flatMap((body) => Array.from(body.rows));

    const dataRows = (t: HTMLTableElement): HTMLTableRowElement[] =>
      allRows(t).filter((row) => !isEmptyRow(row));

    const emptyRow = (t: HTMLTableElement, query: string): HTMLTableRowElement | null => {
      const authored = allRows(t).find((row) => row !== created && isEmptyRow(row));
      if (authored) return authored;
      const body = t.tBodies[0];
      if (!body) return null;
      if (!created) {
        const cols = Math.max(1, ...Array.from(t.rows).map((row) => row.cells.length));
        created = doc.createElement('tr');
        created.setAttribute('data-eds-filter-empty', '');
        created.hidden = true;
        const td = doc.createElement('td');
        td.className = 'eds-table-empty';
        td.colSpan = cols;
        const box = doc.createElement('div');
        box.className = 'eds-empty';
        const text = doc.createElement('p');
        text.className = 'eds-empty-text';
        box.append(text);
        td.append(box);
        created.append(td);
      }
      if (!created.isConnected) body.append(created);
      const text = created.querySelector('.eds-empty-text');
      const message = format(getMessages().tableFilterEmpty, { query });
      if (text && text.textContent !== message) text.textContent = message;
      return created;
    };

    /** Aplica o filtro; `user` = veio do usuário (anuncia e emite o evento). */
    const apply = (user: boolean) => {
      if (!table?.isConnected) table = findTable();
      if (!table) return;
      watch(table);
      const raw = input.value.trim();
      const needle = normalizeText(raw);
      const columns = parseColumns(input.getAttribute('data-eds-filter-columns'));
      const rows = dataRows(table);
      let count = 0;
      for (const row of rows) {
        const hide = needle !== '' && !rowText(row, columns).includes(needle);
        if (row.hidden !== hide) row.hidden = hide;
        if (!hide) count += 1;
      }
      const showEmpty = rows.length > 0 && count === 0;
      if (showEmpty) {
        const empty = emptyRow(table, raw);
        if (empty) empty.hidden = false;
      } else if (rows.length > 0) {
        for (const row of allRows(table)) if (isEmptyRow(row)) row.hidden = true;
      }
      // A Table (seleção) relê as linhas visíveis.
      table.dispatchEvent(new CustomEvent('eds:table-filtered', { bubbles: true }));
      if (!user) return;
      const m = getMessages();
      if (raw === '' && lastQuery !== '') {
        announcer.say(
          count === 1 ? m.tableFilterClearedOne : format(m.tableFilterCleared, { count }),
        );
      } else if (raw !== '') {
        announcer.say(
          count === 0
            ? m.tableFilterNone
            : count === 1
              ? m.tableFilterOne
              : format(m.tableFilterMany, { count }),
        );
      }
      lastQuery = raw;
      emit(input, 'table-filter', { query: raw, count });
    };

    // Linhas acrescentadas (ou reordenadas) depois passam pelo filtro.
    function watch(t: HTMLTableElement) {
      if (observer) return;
      observer = new MutationObserver((records) => {
        const foreign = records.some(
          (record) =>
            !(created && created.contains(record.target)) &&
            [...record.addedNodes, ...record.removedNodes].some((node) => node !== created),
        );
        if (!foreign || queued) return;
        queued = true;
        queueMicrotask(() => {
          queued = false;
          if (!signal.aborted) apply(false);
        });
      });
      observer.observe(t, { childList: true, subtree: true });
    }

    const flush = () => {
      if (timer) clearTimeout(timer);
      timer = null;
      apply(true);
    };

    input.addEventListener(
      'input',
      () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(flush, DEBOUNCE_MS);
      },
      { signal },
    );
    input.addEventListener(
      'search',
      () => {
        if (timer) flush();
      },
      { signal },
    );
    input.addEventListener(
      'keydown',
      (event) => {
        if (event.key !== 'Escape' || input.value === '') return;
        event.preventDefault();
        event.stopPropagation();
        input.value = '';
        flush();
      },
      { signal },
    );

    // O navegador pode restaurar o valor: filtra já, sem anunciar.
    if (input.value !== '') {
      apply(false);
      lastQuery = input.value.trim();
    }

    return () => {
      ac.abort();
      if (timer) clearTimeout(timer);
      observer?.disconnect();
      announcer.dispose();
      region.remove();
      created?.remove();
      if (table) {
        for (const row of dataRows(table)) row.hidden = false;
        table.dispatchEvent(new CustomEvent('eds:table-filtered', { bubbles: true }));
      }
    };
  },
};

export function initTableFilter(root: ParentNode = document): () => void {
  return bindAll(root, [tableFilterBehavior]);
}
