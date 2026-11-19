import {
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type InputHTMLAttributes,
  type KeyboardEvent,
} from 'react';
import { cx } from '../../utils/cx';
import { FieldContext, useControlAttrs } from '../../internal/field-context';
import { useAnnouncer } from '../../internal/announcer';
import { mergeRefs } from '../../internal/refs-d';
import { useControllable } from '../../internal/useControllable';
import { useDateField } from '../../internal/useDateField';
import { CalendarPanel } from '../../internal/CalendarPanel';
import {
  clampIso,
  defaultCalendarTexts,
  defaultOutOfRange,
  formatBR,
  parseIso,
  toIso,
  useDateNames,
  type CalendarTexts,
} from '../../internal/calendar-shared';
import { CalendarGlyph } from '../../internal/glyphs-f';

export type DatePickerSize = 'sm' | 'md' | 'lg';

export interface DatePickerTexts extends Partial<CalendarTexts> {
  /** Nome do botão que abre o calendário. Padrão: "Escolher data". */
  toggle?: string;
  /** Nome do diálogo. Padrão: "Escolher data". */
  dialog?: string;
  /** Nome do botão quando há data (recebe dd/mm/aaaa). Padrão: "Escolher data. Atual: {data}". */
  toggleWithValue?: (value: string) => string;
  /** Mensagem de data malformada. Padrão: "Data inválida. Use dd/mm/aaaa, com o ano em 4 dígitos (ex.: 15/03/2026).". */
  invalid?: string;
  /** Mensagem de data fora de min/max (recebe `dd/mm/aaaa`; `null` = sem esse limite). */
  outOfRange?: (min: string | null, max: string | null) => string;
  /** Status ao escolher uma data (recebe a data por extenso). Padrão: "Data selecionada: {data por extenso, dia da semana}.". */
  selected?: (label: string) => string;
}

export interface DatePickerProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  | 'size'
  | 'value'
  | 'defaultValue'
  | 'onChange'
  | 'type'
  | 'inputMode'
  | 'min'
  | 'max'
  | 'name'
  | 'list'
  | 'role'
  | 'pattern'
  | 'children'
> {
  /** Data escolhida em ISO `aaaa-mm-dd` (controlado). `null`/`''` = nenhuma. */
  value?: string | null;
  /** Data inicial (não controlado). */
  defaultValue?: string | null;
  /** Escolha ou limpeza da data. Datas locais: sem fuso. */
  onChange?: (iso: string | null, date: Date | null) => void;
  /** Menor data permitida (ISO). */
  min?: string;
  /** Maior data permitida (ISO). */
  max?: string;
  /** Bloqueia dias específicos (feriados, agenda cheia). */
  isDateDisabled?: (date: Date) => boolean;
  /** Bloqueia sábados e domingos. */
  disableWeekends?: boolean;
  /** Gera um `<input type="hidden">` com o valor ISO para envio em formulário. */
  name?: string;
  /** Padrão: `md`. */
  size?: DatePickerSize;
  /** Erro: `aria-invalid="true"`. Dentro de um Field com `error` já é automático. */
  invalid?: boolean;
  /** Sucesso: `data-valid="true"`. */
  valid?: boolean;
  /** Idioma dos nomes de mês e dia (`Intl`). Padrão: `pt-BR`. A máscara continua dd/mm/aaaa. */
  locale?: string;
  /** Textos internos substituíveis (i18n). */
  texts?: DatePickerTexts;
}

/**
 * Campo de data com calendário (APG "Date Picker Dialog"). O campo aceita digitação com máscara
 * dd/mm/aaaa (e cola ISO); o botão abre um diálogo `popover="manual"` posicionado por
 * `--_calendar-x/-y`. O `ref` vai para o `<input>` de texto.
 */
