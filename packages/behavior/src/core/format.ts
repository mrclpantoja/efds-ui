/**
 * Formatadores de exibição (funções puras, sem DOM), usados pelo behavior (`data-eds-format`) e
 * reexportados pelo `@efds-ui/react`. Todos aceitam `locale` (padrão: o do `configure`, `pt-BR`).
 * Valor ausente ou que não se reconhece vira `''`, nunca "NaN" nem "Invalid Date".
 *
 * Datas só com dia (`2026-03-15` ou `15/03/2026`) são locais, sem deslocamento de fuso.
 */
import { getLocale } from './config';
import { createMask } from './mask';
import { parseDate, parseNumber } from './data';

export { parseDate, parseNumber };

export interface FormatOptions {
  /** Locale BCP 47. Padrão: o configurado (`pt-BR`). */
  locale?: string;
}

export interface NumberFormatOptions extends FormatOptions {
  /** Casas decimais fixas (mínimo e máximo). Sem ela, o `Intl` decide. */
  decimals?: number;
}

export interface CurrencyFormatOptions extends NumberFormatOptions {
  /** Código ISO 4217. Padrão `BRL`. */
  currency?: string;
}

export type DateStyle = 'short' | 'medium' | 'long';

export interface DateFormatOptions extends FormatOptions {
  /** `short` 15/03/2026 (padrão), `medium` 15 de mar. de 2026, `long` 15 de março de 2026. */
  style?: DateStyle;
}

export interface RelativeFormatOptions extends FormatOptions {
  /** Instante de referência (padrão: agora). */
  now?: Date | number;
}

/** Número a partir de `number` ou de texto pt-BR/ponto decimal; senão `null`. */
function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') return parseNumber(value.trim());
  return null;
}

const ZONED = /(?:[zZ]|[+-]\d{2}:?\d{2})$/;

/** `Date` a partir de `Date`, timestamp, ISO ou `dd/mm/aaaa`; senão `null`. */
export function toDate(value: unknown): Date | null {
  let date: Date | null = null;
  if (value instanceof Date) date = value;
  else if (typeof value === 'number') date = new Date(value);
  else if (typeof value === 'string' && value.trim() !== '') {
    const text = value.trim();
    // ISO com fuso (Z ou +03:00) é um instante; sem fuso, é data local.
    if (/^\d{4}-\d{2}-\d{2}T[\d:.]+/.test(text) && ZONED.test(text)) date = new Date(text);
    else {
      const stamp = parseDate(text);
      date = stamp === null ? null : new Date(stamp);
    }
  }
  return date !== null && !Number.isNaN(date.getTime()) ? date : null;
}

export function formatNumber(value: unknown, options: NumberFormatOptions = {}): string {
  const n = toNumber(value);
  if (n === null) return '';
  const { decimals } = options;
  return new Intl.NumberFormat(options.locale ?? getLocale(), {
    ...(decimals !== undefined
      ? { minimumFractionDigits: decimals, maximumFractionDigits: decimals }
      : {}),
  }).format(n);
}

export function formatCurrency(value: unknown, options: CurrencyFormatOptions = {}): string {
  const n = toNumber(value);
  if (n === null) return '';
  const { decimals } = options;
  return new Intl.NumberFormat(options.locale ?? getLocale(), {
    style: 'currency',
    currency: options.currency ?? 'BRL',
    ...(decimals !== undefined
      ? { minimumFractionDigits: decimals, maximumFractionDigits: decimals }
      : {}),
  }).format(n);
}

export function formatDate(value: unknown, options: DateFormatOptions = {}): string {
  const date = toDate(value);
  if (!date) return '';
  const style = options.style ?? 'short';
  const base: Intl.DateTimeFormatOptions =
    style === 'short'
      ? { day: '2-digit', month: '2-digit', year: 'numeric' }
      : { day: 'numeric', month: style === 'long' ? 'long' : 'short', year: 'numeric' };
  return new Intl.DateTimeFormat(options.locale ?? getLocale(), base).format(date);
}

