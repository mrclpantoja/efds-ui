import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  applyQueryToUrl,
  emptyTableQuery,
  parseTableQuery,
  toTableSearchParams,
  type FilterValue,
  type SortCriterion,
  type TableQuery,
  type TableQueryParams,
} from '@efds-ui/behavior/export';
import type { TableSortState } from './tableContext';

export interface UseTableQueryOptions {
  /** Consulta inicial (a URL, com `syncUrl`, vale por cima). */
  initial?: Partial<TableQuery>;
  /**
   * `'search'`: lê a query string ao montar e a mantém por `history.replaceState` (`pushState` na
   * mudança de página). Padrão: `false`.
   */
  syncUrl?: false | 'search';
  /** Nomes dos parâmetros da URL (os padrões do `data-eds-table-params`). */
  params?: Partial<TableQueryParams>;
}

export interface UseTableQueryResult {
  query: TableQuery;
  /** Troca a ordenação (volta para a página 1). */
  setSort: (sort: SortCriterion[]) => void;
  setPage: (page: number) => void;
  /** Tamanho da página (volta para a página 1). */
  setSize: (size: number) => void;
  /** Define (ou, com `null`/vazio, remove) o filtro de uma coluna (volta para a página 1). */
  setFilter: (key: string, value: FilterValue | null) => void;
  /** Busca geral (volta para a página 1). */
  setQ: (q: string) => void;
  clearFilters: () => void;
  /** Volta à consulta inicial. */
  reset: () => void;
  /** A consulta no formato da URL (o mesmo do HTML): para o `fetch` do app. */
  searchParams: URLSearchParams;
  /** `query.sort` no formato da `<Table sort onSortChange multiSort>`. */
  sortState: TableSortState[];
  /** Aplica a ordenação vinda da `<Table onSortChange>`. */
  setSortState: (sort: TableSortState[]) => void;
}

const isEmpty = (value: FilterValue | null | undefined) =>
  value === null ||
  value === undefined ||
  (typeof value === 'string' && value.trim() === '') ||
  (Array.isArray(value) && value.length === 0) ||
  (typeof value === 'object' &&
    !Array.isArray(value) &&
    (value.gte ?? '') === '' &&
    (value.lte ?? '') === '');

/**
 * Consulta de uma tabela remota (página, tamanho, ordenação, busca e filtros por coluna) no mesmo
 * formato de URL do `data-eds-table-remote`. Não faz `fetch`: o app usa `query`/`searchParams` no
 * seu hook de dados e passa `loading` à `<Table>`.
 */
export function useTableQuery(options: UseTableQueryOptions = {}): UseTableQueryResult {
  const { initial, syncUrl = false, params } = options;
  const [initialQuery] = useState<TableQuery>(() => ({
    ...emptyTableQuery(initial?.size ?? 0),
    ...initial,
  }));
  const [query, setQuery] = useState<TableQuery>(() => {
    if (syncUrl !== 'search' || typeof window === 'undefined') return initialQuery;
    const fromUrl = parseTableQuery(window.location.search, params, {
      size: initialQuery.size,
    });
    const hasUrl = window.location.search.length > 1;
    return hasUrl ? { ...initialQuery, ...fromUrl } : initialQuery;
  });

  const update = useCallback((patch: (current: TableQuery) => TableQuery) => {
    setQuery(patch);
  }, []);

  // Mantém a URL em dia: replaceState, e pushState quando a página muda.
  const previous = useRef(query);
  const first = useRef(true);
  useEffect(() => {
    if (syncUrl !== 'search') return;
    if (first.current) {
      first.current = false;
      previous.current = query;
      return;
    }
    const href = applyQueryToUrl(window.location.href, query, params);
    if (href !== window.location.href) {
      const method = previous.current.page !== query.page ? 'pushState' : 'replaceState';
      window.history[method](window.history.state, '', href);
    }
    previous.current = query;
  }, [query, syncUrl, params]);

  const setSort = useCallback(
    (sort: SortCriterion[]) => update((q) => ({ ...q, sort, page: 1 })),
    [update],
  );
  const setSortState = useCallback(
    (sort: TableSortState[]) =>
      setSort(sort.map((c) => ({ key: c.column, direction: c.direction }))),
    [setSort],
  );
  const setPage = useCallback(
    (page: number) => update((q) => ({ ...q, page: Math.max(1, Math.floor(page)) })),
    [update],
  );
  const setSize = useCallback((size: number) => update((q) => ({ ...q, size, page: 1 })), [update]);
  const setFilter = useCallback(
    (key: string, value: FilterValue | null) =>
      update((q) => {
        const filters = { ...q.filters };
        if (isEmpty(value)) delete filters[key];
        else filters[key] = value as FilterValue;
        return { ...q, filters, page: 1 };
      }),
    [update],
  );
  const setQ = useCallback((q: string) => update((cur) => ({ ...cur, q, page: 1 })), [update]);
  const clearFilters = useCallback(
    () => update((q) => ({ ...q, filters: {}, q: '', page: 1 })),
    [update],
  );
  const reset = useCallback(() => setQuery(initialQuery), [initialQuery]);

  const searchParams = useMemo(() => toTableSearchParams(query, params), [query, params]);
  const sortState = useMemo(
    () => query.sort.map((c): TableSortState => ({ column: c.key, direction: c.direction })),
    [query.sort],
  );

  return {
    query,
    setSort,
    setPage,
    setSize,
    setFilter,
    setQ,
    clearFilters,
    reset,
    searchParams,
    sortState,
    setSortState,
  };
}
