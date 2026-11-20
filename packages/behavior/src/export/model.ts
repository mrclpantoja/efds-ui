import { DEFAULT_LOCALE, format, getLocale, getMessages } from '../core/config';
import type { ExportColumnType, ExportData } from './types';

/** Valor já interpretado de uma célula. */
export type DateCell = {
  kind: 'date';
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  /** A origem trazia hora (ISO com `T`, `dd/mm/aaaa hh:mm` ou `Date` com hora). */
  time: boolean;
};

export type Cell =
  | { kind: 'empty' }
  | { kind: 'text'; text: string }
  | { kind: 'number'; value: number }
  | { kind: 'bool'; value: boolean }
  | DateCell;

export interface NormalizedColumn {
  key: string;
  label: string;
  type: ExportColumnType;
}

export interface NormalizedData {
  columns: NormalizedColumn[];
  rows: Cell[][];
}

const TYPES: readonly ExportColumnType[] = ['text', 'number', 'currency', 'date', 'percent'];

/** "1.280,50", "1280.5", "-3", "12,5%", "R$ 5" -> número; senão `null`. */
export function parseNumber(text: string): number | null {
  const t = text.replace(/\s|R\$|€|£|%/g, '');
  if (/^[+-]?\d{1,3}(\.\d{3})+(,\d+)?$/.test(t))
    return Number(t.replace(/\./g, '').replace(',', '.'));
  if (/^[+-]?\d+,\d+$/.test(t)) return Number(t.replace(',', '.'));
  if (/^[+-]?\d+(\.\d+)?$/.test(t)) return Number(t);
  return null;
}

const daysIn = (year: number, month: number): number =>
  new Date(Date.UTC(year, month, 0)).getUTCDate();

function makeDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  time: boolean,
): DateCell | null {
  if (month < 1 || month > 12 || day < 1 || day > daysIn(year, month)) return null;
  if (hour > 23 || minute > 59 || second > 59) return null;
  return { kind: 'date', year, month, day, hour, minute, second, time };
}

/**
 * `aaaa-mm-dd`, `aaaa-mm-ddThh:mm[:ss]` ou `dd/mm/aaaa[ hh:mm[:ss]]`. A hora é a do relógio
 * escrito no texto: fuso e milissegundos são ignorados.
 */
export function parseDateText(text: string): DateCell | null {
  const t = text.trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(t);
  if (m) {
    return makeDate(
      Number(m[1]),
      Number(m[2]),
      Number(m[3]),
      Number(m[4] ?? 0),
      Number(m[5] ?? 0),
      Number(m[6] ?? 0),
      m[4] !== undefined,
    );
  }
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(t);
  if (m) {
    return makeDate(
      Number(m[3]),
      Number(m[2]),
      Number(m[1]),
      Number(m[4] ?? 0),
      Number(m[5] ?? 0),
      Number(m[6] ?? 0),
      m[4] !== undefined,
    );
  }
  return null;
}

function fromDateObject(value: Date): DateCell | null {
  if (Number.isNaN(value.getTime())) return null;
  const hour = value.getHours();
  const minute = value.getMinutes();
  const second = value.getSeconds();
  return makeDate(
    value.getFullYear(),
    value.getMonth() + 1,
    value.getDate(),
    hour,
    minute,
    second,
    hour + minute + second > 0,
  );
}

const asText = (value: unknown): Cell => {
  const text = typeof value === 'string' ? value : String(value);
  return text.trim() === '' ? { kind: 'empty' } : { kind: 'text', text };
};

const asNumber = (value: number): Cell =>
  Number.isFinite(value) ? { kind: 'number', value } : { kind: 'empty' };

