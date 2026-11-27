/**
 * Consulta da Table (página, tamanho, ordenação, busca e filtros por coluna) e o seu formato de
 * URL, sem DOM: o behavior (tabela remota) e o `@efds-ui/react` (`useTableQuery`) usam o mesmo.
 *
 * `?page=2&size=25&sort=cliente,-total&q=ana&filter[situacao]=pago&filter[total][gte]=100`
 */
import type { FilterValue, SortCriterion } from './data';
import { isEmptyFilter } from './data';

export interface TableQuery {
  /** Base 1. */
  page: number;
  size: number;
  /** Ordem = prioridade. */
  sort: SortCriterion[];
  filters: Record<string, FilterValue>;
  /** Busca geral. */
  q: string;
}

/** Nomes dos parâmetros da URL (`data-eds-table-params` renomeia). */
export interface TableQueryParams {
  page: string;
  size: string;
  sort: string;
  q: string;
  filter: string;
}

export const DEFAULT_QUERY_PARAMS: TableQueryParams = {
  page: 'page',
  size: 'size',
  sort: 'sort',
  q: 'q',
  filter: 'filter',
};

export function emptyTableQuery(size = 0): TableQuery {
  return { page: 1, size, sort: [], filters: {}, q: '' };
}

const escapeRe = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const positive = (text: string | null, fallback: number): number => {
  const n = Number(text);
  return text !== null && Number.isInteger(n) && n > 0 ? n : fallback;
};

/** Lê a consulta de uma query string (`?a=1`, `a=1` ou `URLSearchParams`). */
export function parseTableQuery(
  search: string | URLSearchParams,
  params: Partial<TableQueryParams> = {},
  defaults: { size?: number } = {},
): TableQuery {
  const names = { ...DEFAULT_QUERY_PARAMS, ...params };
  const source = typeof search === 'string' ? new URLSearchParams(search) : search;
  const query = emptyTableQuery(defaults.size ?? 0);
  query.page = positive(source.get(names.page), 1);
  query.size = positive(source.get(names.size), query.size);
  query.q = (source.get(names.q) ?? '').trim();
  const sort = source.get(names.sort);
  if (sort) {
    for (const part of sort.split(',')) {
      const raw = part.trim();
      if (raw === '' || raw === '-') continue;
      const descending = raw.startsWith('-');
      const key = descending ? raw.slice(1) : raw;
      if (!query.sort.some((c) => c.key === key)) {
        query.sort.push({ key, direction: descending ? 'descending' : 'ascending' });
      }
    }
  }
  const pattern = new RegExp(`^${escapeRe(names.filter)}\\[([^\\]]+)\\](?:\\[(gte|lte|)\\])?$`);
  const texts = new Map<string, string[]>();
  for (const [name, value] of source.entries()) {
    const match = pattern.exec(name);
    if (!match) continue;
    const key = match[1] as string;
    const bound = match[2];
    if (bound === 'gte' || bound === 'lte') {
      const current = query.filters[key];
      const range =
        current && typeof current === 'object' && !Array.isArray(current) ? current : {};
      if (value !== '') range[bound] = value;
      if (!isEmptyFilter(range)) query.filters[key] = range;
      continue;
    }
    if (value === '') continue;
    const list = texts.get(key) ?? [];
    list.push(value);
    texts.set(key, list);
  }
  for (const [key, list] of texts) {
    query.filters[key] = list.length === 1 ? (list[0] as string) : list;
  }
  return query;
}

/**
 * Escreve a consulta como query string. `page` 1 e `size` 0 não saem; vazios não saem.
 * Seleção múltipla repete a chave (`filter[x]=a&filter[x]=b`).
 */
export function toTableSearchParams(
  query: TableQuery,
  params: Partial<TableQueryParams> = {},
): URLSearchParams {
  const names = { ...DEFAULT_QUERY_PARAMS, ...params };
  const out = new URLSearchParams();
  if (query.page > 1) out.set(names.page, String(query.page));
  if (query.size > 0) out.set(names.size, String(query.size));
  if (query.sort.length > 0) {
    out.set(
      names.sort,
      query.sort.map((c) => (c.direction === 'descending' ? '-' : '') + c.key).join(','),
    );
  }
  if (query.q.trim() !== '') out.set(names.q, query.q.trim());
  for (const [key, value] of Object.entries(query.filters)) {
    if (isEmptyFilter(value)) continue;
    const base = `${names.filter}[${key}]`;
    if (typeof value === 'string') out.append(base, value.trim());
    else if (Array.isArray(value)) for (const item of value) out.append(base, item);
    else {
      if (value.gte) out.append(`${base}[gte]`, value.gte);
      if (value.lte) out.append(`${base}[lte]`, value.lte);
    }
  }
  return out;
}

/** Nomes (da URL) que pertencem à consulta: para trocar só eles numa URL existente. */
export function isQueryParam(name: string, params: Partial<TableQueryParams> = {}): boolean {
  const names = { ...DEFAULT_QUERY_PARAMS, ...params };
  return (
    name === names.page ||
    name === names.size ||
    name === names.sort ||
    name === names.q ||
    name.startsWith(`${names.filter}[`)
  );
}

/** Aplica a consulta a uma URL absoluta: troca os parâmetros da consulta e mantém os outros. */
export function applyQueryToUrl(
  href: string,
  query: TableQuery,
  params: Partial<TableQueryParams> = {},
  anchor?: string | null,
): string {
  const url = new URL(href);
  const keep = new URLSearchParams();
  for (const [name, value] of url.searchParams) {
    if (!isQueryParam(name, params)) keep.append(name, value);
  }
  for (const [name, value] of toTableSearchParams(query, params)) keep.append(name, value);
  url.search = keep.toString();
  if (anchor) url.hash = anchor;
  return url.toString();
}
