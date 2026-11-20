/**
 * Entrada `@eds-ui/behavior/format`: os formatadores de exibição (funções puras, sem DOM e sem
 * `init`), usados pelo `data-eds-format` e reexportados pelo `@eds-ui/react`.
 */
export {
  FORMAT_NAMES,
  formatBy,
  formatCep,
  formatCnpj,
  formatCpf,
  formatCpfCnpj,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPhone,
  formatRelative,
  maskCpf,
  parseDate,
  parseNumber,
  toDate,
} from './core/format';
export type {
  CurrencyFormatOptions,
  DateFormatOptions,
  DateStyle,
  FormatByNameOptions,
  FormatName,
  FormatOptions,
  NumberFormatOptions,
  RelativeFormatOptions,
} from './core/format';
