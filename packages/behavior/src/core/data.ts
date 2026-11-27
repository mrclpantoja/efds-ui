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

interface ColumnKeys {
  kind: 'number' | 'date' | 'text';
  keys: (number | string | null)[];
  empty: boolean[];
}

/** Tipo da coluna (número, data ou texto) e a chave comparável de cada valor; detectado uma vez. */
function columnKeys(values: string[]): ColumnKeys {
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
  return {
    kind,
    keys: values.map((v, i) =>
      kind === 'number' ? numbers[i] : kind === 'date' ? (dates[i] ?? null) : v,
    ) as ColumnKeys['keys'],
    empty: values.map((v) => v === ''),
  };
}

/** Critério de ordenação: `key` é o `data-eds-col` (ou a chave da coluna nos dados). */
export interface SortCriterion {
  key: string;
  direction: SortDirection;
}

/**
 * Ordena `items` (sem alterar o original) por uma lista de critérios, em ordem de prioridade.
 * O tipo de cada coluna (número, data ou texto) é detectado uma vez; empate no critério 1
 * desempata no 2; vazios ficam por último em cada critério; estável.
 */
export function sortByCriteria<T>(
  items: readonly T[],
  criteria: readonly SortCriterion[],
  getValue: (item: T, key: string) => unknown,
  locale: string = DEFAULT_LOCALE,
): T[] {
  if (criteria.length === 0 || items.length < 2) return [...items];
  const compare = textCompare(locale);
  const columns = criteria.map((criterion) => ({
    ...columnKeys(items.map((item) => sortText(getValue(item, criterion.key)))),
    sign: criterion.direction === 'ascending' ? 1 : -1,
  }));
  const order = items.map((_, i) => i);
  order.sort((a, b) => {
    for (const col of columns) {
      const ea = col.empty[a] ?? true;
      const eb = col.empty[b] ?? true;
      if (ea || eb) {
        if (ea === eb) continue;
        return ea ? 1 : -1;
      }
      const ka = col.keys[a];
      const kb = col.keys[b];
      const diff =
        col.kind === 'text' ? compare(String(ka), String(kb)) : (ka as number) - (kb as number);
      if (diff !== 0) return col.sign * diff;
    }
    return a - b;
  });
  return order.map((i) => items[i] as T);
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
  return sortByCriteria(items, [{ key: '', direction }], (item) => getValue(item), locale);
}

/**
 * Filtro de uma coluna: texto (contém, sem acento e caixa), seleção (igual a algum item, sem
 * acento e caixa) ou faixa `{ gte, lte }` (número pt-BR/ponto ou data ISO/`dd/mm/aaaa`).
 * Valor vazio nunca passa por uma faixa; faixa sem limites passa tudo.
 */
export type FilterValue = string | string[] | { gte?: string; lte?: string };

/** O filtro está vazio (nada a aplicar)? */
export function isEmptyFilter(filter: FilterValue | null | undefined): boolean {
  if (filter === null || filter === undefined) return true;
  if (typeof filter === 'string') return filter.trim() === '';
  if (Array.isArray(filter)) return filter.length === 0;
  return (filter.gte ?? '') === '' && (filter.lte ?? '') === '';
}

/** Número ou data (timestamp) de um texto; `null` se nenhum dos dois. */
function comparable(text: string): number | null {
  const t = text.trim();
  if (t === '') return null;
  return parseNumber(t) ?? parseDate(t);
}

export function matchColumnFilter(value: unknown, filter: FilterValue): boolean {
  if (isEmptyFilter(filter)) return true;
  const text = sortText(value);
  if (typeof filter === 'string') return normalizeText(text).includes(normalizeText(filter.trim()));
  if (Array.isArray(filter)) {
    const needle = normalizeText(text);
    return filter.some((item) => normalizeText(item.trim()) === needle);
  }
  const current = comparable(text);
  if (current === null) return false;
  const min = filter.gte ? comparable(filter.gte) : null;
  const max = filter.lte ? comparable(filter.lte) : null;
  // Data com a hora do mesmo dia: o limite superior inclui o dia inteiro (aaaa-mm-dd).
  const maxEnd =
    max !== null &&
    filter.lte &&
    /^\d{4}-\d{2}-\d{2}$|^\d{1,2}\/\d{1,2}\/\d{4}$/.test(filter.lte.trim())
      ? max + 86_400_000 - 1
      : max;
  if (min !== null && current < min) return false;
  return !(maxEnd !== null && current > maxEnd);
}
