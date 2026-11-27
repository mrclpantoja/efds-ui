import {
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type HTMLAttributes,
} from 'react';
import { cx } from '../../utils/cx';
import { FieldContext, useControlAttrs } from '../../internal/field-context';
import { useLocale } from '../Locale';
import { useAnnouncer } from '../../internal/announcer';
import { mergeRefs } from '../../internal/refs-d';
import { useControllable } from '../../internal/useControllable';
import { useDateField } from '../../internal/useDateField';
import { CalendarPanel, type DayState } from '../../internal/CalendarPanel';
import {
  addDays,
  clampIso,
  defaultCalendarTexts,
  defaultOutOfRange,
  formatBR,
  parseIso,
  toIso,
  type CalendarTexts,
} from '../../internal/calendar-shared';
import { CalendarGlyph } from '../../internal/glyphs-f';

export type DateRangePickerSize = 'sm' | 'md' | 'lg';

/** Período em ISO `aaaa-mm-dd`; `null` = ainda não definido. */
export interface DateRangeValue {
  start: string | null;
  end: string | null;
}

export interface DateRangePickerTexts extends Partial<CalendarTexts> {
  /** Padrão: "Data inicial". */
  startLabel?: string;
  /** Padrão: "Data final". */
  endLabel?: string;
  /** Separador visual entre os campos. Padrão: "até". */
  separator?: string;
  /** Nome do botão que abre o calendário. Padrão: "Escolher período". */
  toggle?: string;
  /** Nome do diálogo. Padrão: "Escolher período". */
  dialog?: string;
  invalid?: string;
  /** Palavra do sufixo do nome do botão quando há período. Padrão: "Atual". */
  current?: string;
  /** Nome do botão quando há período (dd/mm/aaaa). Padrão: "{toggle}. {current}: {início} a {fim}". */
  toggleWithValue?: (start: string, end: string) => string;
  /** Início sem fim. Padrão: "Informe também a data final.". */
  missingEnd?: string;
  /** Fim sem início. Padrão: "Informe também a data inicial.". */
  missingStart?: string;
  outOfRange?: (min: string | null, max: string | null) => string;
  /** Padrão: "A data final deve ser igual ou posterior à inicial.". */
  endBeforeStart?: string;
  /** Padrão: "O período pode ter no máximo {n} dias.". */
  maxDays?: (days: number) => string;
  /** Padrão: "Início: {data}. Escolha a data final." (data em dd/mm/aaaa). */
  startStatus?: (start: string) => string;
  /** Padrão: "Período: {início} a {fim}.". */
  periodStatus?: (start: string, end: string) => string;
  /** Complementos do nome do dia. Padrões: "início do período" e "fim do período". */
  rangeStart?: string;
  rangeEnd?: string;
}

export interface DateRangePickerProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'onChange' | 'defaultValue' | 'children' | 'role'
> {
  /** Período (controlado). */
  value?: DateRangeValue;
  /** Período inicial (não controlado). */
  defaultValue?: DateRangeValue;
  /** Início ou fim mudou (também ao limpar: `null`). */
  onValueChange?: (range: DateRangeValue) => void;
  min?: string;
  max?: string;
  isDateDisabled?: (date: Date) => boolean;
  disableWeekends?: boolean;
  /** Período máximo, em dias corridos, contando início e fim. */
  maxDays?: number;
  /** `name` dos hidden com início e fim (ISO). */
  nameStart?: string;
  nameEnd?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  /** Somente leitura: os campos seguem focáveis e lidos, mas o calendário não abre e o valor não muda. */
  readOnly?: boolean;
  /** Padrão: `md`. */
  size?: DateRangePickerSize;
  invalid?: boolean;
  valid?: boolean;
  /** Idioma dos nomes de mês e dia (`Intl`). Padrão: o do `LocaleProvider` (`pt-BR`). */
  locale?: string;
  texts?: DateRangePickerTexts;
}