/** Interpreta um valor segundo o tipo da coluna (ou pelo tipo JS, sem `type`). */
export function toCell(value: unknown, type?: ExportColumnType): Cell {
  if (value === null || value === undefined) return { kind: 'empty' };
  if (typeof value === 'string' && value.trim() === '') return { kind: 'empty' };
  if (typeof value === 'boolean') return { kind: 'bool', value };
  if (value instanceof Date && type !== 'number' && type !== 'currency' && type !== 'percent') {
    return fromDateObject(value) ?? { kind: 'empty' };
  }
  if (type === 'text') return asText(value);
  if (type === 'number' || type === 'currency' || type === 'percent') {
    if (typeof value === 'number') return asNumber(value);
    if (typeof value === 'string') {
      const n = parseNumber(value);
      return n !== null && Number.isFinite(n) ? { kind: 'number', value: n } : asText(value);
    }
    return asText(value);
  }
  if (type === 'date') {
    if (typeof value === 'number') return fromDateObject(new Date(value)) ?? { kind: 'empty' };
    if (typeof value === 'string') return parseDateText(value) ?? asText(value);
    return asText(value);
  }
  if (typeof value === 'number') return asNumber(value);
  return asText(value);
}

/** Valida e interpreta os dados: cada linha vira a lista de células na ordem das colunas. */
export function normalize(data: ExportData): NormalizedData {
  if (!data || !Array.isArray(data.columns) || !Array.isArray(data.rows)) {
    throw new TypeError('exportData: informe { columns, rows }.');
  }
  const cells = data.rows.map((row) =>
    data.columns.map((col) => toCell((row as Record<string, unknown> | null)?.[col.key], col.type)),
  );
  const columns = data.columns.map((col, i): NormalizedColumn => {
    let type: ExportColumnType;
    if (col.type && TYPES.includes(col.type)) type = col.type;
    else {
      const first = cells.map((row) => row[i]).find((cell) => cell && cell.kind !== 'empty');
      type = first?.kind === 'number' ? 'number' : first?.kind === 'date' ? 'date' : 'text';
    }
    return { key: col.key, label: String(col.label ?? col.key), type };
  });
  return { columns, rows: cells.map((row) => row.map((c) => c ?? { kind: 'empty' })) };
}

// ---- Formatação por locale (padrão pt-BR) ---------------------------------------------------

interface LocaleFormat {
  decimal: string;
  group: string;
  /** Ordem e separadores da data numérica, ex.: `[['d'], '/', ['m'], '/', ['y']]`. */
  datePattern: ({ part: 'd' | 'm' | 'y' } | { literal: string })[];
}

const formats = new Map<string, LocaleFormat>();

/** Separadores e ordem da data do locale, lidos do `Intl` só para saber os símbolos. */
export function localeFormat(locale: string = getLocale()): LocaleFormat {
  const cached = formats.get(locale);
  if (cached) return cached;
  let result: LocaleFormat;
  try {
    const numbers = new Intl.NumberFormat(locale).formatToParts(1234567.5);
    const date = new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'UTC',
    }).formatToParts(new Date(Date.UTC(2001, 10, 22)));
    const pattern: LocaleFormat['datePattern'] = [];
    for (const p of date) {
      if (p.type === 'day') pattern.push({ part: 'd' });
      else if (p.type === 'month') pattern.push({ part: 'm' });
      else if (p.type === 'year') pattern.push({ part: 'y' });
      else if (p.type === 'literal') pattern.push({ literal: p.value });
    }
    result = {
      decimal: numbers.find((p) => p.type === 'decimal')?.value ?? ',',
      group: numbers.find((p) => p.type === 'group')?.value ?? '.',
      datePattern: pattern,
    };
  } catch {
    return locale === DEFAULT_LOCALE
      ? {
          decimal: ',',
          group: '.',
          datePattern: [
            { part: 'd' },
            { literal: '/' },
            { part: 'm' },
            { literal: '/' },
            { part: 'y' },
          ],
        }
      : localeFormat(DEFAULT_LOCALE);
  }
  formats.set(locale, result);
  return result;
}

/** Locale pedido (ou o global), em forma canônica; tag inválida cai no global. */
export function resolveLocale(requested?: string): string {
  if (requested) {
    try {
      return Intl.getCanonicalLocales(requested)[0] ?? getLocale();
    } catch {
      /* inválido */
    }
  }
  return getLocale();
}