export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(function DatePicker(
  {
    value: valueProp,
    defaultValue,
    onChange,
    min = '',
    max = '',
    isDateDisabled,
    disableWeekends = false,
    name,
    size = 'md',
    invalid,
    valid,
    locale = 'pt-BR',
    texts: textsProp,
    disabled,
    readOnly,
    placeholder = 'dd/mm/aaaa',
    className,
    onKeyDown,
    onBlur,
    ...rest
  },
  ref,
) {
  const attrs = useControlAttrs({
    id: rest.id,
    describedBy: rest['aria-describedby'],
    ariaInvalid: rest['aria-invalid'],
    required: rest.required,
    invalid,
    valid,
  });
  const ctx = useContext(FieldContext);
  const generated = useId();
  const errorId = `${generated}-err`;
  const dialogId = `${generated}-cal`;
  const t = {
    ...defaultCalendarTexts,
    toggle: 'Escolher data',
    dialog: 'Escolher data',
    toggleWithValue: (value: string) => `${textsProp?.toggle ?? 'Escolher data'}. Atual: ${value}`,
    invalid: 'Data inválida. Use dd/mm/aaaa, com o ano em 4 dígitos (ex.: 15/03/2026).',
    outOfRange: defaultOutOfRange,
    selected: (label: string) => `Data selecionada: ${label}.`,
    ...textsProp,
  };

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const { text: status, announce } = useAnnouncer();
  const names = useDateNames(locale);

  const [value, setValue] = useControllable<string>(
    valueProp === undefined ? undefined : (valueProp ?? ''),
    defaultValue ?? '',
    (next) => onChange?.(next || null, next ? parseIso(next) : null),
  );
  const iso = parseIso(value) ? value : '';

  const blocked = (date: Date) =>
    (disableWeekends && (date.getDay() === 0 || date.getDay() === 6)) ||
    (isDateDisabled?.(date) ?? false);
  const outside = (isoDate: string) => (!!min && isoDate < min) || (!!max && isoDate > max);
  const check = (date: Date) => {
    const d = toIso(date);
    if (outside(d)) return t.outOfRange(min ? formatBR(min) : null, max ? formatBR(max) : null);
    return blocked(date) ? t.unavailable(formatBR(d)) : '';
  };

  const field = useDateField({
    iso,
    inputRef,
    invalidText: t.invalid,
    check,
    commit: setValue,
  });

  // Erro mostrado só depois do blur/Enter; é anunciado uma vez por mensagem.
  useEffect(() => {
    if (field.shownError) announce(field.shownError);
  }, [field.shownError, announce]);

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) toggleRef.current?.focus();
  }, []);

  // Erro do Field/consumidor prevalece: a mensagem própria só aparece sem ele.
  const external = attrs['aria-invalid'] === true || attrs['aria-invalid'] === 'true';
  const ownError = external ? '' : field.shownError;
  const describedBy = [attrs['aria-describedby'], ownError ? errorId : undefined]
    .filter(Boolean)
    .join(' ');
  // Id explícito diferente do do Field: o `for` do rótulo não chega; o nome vem por aria-labelledby.
  const labelledBy =
    rest['aria-labelledby'] ??
    (rest['aria-label'] || !ctx.id || !rest.id || rest.id === ctx.id ? undefined : ctx.labelId);

  const initialIso = iso || clampIso(toIso(new Date()), min, max);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    if (event.key === 'ArrowDown' && event.altKey && !disabled && !readOnly) {
      event.preventDefault();
      setOpen(true);
    } else if (event.key === 'Enter') {
      field.touch();
    }
  };

  const pick = (picked: string) => {
    field.syncText(picked);
    setValue(picked);
    const date = parseIso(picked);
    if (date) announce(t.selected(`${names.formatLong(date)}, ${names.formatWeekday(date)}`));
    close(true);
  };

  return (
    <>
      <div ref={wrapRef} className="eds-datepicker">
        <input
          autoComplete="off"
          {...rest}
          {...attrs}
          ref={mergeRefs(ref, inputRef)}
          type="text"
          inputMode="numeric"
          placeholder={placeholder}
          className={cx(
            'eds-input',
            size !== 'md' && `eds-input-${size}`,
            'eds-datepicker-input',
            className,
          )}
          aria-labelledby={labelledBy}
          aria-describedby={describedBy || undefined}
          aria-invalid={field.shownError ? true : attrs['aria-invalid']}
          disabled={disabled}
          readOnly={readOnly}
          {...field.inputProps}
          onBlur={(event) => {
            field.inputProps.onBlur();
            onBlur?.(event);
          }}
          onKeyDown={handleKeyDown}
        />
        <button
          ref={toggleRef}
          type="button"
          className="eds-datepicker-toggle"
          aria-label={iso && !field.error ? t.toggleWithValue(formatBR(iso)) : t.toggle}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={dialogId}
          disabled={disabled || readOnly}
          onClick={() => (open ? close(true) : setOpen(true))}
        >
          <CalendarGlyph />
        </button>
        {name ? (
          <input type="hidden" name={name} value={field.error ? '' : iso} disabled={disabled} />
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
          isDisabled={(d, date) => outside(d) || blocked(date)}
          dayState={(d) => ({ selected: d === iso && !field.error })}
          onPick={pick}
          onClose={close}
          announce={announce}
        />
        <span className="eds-visually-hidden" role="status">
          {status}
        </span>
      </div>
      {ownError ? (
        <p className="eds-error" id={errorId}>
          {ownError}
        </p>
      ) : null}
    </>
  );
});
DatePicker.displayName = 'DatePicker';