const EMPTY: DateRangeValue = { start: null, end: null };

/**
 * Período com dois campos de texto (dd/mm/aaaa) e um calendário de um mês por vez: o primeiro
 * dia escolhido é o início, o segundo é o fim. O `ref` vai para o grupo (`role="group"`).
 * Dentro de um `Field`, o rótulo nomeia o grupo e o clique nele foca o campo inicial.
 */
export const DateRangePicker = forwardRef<HTMLDivElement, DateRangePickerProps>(
  function DateRangePicker(
    {
      value: valueProp,
      defaultValue,
      onValueChange,
      min = '',
      max = '',
      isDateDisabled,
      disableWeekends = false,
      maxDays,
      nameStart,
      nameEnd,
      placeholder = 'dd/mm/aaaa',
      required,
      disabled,
      readOnly,
      size = 'md',
      invalid,
      valid,
      locale: localeProp,
      texts: textsProp,
      className,
      ...rest
    },
    ref,
  ) {
    const attrs = useControlAttrs({
      describedBy: undefined,
      required,
      invalid,
      valid,
    });
    const ctx = useContext(FieldContext);
    const contextLocale = useLocale();
    const locale = localeProp ?? contextLocale;
    const generated = useId();
    const errStartId = `${generated}-err-start`;
    const errEndId = `${generated}-err-end`;
    const dialogId = `${generated}-cal`;
    const t = {
      ...defaultCalendarTexts,
      startLabel: 'Data inicial',
      endLabel: 'Data final',
      separator: 'até',
      toggle: 'Escolher período',
      dialog: 'Escolher período',
      toggleWithValue: (start: string, end: string) =>
        `${textsProp?.toggle ?? 'Escolher período'}. ${textsProp?.current ?? 'Atual'}: ${start} a ${end}`,
      invalid: 'Data inválida. Use dd/mm/aaaa, com o ano em 4 dígitos (ex.: 15/03/2026).',
      missingEnd: 'Informe também a data final.',
      missingStart: 'Informe também a data inicial.',
      outOfRange: defaultOutOfRange,
      endBeforeStart: 'A data final deve ser igual ou posterior à inicial.',
      maxDays: (days: number) => `O período pode ter no máximo ${days} dias.`,
      startStatus: (start: string) => `Início: ${start}. Escolha a data final.`,
      periodStatus: (start: string, end: string) => `Período: ${start} a ${end}.`,
      rangeStart: 'início do período',
      rangeEnd: 'fim do período',
      ...textsProp,
    };

    const wrapRef = useRef<HTMLDivElement | null>(null);
    const startRef = useRef<HTMLInputElement | null>(null);
    const endRef = useRef<HTMLInputElement | null>(null);
    const toggleRef = useRef<HTMLButtonElement | null>(null);
    const [open, setOpen] = useState(false);
    const [openFrom, setOpenFrom] = useState<'start' | 'end'>('start');
    const [groupTouched, setGroupTouched] = useState(false);
    const [pending, setPending] = useState<string | null>(null);
    const { text: status, announce } = useAnnouncer();

    const [range, setRange] = useControllable<DateRangeValue>(
      valueProp,
      defaultValue ?? EMPTY,
      onValueChange,
    );
    const startIso = parseIso(range.start) ? (range.start ?? '') : '';
    const endIso = parseIso(range.end) ? (range.end ?? '') : '';

    const blocked = (date: Date) =>
      (disableWeekends && (date.getDay() === 0 || date.getDay() === 6)) ||
      (isDateDisabled?.(date) ?? false);
    const outside = (iso: string) => (!!min && iso < min) || (!!max && iso > max);
    const baseCheck = (date: Date) => {
      if (outside(toIso(date)))
        return t.outOfRange(min ? formatBR(min) : null, max ? formatBR(max) : null);
      return blocked(date) ? t.unavailable(formatBR(toIso(date))) : '';
    };
    const limitIso = (from: string) =>
      maxDays && maxDays > 0 ? toIso(addDays(parseIso(from) ?? new Date(), maxDays - 1)) : '';

    const startField = useDateField({
      iso: startIso,
      inputRef: startRef,
      invalidText: t.invalid,
      check: baseCheck,
      commit: (iso) => setRange({ start: iso || null, end: range.end }),
      missing: endIso ? t.missingStart : '',
      forceTouched: groupTouched,
    });
    const endField = useDateField({
      iso: endIso,
      inputRef: endRef,
      invalidText: t.invalid,
      check: (date) => {
        const base = baseCheck(date);
        if (base) return base;
        const iso = toIso(date);
        if (startIso && iso < startIso) return t.endBeforeStart;
        const limit = startIso ? limitIso(startIso) : '';
        return limit && iso > limit && maxDays ? t.maxDays(maxDays) : '';
      },
      commit: (iso) => setRange({ start: range.start, end: iso || null }),
      missing: startIso ? t.missingEnd : '',
      forceTouched: groupTouched,
    });

    useEffect(() => {
      if (startField.shownError) announce(startField.shownError);
    }, [startField.shownError, announce]);
    useEffect(() => {
      if (endField.shownError) announce(endField.shownError);
    }, [endField.shownError, announce]);

    const close = useCallback((returnFocus: boolean) => {
      setOpen(false);
      if (returnFocus) toggleRef.current?.focus();
    }, []);

    const openCalendar = (from: 'start' | 'end' = 'start') => {
      if (readOnly) return;
      setOpenFrom(from);
      setPending(null);
      setOpen(true);
    };

    const shownStart = startField.error ? '' : startIso;
    const shownEnd = endField.error ? '' : endIso;
    const pendingLimit = pending ? limitIso(pending) : '';

    const isDisabled = (iso: string, date: Date) =>
      outside(iso) || blocked(date) || (!!pendingLimit && iso > pendingLimit);

    const dayState = (iso: string, preview: string): DayState => {
      if (pending) {
        const inPreview =
          iso > pending &&
          iso <= preview &&
          !outside(iso) &&
          (!pendingLimit || iso <= pendingLimit);
        return {
          selected: iso === pending,
          range: iso === pending ? 'single' : undefined,
          preview: inPreview || undefined,
          suffix: iso === pending ? t.rangeStart : undefined,
        };
      }
      if (!shownStart) return { selected: false };
      if (!shownEnd) {
        return iso === shownStart
          ? { selected: true, range: 'single', suffix: t.rangeStart }
          : { selected: false };
      }
      if (iso < shownStart || iso > shownEnd) return { selected: false };
      if (shownStart === shownEnd) return { selected: true, range: 'single', suffix: t.rangeStart };
      if (iso === shownStart) return { selected: true, range: 'start', suffix: t.rangeStart };
      if (iso === shownEnd) return { selected: true, range: 'end', suffix: t.rangeEnd };
      return { selected: true, range: 'middle' };
    };

    const pick = (iso: string) => {
      if (!pending || iso < pending) {
        setPending(iso);
        announce(t.startStatus(formatBR(iso)));
        return;
      }
      startField.syncText(pending);
      endField.syncText(iso);
      setRange({ start: pending, end: iso });
      setPending(null);
      announce(t.periodStatus(formatBR(pending), formatBR(iso)));
      close(true);
    };

    const anchorIso = openFrom === 'end' && shownEnd ? shownEnd : shownStart;
    const initialIso = pending ?? (anchorIso || clampIso(toIso(new Date()), min, max));

    // Erro do Field/consumidor prevalece; sem ele, cada campo mostra o seu.
    const external = attrs['aria-invalid'] === true || attrs['aria-invalid'] === 'true';
    const ownStartError = external ? '' : startField.shownError;
    const ownEndError = external ? '' : endField.shownError;
    const describe = (own: string, id: string) =>
      [attrs['aria-describedby'], own ? id : undefined].filter(Boolean).join(' ') || undefined;
    const controlClass = (extra: string) =>
      cx('eds-input', size !== 'md' && `eds-input-${size}`, extra);
    const common = {
      type: 'text' as const,
      inputMode: 'numeric' as const,
      maxLength: 10,
      autoComplete: 'off',
      placeholder,
      disabled,
      readOnly,
      required: attrs.required,
      'data-valid': attrs['data-valid'],
    };

    return (
      <>
        <div
          {...rest}
          onBlur={(event) => {
            rest.onBlur?.(event);
            if (!event.currentTarget.contains(event.relatedTarget)) setGroupTouched(true);
          }}
          ref={mergeRefs(ref, wrapRef)}
          role="group"
          aria-labelledby={
            rest['aria-label'] ? rest['aria-labelledby'] : (rest['aria-labelledby'] ?? ctx.labelId)
          }
          className={cx('eds-datepicker', 'eds-daterange', className)}
        >
          <input
            {...common}
            id={attrs.id}
            ref={startRef}
            className={controlClass('eds-datepicker-input')}
            aria-label={t.startLabel}
            aria-describedby={describe(ownStartError, errStartId)}
            aria-invalid={startField.shownError ? true : attrs['aria-invalid']}
            {...startField.inputProps}
            onBlur={startField.inputProps.onBlur}
            onKeyDown={(event) => {
              if (event.key === 'Enter') startField.touch();
              else if (event.key === 'ArrowDown' && event.altKey && !disabled && !readOnly) {
                event.preventDefault();
                openCalendar('start');
              }
            }}
          />
          <span className="eds-daterange-sep" aria-hidden="true">
            {t.separator}
          </span>
          <input
            {...common}
            ref={endRef}
            className={controlClass('eds-datepicker-input')}
            aria-label={t.endLabel}
            aria-describedby={describe(ownEndError, errEndId)}
            aria-invalid={endField.shownError ? true : attrs['aria-invalid']}
            {...endField.inputProps}
            onBlur={endField.inputProps.onBlur}
            onKeyDown={(event) => {
              if (event.key === 'Enter') endField.touch();
              else if (event.key === 'ArrowDown' && event.altKey && !disabled && !readOnly) {
                event.preventDefault();
                openCalendar('end');
              }
            }}
          />
          <button
            ref={toggleRef}
            type="button"
            className="eds-datepicker-toggle"
            aria-label={
              shownStart && shownEnd
                ? t.toggleWithValue(formatBR(shownStart), formatBR(shownEnd))
                : t.toggle
            }
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-controls={dialogId}
            disabled={disabled || readOnly}
            onClick={() => (open ? close(true) : openCalendar('start'))}
          >
            <CalendarGlyph />
          </button>
          {nameStart ? (
            <input type="hidden" name={nameStart} value={shownStart} disabled={disabled} />
          ) : null}
          {nameEnd ? (
            <input type="hidden" name={nameEnd} value={shownEnd} disabled={disabled} />
          ) : null}
          <CalendarPanel
            id={dialogId}
            label={t.dialog}
            open={open}
            anchorRef={wrapRef}
            initialIso={initialIso}
            locale={locale}
            texts={t}
            min={min}
            max={max}
            isDisabled={isDisabled}
            dayState={dayState}
            onPick={pick}
            onClose={close}
            announce={announce}
          />
          <span className="eds-visually-hidden" role="status">
            {status}
          </span>
        </div>
        {ownStartError ? (
          <p className="eds-error" id={errStartId}>
            {ownStartError}
          </p>
        ) : null}
        {ownEndError ? (
          <p className="eds-error" id={errEndId}>
            {ownEndError}
          </p>
        ) : null}
      </>
    );
  },
);
DateRangePicker.displayName = 'DateRangePicker';