export function formatDateTime(value: unknown, options: DateFormatOptions = {}): string {
  const date = toDate(value);
  if (!date) return '';
  const style = options.style ?? 'short';
  const base: Intl.DateTimeFormatOptions =
    style === 'short'
      ? { day: '2-digit', month: '2-digit', year: 'numeric' }
      : { day: 'numeric', month: style === 'long' ? 'long' : 'short', year: 'numeric' };
  return new Intl.DateTimeFormat(options.locale ?? getLocale(), {
    ...base,
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

const UNITS: readonly [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
  ['second', 1],
];

/** "há 5 minutos", "em 2 dias", "ontem" (`numeric: 'auto'`). */
export function formatRelative(value: unknown, options: RelativeFormatOptions = {}): string {
  const date = toDate(value);
  if (!date) return '';
  const now = options.now instanceof Date ? options.now.getTime() : (options.now ?? Date.now());
  const seconds = Math.round((date.getTime() - now) / 1000);
  const abs = Math.abs(seconds);
  const formatter = new Intl.RelativeTimeFormat(options.locale ?? getLocale(), { numeric: 'auto' });
  for (const [unit, size] of UNITS) {
    if (abs >= size || unit === 'second') {
      return formatter.format(Math.trunc(seconds / size), unit);
    }
  }
  return '';
}

const digitsOf = (value: unknown): string => String(value ?? '').replace(/\D/g, '');

/** Formata só quando há exatamente `size` dígitos; senão devolve o texto como veio. */
function formatDigits(value: unknown, size: number, spec: string): string {
  const text = String(value ?? '').trim();
  return digitsOf(text).length === size ? createMask(spec).format(text) : text;
}

/** 12345678900 -> 123.456.789-00 (se não tem 11 dígitos, devolve o texto como veio). */
export function formatCpf(value: unknown): string {
  return formatDigits(value, 11, 'cpf');
}

/** 12345678000190 -> 12.345.678/0001-90. Aceita o CNPJ alfanumérico (14 caracteres). */
export function formatCnpj(value: unknown): string {
  const text = String(value ?? '').trim();
  const clean = text.replace(/[^0-9A-Za-z]/g, '');
  return clean.length === 14 ? createMask('cnpj').format(text) : text;
}

/** CPF (11 dígitos) ou CNPJ (14 caracteres), pelo tamanho. */
export function formatCpfCnpj(value: unknown): string {
  const clean = String(value ?? '').replace(/[^0-9A-Za-z]/g, '');
  return clean.length === 14 ? formatCnpj(value) : formatCpf(value);
}

/** Fixo (10 dígitos) ou celular (11); o código do país 55 é ignorado. */
export function formatPhone(value: unknown): string {
  const text = String(value ?? '').trim();
  let digits = digitsOf(text);
  if (digits.length >= 12 && digits.startsWith('55')) digits = digits.slice(2);
  return digits.length === 10 || digits.length === 11
    ? createMask('telefone').format(digits)
    : text;
}

/** 90010100 -> 90010-100. */
export function formatCep(value: unknown): string {
  return formatDigits(value, 8, 'cep');
}

/**
 * CPF com os 3 primeiros e os 2 últimos dígitos ocultos (LGPD): `***.456.789-**`. Sem 11 dígitos,
 * devolve `''` (nunca o texto original: o valor pode ser um dado pessoal).
 */
export function maskCpf(value: unknown): string {
  const digits = digitsOf(value);
  if (digits.length !== 11) return '';
  return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`;
}

export type FormatName =
  | 'currency'
  | 'number'
  | 'date'
  | 'datetime'
  | 'relative'
  | 'cpf'
  | 'cnpj'
  | 'cpf-cnpj'
  | 'phone'
  | 'cep'
  | 'cpf-mask'
  | 'mask-cpf';

export const FORMAT_NAMES: readonly FormatName[] = [
  'currency',
  'number',
  'date',
  'datetime',
  'relative',
  'cpf',
  'cnpj',
  'cpf-cnpj',
  'phone',
  'cep',
  'cpf-mask',
  'mask-cpf',
];

export interface FormatByNameOptions extends CurrencyFormatOptions, DateFormatOptions {
  now?: Date | number;
}

/** Formata pelo nome (`data-eds-format`). Nome desconhecido ou valor irreconhecível: `''`. */
export function formatBy(name: string, value: unknown, options: FormatByNameOptions = {}): string {
  switch (name) {
    case 'currency':
      return formatCurrency(value, options);
    case 'number':
      return formatNumber(value, options);
    case 'date':
      return formatDate(value, options);
    case 'datetime':
      return formatDateTime(value, options);
    case 'relative':
      return formatRelative(value, options);
    case 'cpf':
      return formatCpf(value);
    case 'cnpj':
      return formatCnpj(value);
    case 'cpf-cnpj':
      return formatCpfCnpj(value);
    case 'phone':
      return formatPhone(value);
    case 'cep':
      return formatCep(value);
    case 'cpf-mask':
    case 'mask-cpf':
      return maskCpf(value);
    default:
      return '';
  }
}
