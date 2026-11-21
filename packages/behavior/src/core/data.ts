/**
 * Regras de dados da Table, sem DOM: o behavior (linhas do `tbody`) e o `@efds-ui/react`
 * (arrays de objetos) usam as mesmas, para ordenar e filtrar do mesmo jeito.
 */

import { DEFAULT_LOCALE } from './config';

export type SortDirection = 'ascending' | 'descending';

/** "Álamo" -> "alamo": sem acento e sem diferença de caixa. */
export function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/** "R$ 1.280,50", "1280.5", "-3" -> número (pt-BR por padrão); senão `null`. */
export function parseNumber(text: string): number | null {
  const t = text.replace(/\s|R\$|€|£|%/g, '');
  if (/^[+-]?\d{1,3}(\.\d{3})+(,\d+)?$/.test(t))
    return Number(t.replace(/\./g, '').replace(',', '.'));
  if (/^[+-]?\d+,\d+$/.test(t)) return Number(t.replace(',', '.'));
  if (/^[+-]?\d+(\.\d+)?$/.test(t)) return Number(t);
  return null;
}

/** "31/12/2025" ou "2025-12-31" (opcional hora) -> timestamp; senão `null`. */
export function parseDate(text: string): number | null {
  let match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2}))?$/.exec(text);
  if (match) {
    const [, d, m, y, hh, mm] = match;
    return new Date(
      Number(y),
      Number(m) - 1,
      Number(d),
      Number(hh ?? 0),
      Number(mm ?? 0),
    ).getTime();
  }
  match = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2}))?/.exec(text);
  if (match) {
    const [, y, m, d, hh, mm] = match;
    return new Date(
      Number(y),
      Number(m) - 1,
      Number(d),
      Number(hh ?? 0),
      Number(mm ?? 0),
    ).getTime();
  }
  return null;
}

const collators = new Map<string, Intl.Collator['compare']>();

/** Collator numérico, sem diferenciar acento/caixa, do locale (guardado por locale). */
export function textCompare(locale: string = DEFAULT_LOCALE): Intl.Collator['compare'] {
  let compare = collators.get(locale);
  if (!compare) {
    compare = new Intl.Collator(locale, { numeric: true, sensitivity: 'base' }).compare;
    collators.set(locale, compare);
  }
  return compare;
}

/** Valor de qualquer tipo -> texto comparável (`Date` vira `aaaa-mm-ddThh:mm` local). */
export function sortText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '';
    const p = (n: number) => String(n).padStart(2, '0');
    return `${value.getFullYear()}-${p(value.getMonth() + 1)}-${p(value.getDate())}T${p(value.getHours())}:${p(value.getMinutes())}`;
  }
  return String(value).trim();
}

/**
 * Ordena `items` (sem alterar o original) pelo valor devolvido por `getValue`. O tipo da coluna
 * vem dos valores preenchidos: todos números (pt-BR ou ponto decimal) = número; todos datas
 * (`dd/mm/aaaa` ou ISO) = data; senão texto pelo collator do `locale`. Vazios ficam por último,
 * nas duas direções. Estável.
 */
export function sortValues<T>(
  items: readonly T[],
  getValue: (item: T) => unknown,
  direction: SortDirection,
  locale: string = DEFAULT_LOCALE,
): T[] {
  const values = items.map((item) => sortText(getValue(item)));
  // Cada valor é interpretado uma única vez (número e, só se preciso, data).
  const numbers = values.map((v) => (v === '' ? null : parseNumber(v)));
  const allNumbers = values.every((v, i) => v === '' || numbers[i] !== null);
  const hasFilled = values.some((v) => v !== '');
  let dates: (number | null)[] = [];
  let allDates = false;
  if (hasFilled && !allNumbers) {
    dates = values.map((v) => (v === '' ? null : parseDate(v)));
    allDates = values.every((v, i) => v === '' || dates[i] !== null);
  }
  const kind = hasFilled && allNumbers ? 'number' : allDates ? 'date' : 'text';
  const sign = direction === 'ascending' ? 1 : -1;
  const compare = textCompare(locale);
  const keyed = items.map((item, i) => {
    const raw = values[i] ?? '';
    const key = kind === 'number' ? numbers[i] : kind === 'date' ? (dates[i] ?? null) : raw;
    return { item, key, empty: raw === '' };
  });
  keyed.sort((a, b) => {
    if (a.empty || b.empty) return a.empty === b.empty ? 0 : a.empty ? 1 : -1;
    if (kind === 'text') return sign * compare(String(a.key), String(b.key));
    return sign * ((a.key as number) - (b.key as number));
  });
  return keyed.map((k) => k.item);
}
