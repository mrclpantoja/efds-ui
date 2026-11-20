/**
 * Entrada `@eds-ui/behavior/export`: só os geradores de arquivo (CSV, JSON, XLSX, PDF) e os
 * tipos. Não importa `init`, o auto-init nem nenhum outro módulo de comportamento, para o
 * `@eds-ui/react` (e qualquer bundler) levar só o que usa.
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
export { format, getLocale, getMessages } from './core/config';
// Regras de dados da Table sem DOM (ordenação e busca), as mesmas do behavior.
export { normalizeText, sortValues } from './core/data';
export type { SortDirection } from './core/data';
