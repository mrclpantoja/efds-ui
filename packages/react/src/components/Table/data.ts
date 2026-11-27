import { useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import {
  formatMessage as format,
  getMessages,
  matchColumnFilter,
  normalizeText,
  sortByCriteria,
  type FilterValue,
} from '@efds-ui/behavior/export';
import { mergeTexts } from '../../utils/texts';
import { DEFAULT_LOCALE } from '../Locale/Locale';
import type { TableSortState } from './Table';

export interface SortTableDataOptions<T> {
  /** Valor da célula. Padrão: `row[column]`. */
  getValue?: (row: T, column: string) => unknown;
  /** Locale da ordem de texto. Padrão: `pt-BR` (passe `useLocale()` para seguir o `LocaleProvider`). */
  locale?: string;
}

/**
 * Ordena `rows` pelas mesmas regras do behavior: todos números (pt-BR ou ponto decimal) = número;
 * todos datas (`dd/mm/aaaa`, ISO, `Date`) = data; senão texto sem diferenciar acento e caixa,
 * com números por valor ("2" antes de "10"). Vazios por último nas duas direções; estável.
 * Sem ordenação (`null`), devolve uma cópia na ordem original.
 */
export function sortTableData<T>(
  rows: readonly T[],
  sort: TableSortState | readonly TableSortState[] | null | undefined,
  options: SortTableDataOptions<T> = {},
): T[] {
  const criteria = (Array.isArray(sort) ? sort : sort ? [sort] : []) as TableSortState[];
  if (criteria.length === 0) return [...rows];
  const getValue =
    options.getValue ?? ((row: T, column: string) => (row as Record<string, unknown>)?.[column]);
  return sortByCriteria(
    rows,
    criteria.map((c) => ({ key: c.column, direction: c.direction })),
    (row, key) => getValue(row, key),
    options.locale ?? DEFAULT_LOCALE,
  );
}

export interface FilterTableDataOptions<T> {
  /** Colunas (chaves) pesquisadas. Padrão: todas as de cada linha. */
  columns?: readonly string[];
  /** Texto pesquisável da linha; tem prioridade sobre `columns`. */
  getText?: (row: T) => string;
  /** Filtros por coluna (chave → valor), em E com a busca. Texto contém; lista = igual a algum; faixa. */
  filters?: Record<string, FilterValue>;
  /** Valor da célula para os filtros por coluna. Padrão: `row[chave]`. */
  getValue?: (row: T, key: string) => unknown;
}

const rowText = <T>(row: T, options: FilterTableDataOptions<T>): string => {
  if (options.getText) return options.getText(row);
  const record = (row ?? {}) as Record<string, unknown>;
  const keys = options.columns ?? Object.keys(record);
  return keys
    .map((key) => record[key])
    .filter((value) => value !== null && value !== undefined && typeof value !== 'object')
    .map(String)
    .join(' ');
};

/** Linhas que contêm `query` (sem diferenciar acento e caixa), como o filtro do behavior. */
export function filterTableData<T>(
  rows: readonly T[],
  query: string,
  options: FilterTableDataOptions<T> = {},
): T[] {
  const needle = normalizeText(query.trim());
  const filters = Object.entries(options.filters ?? {});
  if (needle === '' && filters.length === 0) return [...rows];
  const getValue =
    options.getValue ?? ((row: T, key: string) => (row as Record<string, unknown>)?.[key]);
  return rows.filter(
    (row) =>
      (needle === '' ||
        normalizeText(rowText(row, options).replace(/\s+/g, ' ')).includes(needle)) &&
      filters.every(([key, value]) => matchColumnFilter(getValue(row, key), value)),
  );
}

export interface TableFilterTexts {
  /** "{count} resultados." */
  many: string;
  /** "1 resultado." */
  one: string;
  /** "Nenhum resultado." */
  none: string;
  /** Filtro removido: "Filtro removido. {count} linhas." */
  cleared: string;
  /** Filtro removido com uma linha: "Filtro removido. 1 linha." */
  clearedOne: string;
}

export interface UseTableFilterOptions<T> extends FilterTableDataOptions<T> {
  /** Atraso entre digitar e filtrar, em ms. Padrão: 150 (o do behavior). */
  delay?: number;
  /** Textos do status (padrões: os do `@efds-ui/behavior`, pt-BR). */
  texts?: Partial<TableFilterTexts>;
}

export interface UseTableFilterResult<T> {
  /** Texto do campo (imediato). */
  query: string;
  setQuery: (query: string) => void;
  /** Linhas que passam pelo filtro aplicado (depois do atraso). */
  rows: T[];
  /** Quantidade de linhas filtradas. */
  count: number;
  /** Para `<Table status={status}>`: anúncio da contagem, só depois de uma ação do usuário. */
  status: string;
  /** Para espalhar no campo de busca: `value`, `onChange` e Esc para limpar. */
  inputProps: {
    value: string;
    onChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  };
}

/**
 * Filtro local de uma lista em memória, alinhado ao `data-eds-table-filter` do behavior: sem
 * diferenciar acento e caixa, atraso de 150 ms, Esc limpa e a contagem vira `status` para a
 * `<Table>`. Só alcança as linhas que estão em `rows` (paginação no servidor filtra no servidor).
 */
export function useTableFilter<T>(
  rows: readonly T[],
  options: UseTableFilterOptions<T> = {},
): UseTableFilterResult<T> {
  const { delay = 150, texts, columns, getText } = options;
  const [query, setQuery] = useState('');
  const [applied, setApplied] = useState('');
  const [status, setStatus] = useState('');
  const lastApplied = useRef('');

  useEffect(() => {
    if (query === applied) return;
    const timer = setTimeout(() => setApplied(query), query === '' ? 0 : delay);
    return () => clearTimeout(timer);
  }, [query, applied, delay]);

  const filtered = useMemo(
    () => filterTableData(rows, applied, { columns, getText }),
    [rows, applied, columns, getText],
  );
  const count = filtered.length;
  const latest = useRef({ count, texts });
  useEffect(() => {
    latest.current = { count, texts };
  });

  // Anuncia quando o filtro aplicado muda (não na montagem, nem quando só as linhas mudam).
  useEffect(() => {
    if (lastApplied.current === applied) return;
    const wasActive = lastApplied.current.trim() !== '';
    lastApplied.current = applied;
    const raw = applied.trim();
    const m = getMessages();
    const t = mergeTexts(
      {
        many: m.tableFilterMany,
        one: m.tableFilterOne,
        none: m.tableFilterNone,
        cleared: m.tableFilterClearedMany,
        clearedOne: m.tableFilterClearedOne,
      },
      latest.current.texts,
    );
    const n = latest.current.count;
    if (raw === '') {
      setStatus(wasActive ? (n === 1 ? t.clearedOne : format(t.cleared, { count: n })) : '');
    } else {
      setStatus(n === 0 ? t.none : n === 1 ? t.one : format(t.many, { count: n }));
    }
  }, [applied]);

  return {
    query,
    setQuery,
    rows: filtered,
    count,
    status,
    inputProps: {
      value: query,
      onChange: (event) => setQuery(event.target.value),
      onKeyDown: (event) => {
        if (event.key !== 'Escape' || query === '') return;
        event.preventDefault();
        event.stopPropagation();
        setQuery('');
      },
    },
  };
}
