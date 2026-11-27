/**
 * Estado compartilhado de uma tabela entre os módulos da Table avançada (ordenação, filtros,
 * colunas, lote, remoto, edição). Cada módulo liga por conta própria, em qualquer ordem: o hub é
 * criado sob demanda por `hubFor(table)`. Nada aqui conhece um módulo em particular.
 */
import { getMessages } from './config';
import type { SortCriterion } from './data';
import { emptyTableQuery, type TableQuery, type TableQueryParams } from './table-query';
import { createAnnouncer, type Announcer } from './status';

export interface TableColumnState {
  order: string[];
  hidden: string[];
  widths: Record<string, number>;
}

export interface TableSelection {
  count: number;
  ids: string[];
  scope: 'page' | 'all';
}

export interface TableState {
  query: TableQuery;
  columns: TableColumnState;
  selection: TableSelection;
  loading: boolean;
}

export interface TableController {
  getState: () => TableState;
  setState: (
    next: Partial<Pick<TableQuery, 'sort' | 'filters' | 'q' | 'page' | 'size'>> & {
      columns?: Partial<TableColumnState>;
    },
  ) => void;
  clearSelection: () => void;
  setLoading: (loading: boolean) => void;
}

/** Operações de colunas (módulo de colunas); usadas pelo painel "Colunas". */
export interface ColumnsApi {
  state: () => TableColumnState;
  /** Colunas arranjáveis (não bloqueadas), na ordem atual, com as ocultas. */
  ids: () => string[];
  label: (id: string) => string;
  visible: (id: string) => boolean;
  visibleCount: () => number;
  canResize: () => boolean;
  canReorder: () => boolean;
  width: (id: string) => number;
  /** Move uma posição no próprio grupo (início, fim, livre). Devolve `false` se não moveu. */
  move: (id: string, delta: -1 | 1) => boolean;
  toggle: (id: string, visible: boolean) => boolean;
  resize: (id: string, delta: number) => number;
  reset: () => void;
}

type Listener = (data?: unknown) => void;

export interface TableHub {
  readonly table: HTMLTableElement;
  query: TableQuery;
  /** A Table (ordenação, seleção) ligou. */
  ready: boolean;
  loading: boolean;
  /** Alcance da seleção: a página ou todos os resultados ("selecionar todos os N"). */
  scope: 'page' | 'all';
  announce: (text: string) => void;
  on: (event: string, fn: Listener) => () => void;
  fire: (event: string, data?: unknown) => void;
  /** Preenchidos pelos módulos que os implementam. */
  getSelection: () => TableSelection;
  clearSelection: () => void;
  getColumns: () => TableColumnState;
  setColumns: (partial: Partial<TableColumnState>) => void;
  /** Pede uma nova consulta ao servidor (módulo remoto). Devolve `true` se alguém tratou. */
  request: (reason: string) => boolean;
  setLoading: (loading: boolean) => void;
  controller: TableController;
  /** Operações de colunas, quando o módulo está ligado. */
  columns?: ColumnsApi;
  /** Libera o hub (nenhum módulo o usa mais). */
  dispose: () => void;
}

const hubs = new WeakMap<HTMLTableElement, TableHub>();

/** Região `role="status"` da tabela: a de `data-eds-status`, a irmã do wrap ou uma nova (oculta). */
export function statusRegion(table: HTMLElement): HTMLElement {
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

export const isRemote = (table: HTMLElement): boolean =>
  table.hasAttribute('data-eds-table-remote');

export function remoteMode(table: HTMLElement): 'navigate' | 'event' {
  return table.getAttribute('data-eds-table-remote') === 'event' ? 'event' : 'navigate';
}

/** Nomes dos parâmetros da URL (`data-eds-table-params`, JSON). */
export function queryParams(table: HTMLElement): Partial<TableQueryParams> {
  const raw = table.getAttribute('data-eds-table-params');
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Partial<TableQueryParams>) : {};
  } catch {
    return {};
  }
}

