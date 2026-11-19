import { useEffect, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import {
  addDays,
  formatBR,
  addMonths,
  clampIso,
  daysInMonth,
  makeDate,
  parseIso,
  toIso,
  useCalendarPosition,
  useDateNames,
  type CalendarTexts,
} from './calendar-shared';
import { ChevronLeftGlyph, ChevronRightGlyph } from './glyphs';

export interface DayState {
  selected: boolean;
  range?: 'start' | 'middle' | 'end' | 'single';
  preview?: boolean;
  /** Complemento do nome acessível (ex.: "início do período"). */
  suffix?: string;
}

export interface CalendarPanelProps {
  id: string;
  label: string;
  open: boolean;
  /** Elemento sob o qual o popup se ancora (e fora do qual um clique fecha). */
  anchorRef: RefObject<HTMLElement | null>;
  /** Dia que recebe o foco ao abrir. */
  initialIso: string;
  locale: string;
  texts: CalendarTexts;
  min: string;
  max: string;
  isDisabled: (iso: string, date: Date) => boolean;
  /** `preview` = dia sob o ponteiro ou o foco (prévia de período). */
  dayState: (iso: string, preview: string) => DayState;
  onPick: (iso: string) => void;
  onClose: (returnFocus: boolean) => void;
  announce: (message: string) => void;
}

const FOCUSABLE = 'button:not(:disabled), select:not(:disabled), td[tabindex="0"]';

/**
 * Diálogo de calendário (APG "Date Picker Dialog"), compartilhado por DatePicker e
 * DateRangePicker. Privado: o conteúdo só existe aberto; a grade usa roving tabindex.
 */
export function CalendarPanel({
  id,
  label,
  open,
  anchorRef,
  initialIso,
  locale,
  texts,
  min,
  max,
  isDisabled,
  dayState,
  onPick,
  onClose,
  announce,
}: CalendarPanelProps) {
  const names = useDateNames(locale);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const focusRequest = useRef(false);
  const wasOpen = useRef(false);

  const [focusIso, setFocusIso] = useState(initialIso);
  const [previewIso, setPreviewIso] = useState(initialIso);
  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setFocusIso(clampIso(initialIso, min, max));
      setPreviewIso(clampIso(initialIso, min, max));
    }
  }

  const focusDate = parseIso(focusIso) ?? new Date();
  const viewYear = focusDate.getFullYear();
  const viewMonth = focusDate.getMonth();
  const monthDays = daysInMonth(viewYear, viewMonth);
  const offset = new Date(viewYear, viewMonth, 1).getDay();
  const rows = Math.ceil((offset + monthDays) / 7);
  const todayIso = toIso(new Date());

  useCalendarPosition(popupRef, anchorRef, open, rows);

  // Foco inicial no dia e acompanhamento do roving tabindex (só por teclado).
  useEffect(() => {
    const justOpened = open && !wasOpen.current;
    wasOpen.current = open;
    if (justOpened) focusRequest.current = true;
    if (!open || !focusRequest.current) return;
    focusRequest.current = false;
    popupRef.current?.querySelector<HTMLElement>(`[data-date="${focusIso}"]`)?.focus();
  }, [open, focusIso]);

  // Clique fora fecha (sem tirar o foco de onde o usuário clicou).
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && anchorRef.current && !anchorRef.current.contains(target)) onClose(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open, anchorRef, onClose]);

  const goTo = (date: Date, focus: boolean) => {
    const next = clampIso(toIso(date), min, max);
    if (focus) focusRequest.current = true;
    setFocusIso(next);
    setPreviewIso(next);
  };

  const pick = (iso: string) => {
    const date = parseIso(iso);
    if (!date) return;
    if (isDisabled(iso, date)) {
      announce(texts.unavailable(formatBR(iso)));
      return;
    }
    onPick(iso);
  };

  const prevBlocked = !!min && toIso(new Date(viewYear, viewMonth, 0)) < min;
  const nextBlocked = !!max && toIso(new Date(viewYear, viewMonth + 1, 1)) > max;

  const setView = (y: number, m: number) => {
    const date = makeDate(y, m, Math.min(focusDate.getDate(), daysInMonth(y, m)));
    if (date) goTo(date, false);
  };

  const onGridKeyDown = (event: KeyboardEvent<HTMLTableElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const weekday = focusDate.getDay();
    let target: Date;
    switch (event.key) {
      case 'ArrowLeft':
        target = addDays(focusDate, -1);
        break;
      case 'ArrowRight':
        target = addDays(focusDate, 1);
        break;
      case 'ArrowUp':
        target = addDays(focusDate, -7);
        break;
      case 'ArrowDown':
        target = addDays(focusDate, 7);
        break;
      case 'Home':
        target = addDays(focusDate, -weekday);
        break;
      case 'End':
        target = addDays(focusDate, 6 - weekday);
        break;
      case 'PageUp':
        target = addMonths(focusDate, event.shiftKey ? -12 : -1);
        break;
      case 'PageDown':
        target = addMonths(focusDate, event.shiftKey ? 12 : 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        pick(focusIso);
        return;
      default:
        return;
    }
    event.preventDefault();
    goTo(target, true);
  };

  const onDialogKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onClose(true);
      return;
    }
    if (event.key !== 'Tab') return;
    const nodes = Array.from(popupRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (!first || !last) return;
    const active = document.activeElement;
    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const today = parseIso(todayIso);
  const currentYear = (today ?? focusDate).getFullYear();
  const minYear = parseIso(min)?.getFullYear() ?? Math.min(currentYear - 100, viewYear);
  const maxYear = parseIso(max)?.getFullYear() ?? Math.max(currentYear + 50, viewYear);
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i);
  const titleId = `${id}-title`;

  const weeks = Array.from({ length: rows }, (_, row) =>
    Array.from({ length: 7 }, (_, col) => row * 7 + col - offset + 1),
  );

  return (
    // O diálogo só intercepta Esc e Tab (armadilha de foco); os controles tratam o resto.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div
      id={id}
      ref={popupRef}
      className="eds-calendar"
      role="dialog"
      aria-label={label}
      aria-modal="true"
      popover="manual"
      onKeyDown={onDialogKeyDown}
    >
      {open ? (
        <>
          <div className="eds-calendar-header">
            <button
              type="button"
              className="eds-calendar-nav"
              aria-label={texts.previousMonth}
              aria-disabled={prevBlocked || undefined}
              onClick={() => !prevBlocked && goTo(addMonths(focusDate, -1), false)}
            >
              <ChevronLeftGlyph />
            </button>
            <h2 className="eds-calendar-title" id={titleId} aria-live="polite">
              {names.formatTitle(focusDate)}
            </h2>
            <button
              type="button"
              className="eds-calendar-nav"
              aria-label={texts.nextMonth}
              aria-disabled={nextBlocked || undefined}
              onClick={() => !nextBlocked && goTo(addMonths(focusDate, 1), false)}
            >
              <ChevronRightGlyph />
            </button>
          </div>
          <div className="eds-calendar-jump">
            <select
              className="eds-select eds-select-sm"
              aria-label={texts.month}
              value={viewMonth}
              onChange={(event) => setView(viewYear, Number(event.target.value))}
            >
              {names.months.map((name, m) => (
                <option
                  key={name}
                  value={m}
                  disabled={
                    (!!min && toIso(new Date(viewYear, m + 1, 0)) < min) ||
                    (!!max && toIso(new Date(viewYear, m, 1)) > max)
                  }
                >
                  {name}
                </option>
              ))}
            </select>
            <select
              className="eds-select eds-select-sm"
              aria-label={texts.year}
              value={viewYear}
              onChange={(event) => setView(Number(event.target.value), viewMonth)}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <table
            className="eds-calendar-grid"
            role="grid"
            aria-labelledby={titleId}
            onKeyDown={onGridKeyDown}
          >
            <thead>
              <tr>
                {names.weekdaysShort.map((short, i) => (
                  <th
                    key={i}
                    scope="col"
                    abbr={names.weekdaysLong[i]}
                    className="eds-calendar-weekday"
                  >
                    {short}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((week, row) => (
                <tr key={row}>
                  {week.map((day, col) => {
                    if (day < 1 || day > monthDays) return <td key={col} />;
                    const date = new Date(viewYear, viewMonth, day);
                    const iso = toIso(date);
                    const state = dayState(iso, previewIso);
                    const disabled = isDisabled(iso, date);
                    const full = [names.formatLong(date), names.formatWeekday(date), state.suffix]
                      .filter(Boolean)
                      .join(', ');
                    // 2.5.3: o número visível vem primeiro no nome acessível.
                    const name = full.startsWith(String(day)) ? full : `${day}, ${full}`;
                    return (
                      // Teclado: tratado na grade (roving tabindex); a célula só recebe o clique.
                      <td
                        key={col}
                        role="gridcell"
                        className="eds-calendar-day"
                        tabIndex={iso === focusIso ? 0 : -1}
                        data-date={iso}
                        aria-label={name}
                        aria-selected={state.selected ? true : undefined}
                        aria-current={iso === todayIso ? 'date' : undefined}
                        aria-disabled={disabled || undefined}
                        data-range={state.range}
                        data-range-preview={state.preview ? '' : undefined}
                        onClick={() => {
                          setFocusIso(iso);
                          setPreviewIso(iso);
                          pick(iso);
                        }}
                        onPointerMove={() => previewIso !== iso && setPreviewIso(iso)}
                      >
                        {day}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="eds-calendar-footer">
            <button
              type="button"
              className="eds-button eds-button-ghost eds-button-sm"
              onClick={() => {
                if (today && isDisabled(todayIso, today)) {
                  announce(texts.unavailable(formatBR(todayIso)));
                  goTo(today, true);
                } else pick(todayIso);
              }}
            >
              {texts.today}
            </button>
            <button
              type="button"
              className="eds-button eds-button-secondary eds-button-sm"
              onClick={() => onClose(true)}
            >
              {texts.close}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
