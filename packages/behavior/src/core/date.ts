/**
 * Datas de calendário sem fuso: `Ymd` (mês 0-11) e aritmética sobre UTC só como ferramenta de
 * normalização. Nunca usa `new Date('aaaa-mm-dd')` (que seria UTC e atrasaria um dia no Brasil).
 */
export interface Ymd {
  y: number;
  m: number;
  d: number;
}

const MIN_YEAR = 1;
const MAX_YEAR = 9999;
const DAY_MS = 86_400_000;

const pad = (n: number, size = 2) => String(n).padStart(size, '0');

function utc(y: number, m: number, d: number): Date {
  const t = new Date(0);
  t.setUTCFullYear(y, m, d);
  return t;
}

const fromUtc = (t: Date): Ymd => ({
  y: t.getUTCFullYear(),
  m: t.getUTCMonth(),
  d: t.getUTCDate(),
});

export const daysInMonth = (y: number, m: number): number => utc(y, m + 1, 0).getUTCDate();

export const inYearRange = (a: Ymd): boolean => a.y >= MIN_YEAR && a.y <= MAX_YEAR;

/** Valida (rejeita 31/02, ano 0 etc.). */
export function make(y: number, m: number, d: number): Ymd | null {
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return null;
  if (y < MIN_YEAR || y > MAX_YEAR || m < 0 || m > 11 || d < 1) return null;
  return d <= daysInMonth(y, m) ? { y, m, d } : null;
}

/** `null` se o resultado sair de 0001..9999. */
export function addDays(a: Ymd, n: number): Ymd | null {
  const r = fromUtc(utc(a.y, a.m, a.d + n));
  return inYearRange(r) ? r : null;
}

/** Soma meses mantendo o dia, ajustado ao fim do mês (29/02 + 1 ano = 28/02). */
export function addMonths(a: Ymd, n: number): Ymd | null {
  const total = a.y * 12 + a.m + n;
  const y = Math.floor(total / 12);
  const m = total - y * 12;
  if (y < MIN_YEAR || y > MAX_YEAR) return null;
  return { y, m, d: Math.min(a.d, daysInMonth(y, m)) };
}

/** 0 = domingo. */
export const weekday = (a: Ymd): number => utc(a.y, a.m, a.d).getUTCDay();

export const cmp = (a: Ymd, b: Ymd): number => a.y - b.y || a.m - b.m || a.d - b.d;
export const same = (a: Ymd | null, b: Ymd | null): boolean => !!a && !!b && cmp(a, b) === 0;

/** Dias de `a` até `b` (b - a). */
export const diffDays = (a: Ymd, b: Ymd): number =>
  Math.round((utc(b.y, b.m, b.d).getTime() - utc(a.y, a.m, a.d).getTime()) / DAY_MS);

export const toIso = (a: Ymd): string => `${pad(a.y, 4)}-${pad(a.m + 1)}-${pad(a.d)}`;
export const toBr = (a: Ymd): string => `${pad(a.d)}/${pad(a.m + 1)}/${pad(a.y, 4)}`;

export function parseIso(text: string): Ymd | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text.trim());
  return match ? make(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
}

export function parseBr(text: string): Ymd | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text.trim());
  return match ? make(Number(match[3]), Number(match[2]) - 1, Number(match[1])) : null;
}

/** dd/mm/aaaa ou aaaa-mm-dd. */
export const parseAny = (text: string): Ymd | null => parseBr(text) ?? parseIso(text);

/** Hoje no relógio local. */
export function today(): Ymd {
  const now = new Date();
  return { y: now.getFullYear(), m: now.getMonth(), d: now.getDate() };
}

/** `Date` local à meia-noite (para `detail.date`). */
export function toDate(a: Ymd): Date {
  const date = new Date(2000, 0, 1);
  date.setFullYear(a.y, a.m, a.d);
  date.setHours(0, 0, 0, 0);
  return date;
}

/** Máscara dd/mm/aaaa: só dígitos, até 8, barras automáticas (sem barra sobrando no fim). */
export function maskDigits(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/** Texto colado: ISO vira dd/mm/aaaa; o resto passa pela máscara. */
export function maskInput(raw: string): string {
  const iso = /^\s*(\d{4})-(\d{2})-(\d{2})\s*$/.exec(raw);
  return iso ? `${iso[3]}/${iso[2]}/${iso[1]}` : maskDigits(raw);
}

const fmt = (locale: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' });

const at = (a: Ymd) => utc(a.y, a.m, a.d);

/** "15 de março de 2026, domingo": o número visível vem primeiro (WCAG 2.5.3). */
export function longName(a: Ymd, locale: string): string {
  const date = fmt(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(at(a));
  const day = fmt(locale, { weekday: 'long' }).format(at(a));
  return `${date}, ${day}`;
}

export const monthTitle = (y: number, m: number, locale: string): string =>
  fmt(locale, { month: 'long', year: 'numeric' }).format(utc(y, m, 1));

export const monthName = (m: number, locale: string): string =>
  fmt(locale, { month: 'long' }).format(utc(2024, m, 1));

/** Domingo a sábado: letra e nome por extenso (`abbr`). */
export function weekdayNames(locale: string): { short: string; long: string }[] {
  return Array.from({ length: 7 }, (_, i) => {
    const date = utc(2024, 0, 7 + i); // 07/01/2024 é domingo
    return {
      short: fmt(locale, { weekday: 'narrow' }).format(date),
      long: fmt(locale, { weekday: 'long' }).format(date),
    };
  });
}