/** Texto de um cabeçalho de coluna, sem o que o behavior acrescenta (ordem, ajuda, alça). */
export function columnLabel(th: Element | null | undefined): string {
  if (!th) return '';
  const clone = th.cloneNode(true) as Element;
  for (const extra of clone.querySelectorAll(
    '.eds-table-sort-order, .eds-table-sort-text, .eds-visually-hidden, .eds-table-colhandle, .eds-table-resize, .eds-table-filter, .eds-table-filter-btn, [popover], form, svg, [hidden]',
  )) {
    extra.remove();
  }
  return (clone.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/** Cabeçalho (`th`) de uma coluna pelo id (`data-eds-col`). */
export function headerOf(table: HTMLTableElement, key: string): HTMLTableCellElement | null {
  for (const th of table.querySelectorAll<HTMLTableCellElement>('thead th[data-eds-col]')) {
    if (th.getAttribute('data-eds-col') === key) return th;
  }
  return null;
}

/** Índice (`cellIndex`) da coluna pelo id; também aceita o índice como texto. */
export function columnIndex(table: HTMLTableElement, key: string): number {
  const th = headerOf(table, key);
  if (th) return th.cellIndex;
  const n = Number(key);
  return Number.isInteger(n) ? n : -1;
}

export function hubFor(table: HTMLTableElement): TableHub {
  const existing = hubs.get(table);
  if (existing) return existing;
  const listeners = new Map<string, Set<Listener>>();
  let announcer: Announcer | null = null;
  let overlay: HTMLElement | null = null;
  let createdOverlay = false;
  let restore: HTMLElement | null = null;

  const hub: TableHub = {
    table,
    query: emptyTableQuery(Number(table.getAttribute('data-eds-size')) || 0),
    ready: false,
    loading: false,
    scope: 'page',
    announce(text) {
      announcer ??= createAnnouncer(statusRegion(table));
      announcer.say(text);
    },
    on(event, fn) {
      let set = listeners.get(event);
      if (!set) {
        set = new Set();
        listeners.set(event, set);
      }
      set.add(fn);
      return () => set.delete(fn);
    },
    fire(event, data) {
      for (const fn of [...(listeners.get(event) ?? [])]) fn(data);
    },
    getSelection: () => ({ count: 0, ids: [], scope: 'page' }),
    clearSelection: () => undefined,
    getColumns: () => ({ order: [], hidden: [], widths: {} }),
    setColumns: () => undefined,
    request: () => false,
    setLoading(loading) {
      if (hub.loading === loading) return;
      hub.loading = loading;
      const wrap = table.closest<HTMLElement>('.eds-table-wrap');
      const m = getMessages();
      if (loading) {
        table.setAttribute('aria-busy', 'true');
        const active = table.ownerDocument.activeElement;
        restore = active instanceof HTMLElement && table.contains(active) ? active : null;
        table.setAttribute('inert', '');
        overlay = wrap?.querySelector<HTMLElement>(':scope > .eds-table-overlay') ?? null;
        if (!overlay && wrap) {
          createdOverlay = true;
          overlay = table.ownerDocument.createElement('div');
          overlay.className = 'eds-table-overlay';
          const box = table.ownerDocument.createElement('div');
          box.className = 'eds-table-overlay-box';
          const spinner = table.ownerDocument.createElement('span');
          spinner.className = 'eds-spinner';
          spinner.setAttribute('aria-hidden', 'true');
          const text = table.ownerDocument.createElement('span');
          text.className = 'eds-visually-hidden';
          text.setAttribute('role', 'status');
          text.textContent = m.tableLoading;
          box.append(spinner, text);
          overlay.append(box);
          wrap.append(overlay);
        }
      } else {
        table.removeAttribute('aria-busy');
        table.removeAttribute('inert');
        if (overlay && createdOverlay) overlay.remove();
        overlay = null;
        createdOverlay = false;
        const target = restore;
        restore = null;
        const active = table.ownerDocument.activeElement;
        if (target?.isConnected && (!active || active === table.ownerDocument.body)) {
          target.focus({ preventScroll: true });
        }
      }
      hub.fire('loading', loading);
    },
    controller: undefined as unknown as TableController,
    dispose() {
      announcer?.dispose();
      hubs.delete(table);
    },
  };

  hub.controller = {
    getState: () => ({
      query: {
        ...hub.query,
        sort: hub.query.sort.map((c) => ({ ...c })),
        filters: { ...hub.query.filters },
      },
      columns: hub.getColumns(),
      selection: hub.getSelection(),
      loading: hub.loading,
    }),
    setState(next) {
      const { columns, ...query } = next;
      if (query.sort) hub.query.sort = query.sort.map((c: SortCriterion) => ({ ...c }));
      if (query.filters) hub.query.filters = { ...query.filters };
      if (query.q !== undefined) hub.query.q = query.q;
      if (query.page !== undefined) hub.query.page = query.page;
      if (query.size !== undefined) hub.query.size = query.size;
      if (columns) hub.setColumns(columns);
      hub.fire('sync', Object.keys(query));
    },
    clearSelection: () => hub.clearSelection(),
    setLoading: (loading) => hub.setLoading(loading),
  };
  hubs.set(table, hub);
  return hub;
}

/** Controlador público (`EDS.table(el)`); `null` se a tabela não foi ligada pela Table. */
export function tableController(table: HTMLElement | null | undefined): TableController | null {
  if (!(table instanceof HTMLTableElement)) return null;
  const hub = hubs.get(table);
  return hub?.ready ? hub.controller : null;
}

/** Tabela pelo id de um atributo (`data-eds-…="id"`). */
export function tableById(doc: Document, id: string | null): HTMLTableElement | null {
  const found = id ? doc.getElementById(id) : null;
  if (found instanceof HTMLTableElement) return found;
  const inner = found?.querySelector('table');
  return inner instanceof HTMLTableElement ? inner : null;
}

/** Tabela de um controle externo: o id do atributo ou, vazio, a mais próxima que tenha `selector`. */
export function tableFor(
  el: HTMLElement,
  attribute: string,
  selector = 'table.eds-table',
): HTMLTableElement | null {
  const id = el.getAttribute(attribute);
  if (id) return tableById(el.ownerDocument, id);
  for (let node: HTMLElement | null = el.parentElement; node; node = node.parentElement) {
    const found = node.querySelector<HTMLTableElement>(selector);
    if (found) return found;
  }
  return null;
}
