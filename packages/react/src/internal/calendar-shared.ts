import { useEffect, useMemo, type RefObject } from 'react';
import { setPopoverOpen } from './combobox-shared';

/*
 * Datas locais, sem fuso: nunca `new Date('aaaa-mm-dd')` (isso é UTC e volta um dia em fusos
 * negativos). Comparações e identidades usam a string ISO `aaaa-mm-dd`, que ordena como texto.
 */

const pad = (n: number, width = 2) => String(n).padStart(width, '0');

/** Data local (meia-noite) ou `null` se `y/m/d` não existir no calendário. `m` é 0–11. */
export function makeDate(y: number, m: number, d: number): Date | null {
  if (y < 1) return null;
  const date = new Date(0);
  date.setFullYear(y, m, d);
  date.setHours(0, 0, 0, 0);
  return date.getFullYear() === y && date.getMonth() === m && date.getDate() === d ? date : null;
}

export const toIso = (d: Date) =>
  `${pad(d.getFullYear(), 4)}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function parseIso(s: string | null | undefined): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s ?? '');
  return m ? makeDate(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

/** `aaaa-mm-dd` -> `dd/mm/aaaa` (vazio se não for ISO). */
export function formatBR(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

export function parseBR(text: string): Date | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  return m ? makeDate(Number(m[3]), Number(m[2]) - 1, Number(m[1])) : null;
}

/** Máscara dd/mm/aaaa: só dígitos, barras automáticas, no máximo 8 dígitos. */
export function maskBR(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** Aceita ISO colado (`2026-03-15`) e devolve `dd/mm/aaaa`; o resto passa inalterado. */
export function isoToBRIfPasted(raw: string): string {
  const m = /^\s*(\d{4})-(\d{2})-(\d{2})\s*$/.exec(raw);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : raw;
}

export const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/** Soma meses mantendo o dia, ajustado ao fim do mês (31/01 + 1 mês = 28/02). */
export function addMonths(d: Date, n: number): Date {
  const total = d.getFullYear() * 12 + d.getMonth() + n;
  const y = Math.floor(total / 12);
  const m = total - y * 12;
  return makeDate(y, m, Math.min(d.getDate(), daysInMonth(y, m))) ?? d;
}

export const clampIso = (iso: string, min: string, max: string) =>
  min && iso < min ? min : max && iso > max ? max : iso;

export interface DateNames {
  months: string[];
  weekdaysLong: string[];
  weekdaysShort: string[];
  formatTitle: (d: Date) => string;
  formatLong: (d: Date) => string;
  formatWeekday: (d: Date) => string;
}

export function useDateNames(locale: string): DateNames {
  return useMemo(() => {
    const month = new Intl.DateTimeFormat(locale, { month: 'long' });
    const long = new Intl.DateTimeFormat(locale, { weekday: 'long' });
    const narrow = new Intl.DateTimeFormat(locale, { weekday: 'narrow' });
    const title = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' });
    const full = new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    // 07/01/2024 foi um domingo.
    const week = Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 7 + i));
    return {
      months: Array.from({ length: 12 }, (_, i) => month.format(new Date(2024, i, 15))),
      weekdaysLong: week.map((d) => long.format(d)),
      weekdaysShort: week.map((d) => narrow.format(d)),
      formatTitle: (d) => title.format(d),
      formatLong: (d) => full.format(d),
      formatWeekday: (d) => long.format(d),
    };
  }, [locale]);
}

export interface CalendarTexts {
  previousMonth: string;
  nextMonth: string;
  month: string;
  year: string;
  today: string;
  close: string;
  /** Recebe a data em dd/mm/aaaa. */
  unavailable: (date: string) => string;
}

export const defaultCalendarTexts: CalendarTexts = {
  previousMonth: 'Mês anterior',
  nextMonth: 'Próximo mês',
  month: 'Mês',
  year: 'Ano',
  today: 'Hoje',
  close: 'Fechar',
  unavailable: (date) => `${date}: data indisponível.`,
};

export const defaultOutOfRange = (min: string | null, max: string | null) =>
  min && max
    ? `Escolha uma data entre ${min} e ${max}.`
    : min
      ? `Escolha uma data a partir de ${min}.`
      : `Escolha uma data até ${max ?? ''}.`;

/**
 * Abre/fecha o popover do calendário e o posiciona sob (ou sobre) o `anchor` por
 * `--_calendar-x/-y` (único estilo inline permitido: só posição). Com `data-placement="top"`, `-y`
 * é o `top` da âncora e o CSS sobe o popup. `layoutKey` refaz o cálculo quando a altura muda.
 */
export function useCalendarPosition(
  popupRef: RefObject<HTMLElement | null>,
  anchorRef: RefObject<HTMLElement | null>,
  open: boolean,
  layoutKey: string | number,
) {
  useEffect(() => {
    const popup = popupRef.current;
    setPopoverOpen(popup, open);
    if (!open || !popup) return;
    const place = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const height = popup.offsetHeight;
      const below = window.innerHeight - rect.bottom;
      const onTop = height > 0 && below < height && rect.top > below;
      popup.style.setProperty('--_calendar-x', `${rect.left}px`);
      popup.style.setProperty('--_calendar-y', `${onTop ? rect.top : rect.bottom}px`);
      if (onTop) popup.setAttribute('data-placement', 'top');
      else popup.removeAttribute('data-placement');
    };
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [popupRef, anchorRef, open, layoutKey]);
}