/** Número sem depender de `Intl` para os dígitos: separadores do locale e, opcional, milhar. */
export function formatDecimal(
  value: number,
  minFrac: number,
  maxFrac: number,
  group: boolean,
  locale: string = getLocale(),
): string {
  const sep = localeFormat(locale);
  const abs = Math.abs(value);
  let s = abs.toFixed(maxFrac);
  if (s.includes('e')) s = String(abs);
  const parts = s.split('.');
  let int = parts[0] ?? '0';
  let frac = parts[1] ?? '';
  while (frac.length > minFrac && frac.endsWith('0')) frac = frac.slice(0, -1);
  if (group) int = int.replace(/\B(?=(\d{3})+(?!\d))/g, sep.group);
  const negative = value < 0 && /[1-9]/.test(int + frac);
  return `${negative ? '-' : ''}${int}${frac ? `${sep.decimal}${frac}` : ''}`;
}

const p2 = (n: number): string => String(n).padStart(2, '0');

/** Data no locale (ordem e separadores do `Intl`; dia e mês com 2 dígitos, ano com 4). */
export function formatDate(cell: DateCell, locale: string = getLocale()): string {
  const day = localeFormat(locale)
    .datePattern.map((p) =>
      'literal' in p
        ? p.literal
        : p.part === 'd'
          ? p2(cell.day)
          : p.part === 'm'
            ? p2(cell.month)
            : String(cell.year).padStart(4, '0'),
    )
    .join('');
  if (!cell.time) return day;
  const hm = `${p2(cell.hour)}:${p2(cell.minute)}`;
  return `${day} ${cell.second ? `${hm}:${p2(cell.second)}` : hm}`;
}

export function formatIsoDate(cell: DateCell): string {
  const day = `${String(cell.year).padStart(4, '0')}-${p2(cell.month)}-${p2(cell.day)}`;
  return cell.time ? `${day}T${p2(cell.hour)}:${p2(cell.minute)}:${p2(cell.second)}` : day;
}

/** Relógio local de um `Date`: data do locale e `hh:mm`. */
export function formatNow(now: Date, locale: string = getLocale()): string {
  return formatDate(
    {
      kind: 'date',
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
      hour: now.getHours(),
      minute: now.getMinutes(),
      second: 0,
      time: true,
    },
    locale,
  );
}

/**
 * Texto da célula. `csv`: números sem ponto de milhar e sem símbolo, para o Excel reconhecer;
 * `view` (PDF e larguras do XLSX): com milhar e "R$".
 */
export function cellText(
  cell: Cell,
  type: ExportColumnType,
  mode: 'csv' | 'view',
  locale: string = getLocale(),
): string {
  switch (cell.kind) {
    case 'empty':
      return '';
    case 'text':
      return cell.text;
    case 'bool': {
      const m = getMessages();
      return cell.value ? m.exportYes : m.exportNo;
    }
    case 'date':
      return formatDate(cell, locale);
    case 'number': {
      const group = mode === 'view';
      if (type === 'currency') {
        const n = formatDecimal(cell.value, 2, 2, group, locale);
        if (mode === 'csv') return n;
        return n.startsWith('-') ? `-R$ ${n.slice(1)}` : `R$ ${n}`;
      }
      if (type === 'percent') return `${formatDecimal(cell.value, 0, 2, group, locale)}%`;
      return formatDecimal(cell.value, 0, 6, group, locale);
    }
  }
}

/** Texto configurável com `{chave}`. */
export const msg = (
  key: 'exportGeneratedAt' | 'exportPage' | 'exportNoRows',
  values: Record<string, string | number> = {},
): string => format(getMessages()[key], values);

/** Nome de arquivo seguro, com a extensão do formato. */
export function fileName(base: string | undefined, ext: string): string {
  // eslint-disable-next-line no-control-regex
  let name = (base ?? '').replace(/[\u0000-\u001f\\/:*?"<>|]/g, '-').trim();
  if (name.toLowerCase().endsWith(`.${ext}`)) name = name.slice(0, -(ext.length + 1));
  name = name.replace(/^\.+/, '').replace(/[. ]+$/, '');
  if (name === '') name = getMessages().exportFilename;
  return `${name}.${ext}`;
}
