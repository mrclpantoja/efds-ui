import { emit } from '../core/dom';
import { format, getMessages } from '../core/config';
import { bindAll, type Behavior } from '../core/registry';
import {
  applyQueryToUrl,
  parseTableQuery,
  toTableSearchParams,
  type TableQuery,
} from '../core/table-query';
import { hubFor, isRemote, queryParams, remoteMode, tableById } from '../core/table-hub';

export interface TableQueryDetail {
  query: TableQuery;
  params: URLSearchParams;
  reason: 'sort' | 'filter' | 'q' | 'page' | 'size' | 'chip' | 'clear';
  /** Modo `event`: o app devolve a promessa da busca; a tabela cuida do carregamento e do erro. */
  respondWith: (promise: Promise<{ total?: number; page?: number } | void>) => void;
}

const cloneQuery = (query: TableQuery): TableQuery => ({
  ...query,
  sort: query.sort.map((c) => ({ ...c })),
  filters: { ...query.filters },
});

/**
 * Tabela remota (`data-eds-table-remote="navigate|event"`): ordenação, filtro, busca e paginação
 * não acontecem aqui. A consulta vira `eds:table-query` (cancelável) e, em `navigate`, uma URL;
 * em `event` o app responde com `respondWith(promessa)`.
 */
export const tableRemoteBehavior: Behavior = {
  name: 'table-remote',
  selector: 'table.eds-table[data-eds-table-remote]',
  bind(el) {
    const table = el as HTMLTableElement;
    const hub = hubFor(table);
    const params = queryParams(table);
    const mode = remoteMode(table);
    let token = 0;
    let lastReason: TableQueryDetail['reason'] = 'sort';

    // O estado inicial vem da URL (o servidor já devolveu a página certa).
    const win = table.ownerDocument.defaultView;
    if (mode === 'navigate' && win) {
      const initial = parseTableQuery(win.location.search, params, { size: hub.query.size });
      if (win.location.search) {
        hub.query = {
          ...hub.query,
          page: initial.page,
          size: initial.size || hub.query.size,
          q: initial.q,
          filters: initial.filters,
          sort: initial.sort.length > 0 ? initial.sort : hub.query.sort,
        };
        hub.fire('sync', ['sort', 'filters', 'q', 'page', 'size']);
      }
    }

    const finish = (result: { total?: number; page?: number } | void) => {
      hub.setLoading(false);
      table.removeAttribute('data-eds-error');
      if (result?.total !== undefined) table.setAttribute('data-eds-total', String(result.total));
      if (result?.page !== undefined) hub.query.page = result.page;
      const total = Number(table.getAttribute('data-eds-total'));
      if (Number.isFinite(total) && table.hasAttribute('data-eds-total')) {
        const pages = hub.query.size > 0 ? Math.max(1, Math.ceil(total / hub.query.size)) : 1;
        hub.announce(
          format(getMessages().tableResults, { count: total, page: hub.query.page, pages }),
        );
      }
      hub.fire('sync', ['page', 'size']);
      hub.fire('load');
      emit(table, 'table-load', { query: cloneQuery(hub.query), total: total || 0 });
    };

    const run = (reason: TableQueryDetail['reason']): void => {
      lastReason = reason;
      const id = ++token;
      const query = cloneQuery(hub.query);
      let promise: Promise<{ total?: number; page?: number } | void> | null = null;
      const detail: TableQueryDetail = {
        query,
        params: toTableSearchParams(query, params),
        reason,
        respondWith: (p) => {
          promise = p;
        },
      };
      if (!emit(table, 'table-query', detail, true)) return;
      if (mode === 'navigate') {
        if (!win) return;
        const anchor = table.getAttribute('data-eds-table-anchor');
        win.location.assign(applyQueryToUrl(win.location.href, query, params, anchor));
        return;
      }
      const pending = promise as Promise<{ total?: number; page?: number } | void> | null;
      if (!pending) return;
      table.removeAttribute('data-eds-error');
      hub.setLoading(true);
      pending.then(
        (result) => {
          // Só a última consulta vale.
          if (id === token) finish(result);
        },
        (error: unknown) => {
          if (id !== token) return;
          hub.setLoading(false);
          table.setAttribute('data-eds-error', '');
          hub.announce(getMessages().tableLoadError);
          emit(table, 'table-error', { error, retry: () => run(lastReason) });
        },
      );
    };

    hub.request = (reason) => {
      run(reason as TableQueryDetail['reason']);
      return true;
    };

    return () => {
      token += 1;
      hub.request = () => false;
      if (hub.loading) hub.setLoading(false);
    };
  },
};

/** Página de um link da paginação: `data-eds-page` ou o parâmetro `page` do `href`. */
function pageOf(link: HTMLAnchorElement, name: string): number | null {
  const attr = Number(link.getAttribute('data-eds-page'));
  if (Number.isInteger(attr) && attr > 0) return attr;
  try {
    const url = new URL(link.href, link.ownerDocument.baseURI);
    const n = Number(url.searchParams.get(name));
    return Number.isInteger(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

/** `nav[data-eds-table-pagination="ID"]`: links e `select[data-eds-table-size="ID"]`. */
export const tablePaginationBehavior: Behavior = {
  name: 'table-pagination',
  selector: 'nav[data-eds-table-pagination], select[data-eds-table-size]',
  bind(el) {
    const ac = new AbortController();
    const { signal } = ac;
    const isNav = el.hasAttribute('data-eds-table-pagination');
    const id = el.getAttribute(isNav ? 'data-eds-table-pagination' : 'data-eds-table-size');
    const find = () => tableById(el.ownerDocument, id);
    let stop: (() => void) | null = null;

    if (isNav) {
      el.addEventListener(
        'click',
        (event) => {
          const link = (event.target as Element).closest<HTMLAnchorElement>('a[href]');
          const table = find();
          if (!link || !table || !isRemote(table) || !el.contains(link)) return;
          if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.shiftKey) return;
          const hub = hubFor(table);
          const names = queryParams(table);
          const page = pageOf(link, names.page ?? 'page');
          if (page === null) return;
          event.preventDefault();
          hub.query.page = page;
          hub.request('page');
          // O foco permanece no link; se a navegação recriar a lista, vai para a página atual.
          if (el.hasAttribute('data-eds-focus-current')) {
            const off = hub.on('load', () => {
              off();
              el.querySelector<HTMLElement>('[aria-current="page"]')?.focus();
            });
          }
        },
        { signal },
      );
    } else {
      const select = el as HTMLSelectElement;
      const table = find();
      if (table) {
        const hub = hubFor(table);
        if (hub.query.size === 0 && Number(select.value) > 0) hub.query.size = Number(select.value);
        stop = hub.on('sync', () => {
          if (hub.query.size > 0 && select.value !== String(hub.query.size)) {
            select.value = String(hub.query.size);
          }
        });
      }
      select.addEventListener(
        'change',
        () => {
          const t = find();
          const size = Number(select.value);
          if (!t || !isRemote(t) || !(size > 0)) return;
          const hub = hubFor(t);
          hub.query.size = size;
          hub.query.page = 1;
          hub.request('size');
        },
        { signal },
      );
    }
    return () => {
      ac.abort();
      stop?.();
    };
  },
};

export function initTableRemote(root: ParentNode = document): () => void {
  return bindAll(root, [tableRemoteBehavior, tablePaginationBehavior]);
}
