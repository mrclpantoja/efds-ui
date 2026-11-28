/**
 * Entrada `@efds-ui/behavior/export`: só os geradores de arquivo (CSV, JSON, XLSX, PDF) e os
 * tipos. Não importa `init`, o auto-init nem nenhum outro módulo de comportamento, para o
 * `@efds-ui/react` (e qualquer bundler) levar só o que usa.
 */
export { exportData, toCsv, toJson, toPdf, toXlsx } from './export';
export type {
  ExportColumn,
  ExportColumnType,
  ExportData,
  ExportFormat,
  ExportOptions,
} from './export';
// Textos pt-BR do anúncio (os mesmos do `configure({ messages })` do behavior).
export { datedFileName } from './export/model';
export { format as formatMessage, getLocale, getMessages } from './core/config';
// Regras de dados da Table sem DOM (ordenação e busca), as mesmas do behavior.
export {
  isEmptyFilter,
  matchColumnFilter,
  normalizeText,
  parseDate,
  parseNumber,
  sortByCriteria,
  sortValues,
} from './core/data';
export { describeColumnFilter } from './core/filter-text';
export type { DescribeFilterOptions, FilterTextType } from './core/filter-text';
export type { FilterValue, SortCriterion, SortDirection } from './core/data';
// Consulta da Table (página, ordenação, busca, filtros) e o formato dela na URL.
export {
  applyQueryToUrl,
  emptyTableQuery,
  parseTableQuery,
  toTableSearchParams,
} from './core/table-query';
export type { TableQuery, TableQueryParams } from './core/table-query';
