import { useEffect, type RefObject } from 'react';

export interface ComboboxOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export type ComboboxFilter = boolean | ((option: ComboboxOption, text: string) => boolean);

/** Texto sem acento e sem diferenciar maiúsculas (filtro local). */
export const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const defaultStatus = (count: number) =>
  count === 0
    ? 'Nenhum resultado.'
    : count === 1
      ? '1 resultado disponível.'
      : `${count} resultados disponíveis.`;

export const STATUS_DELAY_MS = 500;
export const LOADING_STATUS_DELAY_MS = 400;

/** Aplica o filtro do combobox. `active` = há texto digitado a considerar. */
export function filterOptions(
  options: ComboboxOption[],
  filter: ComboboxFilter,
  text: string,
  active: boolean,
): ComboboxOption[] {
  if (filter === false || !active || text === '') return options;
  if (typeof filter === 'function') return options.filter((o) => filter(o, text));
  const q = normalize(text);
  return options.filter((o) => normalize(o.label).includes(q));
}

/** `showPopover`/`hidePopover` sem quebrar onde a Popover API não existe. */
export function setPopoverOpen(el: HTMLElement | null, open: boolean) {
  if (!el) return;
  try {
    const shown = el.matches(':popover-open');
    if (open && !shown) el.showPopover();
    else if (!open && shown) el.hidePopover();
  } catch {
    /* sem Popover API (ex.: jsdom) */
  }
}

/**
 * Abre/fecha o popover e o posiciona sob (ou sobre) o `anchor` por `--_combobox-x/-y/-width`
 * (único estilo inline permitido: só posição). Recalcula em scroll e resize; `layoutKey` refaz o
 * cálculo quando o conteúdo muda de altura. `prefix` troca o nome das variáveis (`--_<prefix>-x/-y/-width`),
 * para o TimePicker reaproveitar a mesma conta.
 */
export function usePopupPosition(
  popupRef: RefObject<HTMLElement | null>,
  anchorRef: RefObject<HTMLElement | null>,
  expanded: boolean,
  layoutKey: string | number,
  prefix = 'combobox',
) {
  useEffect(() => {
    const popup = popupRef.current;
    setPopoverOpen(popup, expanded);
    if (!expanded || !popup) return;
    const place = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const height = popup.offsetHeight;
      const below = window.innerHeight - rect.bottom;
      const onTop = height > 0 && below < height && rect.top > below;
      popup.style.setProperty(`--_${prefix}-x`, `${rect.left}px`);
      popup.style.setProperty(`--_${prefix}-y`, `${onTop ? rect.top : rect.bottom}px`);
      popup.style.setProperty(`--_${prefix}-width`, `${rect.width}px`);
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
  }, [popupRef, anchorRef, expanded, layoutKey, prefix]);
}

/** Rola até a opção destacada. */
export function useScrollActiveIntoView(optionId: string | undefined) {
  useEffect(() => {
    if (!optionId) return;
    document.getElementById(optionId)?.scrollIntoView?.({ block: 'nearest' });
  }, [optionId]);
}
