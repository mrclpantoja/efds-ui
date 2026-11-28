import { format, getLocale, getMessages } from './config';
import { parseDate, parseNumber, type FilterValue } from './data';

/** Tipo da coluna para exibir o valor do filtro (os mesmos de `th[data-type]` do exportador). */
export type FilterTextType = 'text' | 'select' | 'number' | 'currency' | 'percent' | 'date';

export interface DescribeFilterOptions {
  /** Tipo da coluna: formata os limites (`number`, `currency`, `percent`, `date`); texto fica cru. */
  type?: FilterTextType;
  /** Locale da formatação. Padrão: o do `configure` (`pt-BR`). */
  locale?: string;
  /** Moeda de `currency`. Padrão: `BRL`. */
  currency?: string;
}

/**
 * Texto curto de um filtro por coluna para o chip: "de R$ 100,00 a R$ 500,00", "a partir de
 * 01/03/2026". Os limites seguem o tipo da coluna (número, moeda, percentual e data, no locale);
 * texto e seleção ficam como foram escritos. Só `Intl`, sem depender dos formatadores completos.
 */
export function describeColumnFilter(
  filter: FilterValue,
  options: DescribeFilterOptions = {},
): string {
  const m = getMessages();
  if (typeof filter === 'string') return filter;
  if (Array.isArray(filter)) return filter.join(', ');
  const { type, currency = 'BRL' } = options;
  const locale = options.locale ?? getLocale();
  const show = (bound: string | undefined): string => {
    const raw = bound ?? '';
    if (raw === '' || type === undefined) return raw;
    if (type === 'date') {
      const stamp = parseDate(raw);
      return stamp === null
        ? raw
        : new Intl.DateTimeFormat(locale, {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          }).format(stamp);
    }
    if (type !== 'number' && type !== 'currency' && type !== 'percent') return raw;
    const n = parseNumber(raw);
    if (n === null) return raw;
    const text = new Intl.NumberFormat(
      locale,
      type === 'currency' ? { style: 'currency', currency } : {},
    ).format(n);
    return type === 'percent' ? `${text}%` : text;
  };
  if (filter.gte && filter.lte)
    return format(m.filterChipRange, { min: show(filter.gte), max: show(filter.lte) });
  if (filter.gte) return format(m.filterChipGte, { min: show(filter.gte) });
  return format(m.filterChipLte, { max: show(filter.lte) });
}
