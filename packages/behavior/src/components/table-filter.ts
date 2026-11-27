import { format, getMessages } from '../core/config';
import { emit, normalizeText, uid } from '../core/dom';
import { bindAll, type Behavior } from '../core/registry';
import { createAnnouncer } from '../core/status';
import { columnIndex, hubFor, isRemote } from '../core/table-hub';
import { refreshRows, removeRowSource, scheduleRefresh, setRowSource } from '../core/table-rows';

const DEBOUNCE_MS = 150;
const REMOTE_DEBOUNCE_MS = 300;

/**
 * Colunas de `data-eds-filter-columns`: índices (base 1) e/ou ids (`data-eds-col`); `null` = todas.
 * Os ids viram índice (base 1) pela posição atual do cabeçalho.
 */
function parseColumns(value: string | null, table: HTMLTableElement | null): Set<number> | null {
  if (!value) return null;
  const set = new Set<number>();
  for (const part of value.split(',')) {
    const token = part.trim();
    if (token === '') continue;
    const n = Number(token);
    if (Number.isInteger(n) && n > 0) set.add(n);
    else if (table) {
      const index = columnIndex(table, token);
      if (index >= 0) set.add(index + 1);
    }
  }
  return set.size > 0 ? set : null;
}

/** Texto normalizado por linha; invalida quando a linha muda (ver o observador em `watch`). */
const rowCache = new WeakMap<HTMLTableRowElement, { key: string; text: string }>();

function cachedRowText(row: HTMLTableRowElement, columns: Set<number> | null, key: string): string {
  const hit = rowCache.get(row);
  if (hit && hit.key === key) return hit.text;
  const text = rowText(row, columns);
  rowCache.set(row, { key, text });
  return text;
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

    const sourceId = uid('search');
    let table: HTMLTableElement | null = null;
    let observer: MutationObserver | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let lastQuery = '';
    let registered: HTMLTableElement | null = null;

    const findTable = (): HTMLTableElement | null => {
      const id = input.getAttribute('data-eds-table-filter');
      const found = id ? doc.getElementById(id) : null;
      return found instanceof HTMLTableElement ? found : null;
    };

    /** Registra o predicado da busca no coordenador de linhas da tabela. */
    const register = (t: HTMLTableElement) => {
      registered = t;
      const needle = normalizeText(input.value.trim());
      const attr = input.getAttribute('data-eds-filter-columns');
      const columns = parseColumns(attr, t);
      const key = `${attr ?? ''}|${[...(columns ?? [])].join(',')}`;
      setRowSource(
        t,
        sourceId,
        (row) => needle === '' || cachedRowText(row, columns, key).includes(needle),
        input.value.trim(),
      );
    };

    /** Aplica o filtro; `user` = veio do usuário (anuncia e emite o evento). */
    const apply = (user: boolean) => {
      if (!table?.isConnected) table = findTable();
      if (!table) return;
      watch(table);
      const raw = input.value.trim();
      if (isRemote(table)) {
        // Tabela remota: nada é filtrado aqui; a consulta vai ao servidor.
        const hub = hubFor(table);
        if (hub.query.q === raw) return;
        hub.query.q = raw;
        hub.query.page = 1;
        lastQuery = raw;
        hub.fire('sync', ['q']);
        if (user && !hub.request('q')) emit(input, 'table-filter', { query: raw, count: 0 });
        return;
      }
      register(table);
      const count = refreshRows(table);
      if (!user) return;
      const m = getMessages();
      let message: string;
      if (raw === '' && lastQuery !== '') {
        // Linhas marcadas continuam marcadas: o total volta a ser dito junto.
        const checked = Array.from(
          table.querySelectorAll<HTMLInputElement>('input[data-eds-select-row]'),
        ).filter((box) => box.checked).length;
        const selection =
          checked === 0
            ? ''
            : ` ${checked === 1 ? m.tableFilterSelectedOne : format(m.tableFilterSelectedMany, { count: checked })}`;
        message =
          (count === 1 ? m.tableFilterClearedOne : format(m.tableFilterCleared, { count })) +
          selection;
        announcer.say(message);
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
      hubFor(table).query.q = raw;
      emit(input, 'table-filter', { query: raw, count });
    };

    // Texto das linhas mudou: descarta o cache e refiltra.
    function watch(t: HTMLTableElement) {
      if (observer) return;
      observer = new MutationObserver((records) => {
        for (const record of records) {
          const target =
            record.target instanceof Element ? record.target : record.target.parentElement;
          const row = target?.closest('tr');
          if (row) rowCache.delete(row);
        }
        if (registered) scheduleRefresh(registered);
      });
      observer.observe(t, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['data-eds-filter-ignore'],
      });
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
        timer = setTimeout(flush, table && isRemote(table) ? REMOTE_DEBOUNCE_MS : DEBOUNCE_MS);
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
      if (registered) removeRowSource(registered, sourceId);
    };
  },
};

export function initTableFilter(root: ParentNode = document): () => void {
  return bindAll(root, [tableFilterBehavior]);
}
