/**
 * Coordenador de visibilidade das linhas de uma tabela. Cada fonte de filtro (busca geral, filtros
 * por coluna) registra um predicado `(linha) => boolean` (verdadeiro = fica visível); o coordenador
 * junta todos com E lógico, grava `row.hidden`, trata a linha de "vazio" e dispara
 * `eds:table-filter` (na tabela, `detail { query, count }`) uma única vez. Quem muda a fonte anuncia o resultado.
 */
import { format, getMessages } from './config';
import { emit } from './dom';
import { hubFor } from './table-hub';

export type RowPredicate = (row: HTMLTableRowElement) => boolean;

interface Source {
  predicate: RowPredicate;
  /** Texto buscado, para a mensagem do estado vazio. */
  label: string;
}

interface Coordinator {
  sources: Map<string, Source>;
  created: HTMLTableRowElement | null;
  observer: MutationObserver | null;
  queued: boolean;
}

const coordinators = new WeakMap<HTMLTableElement, Coordinator>();

export const isEmptyRow = (row: HTMLTableRowElement): boolean =>
  row.hasAttribute('data-eds-filter-empty') || row.querySelector('.eds-table-empty') !== null;

const allRows = (table: HTMLTableElement): HTMLTableRowElement[] =>
  Array.from(table.tBodies).flatMap((body) => Array.from(body.rows));

/** Linhas de dados (sem a linha de "vazio"). */
export const dataRows = (table: HTMLTableElement): HTMLTableRowElement[] =>
  allRows(table).filter((row) => !isEmptyRow(row));

function coordinatorFor(table: HTMLTableElement): Coordinator {
  let c = coordinators.get(table);
  if (!c) {
    c = { sources: new Map(), created: null, observer: null, queued: false };
    coordinators.set(table, c);
  }
  return c;
}

function emptyRow(
  table: HTMLTableElement,
  c: Coordinator,
  label: string,
): HTMLTableRowElement | null {
  const authored = allRows(table).find((row) => row !== c.created && isEmptyRow(row));
  const doc = table.ownerDocument;
  let row = authored ?? null;
  if (!row) {
    const body = table.tBodies[0];
    if (!body) return null;
    if (!c.created) {
      const cols = Math.max(1, ...Array.from(table.rows).map((r) => r.cells.length));
      c.created = doc.createElement('tr');
      c.created.setAttribute('data-eds-filter-empty', '');
      c.created.hidden = true;
      const td = doc.createElement('td');
      td.className = 'eds-table-empty';
      td.colSpan = cols;
      const box = doc.createElement('div');
      box.className = 'eds-empty';
      const text = doc.createElement('p');
      text.className = 'eds-empty-text';
      box.append(text);
      td.append(box);
      c.created.append(td);
    }
    if (!c.created.isConnected) body.append(c.created);
    row = c.created;
    const text = row.querySelector('.eds-empty-text');
    const m = getMessages();
    const message = label ? format(m.tableFilterEmpty, { query: label }) : m.tableFilterNone;
    if (text && text.textContent !== message) text.textContent = message;
  }
  return row;
}

/**
 * Recalcula `row.hidden` de todas as linhas e devolve quantas ficaram visíveis.
 * Sem nenhuma fonte, tudo aparece.
 */
export function refreshRows(table: HTMLTableElement): number {
  const c = coordinatorFor(table);
  const rows = dataRows(table);
  const predicates = [...c.sources.values()].map((s) => s.predicate);
  let count = 0;
  for (const row of rows) {
    const hide = predicates.some((p) => !p(row));
    if (row.hidden !== hide) row.hidden = hide;
    if (!hide) count += 1;
  }
  if (rows.length > 0 && count === 0 && predicates.length > 0) {
    const label = [...c.sources.values()].map((s) => s.label).find((l) => l !== '') ?? '';
    const empty = emptyRow(table, c, label);
    if (empty) empty.hidden = false;
  } else if (rows.length > 0) {
    for (const row of allRows(table)) if (isEmptyRow(row)) row.hidden = true;
  }
  emit(table, 'table-filter', { query: hubFor(table).query.q, count });
  return count;
}

/** Agenda um `refreshRows` (uma vez por microtask). */
export function scheduleRefresh(table: HTMLTableElement): void {
  const c = coordinatorFor(table);
  if (c.queued) return;
  c.queued = true;
  queueMicrotask(() => {
    c.queued = false;
    if (coordinators.get(table) === c) refreshRows(table);
  });
}

/** Registra (ou troca) uma fonte; não aplica: chame `refreshRows`. */
export function setRowSource(
  table: HTMLTableElement,
  id: string,
  predicate: RowPredicate,
  label = '',
): void {
  const c = coordinatorFor(table);
  c.sources.set(id, { predicate, label });
  if (!c.observer && typeof MutationObserver !== 'undefined') {
    // Linhas acrescentadas depois passam pelos filtros.
    c.observer = new MutationObserver((records) => {
      const foreign = records.some((record) =>
        [...record.addedNodes].some(
          (node) => node instanceof HTMLTableRowElement && node !== c.created,
        ),
      );
      if (foreign) scheduleRefresh(table);
    });
    c.observer.observe(table, { childList: true, subtree: true });
  }
}

/** Remove uma fonte e, se foi a última, solta o coordenador (linhas voltam a aparecer). */
export function removeRowSource(table: HTMLTableElement, id: string): void {
  const c = coordinators.get(table);
  if (!c) return;
  c.sources.delete(id);
  refreshRows(table);
  if (c.sources.size === 0) {
    c.observer?.disconnect();
    c.created?.remove();
    coordinators.delete(table);
  }
}

/** Valor de uma célula para filtro: `data-filter-value`, `data-sort-value` ou o texto. */
export function cellFilterValue(cell: Element | undefined): string {
  if (!cell) return '';
  return (
    cell.getAttribute('data-filter-value') ??
    cell.getAttribute('data-sort-value') ??
    cell.textContent ??
    ''
  )
    .replace(/\s+/g, ' ')
    .trim();
}
