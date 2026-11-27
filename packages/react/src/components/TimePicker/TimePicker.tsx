import {
  forwardRef,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
} from 'react';
import { cx } from '../../utils/cx';
import { mergeTexts } from '../../utils/texts';
import { useAnnouncer } from '../../internal/announcer';
import { FieldContext, useControlAttrs } from '../../internal/field-context';
import { usePopupPosition, useScrollActiveIntoView } from '../../internal/combobox-shared';
import { ClockGlyph } from '../../internal/glyphs-i';
import { mergeRefs } from '../../internal/refs-d';
import {
  LAST_MINUTE,
  caretAfterDigits,
  formatTime,
  maskTime,
  parseTime,
} from '../../internal/time-shared';
import { useControllable } from '../../internal/useControllable';

export type TimePickerSize = 'sm' | 'md' | 'lg';

export interface TimePickerTexts {
  /** Nome do botão que abre a lista. Padrão: "Escolher horário". */
  toggle: string;
  /** Nome do botão com horário (recebe o rótulo e `hh:mm`). Padrão: "{rótulo}. Atual: {hora}". */
  toggleWithValue: (label: string, value: string) => string;
  /** Nome da lista. Padrão: "Horários". */
  list: string;
  /** Mensagem de hora malformada. */
  invalid: string;
  /** Mensagem de horário fora de min/max (`null` = sem esse limite). */
  outOfRange: (min: string | null, max: string | null) => string;
  /** Status ao escolher um horário. Padrão: "Horário selecionado: {hora}.". */
  selected: (time: string) => string;
}

const defaultTexts: TimePickerTexts = {
  toggle: 'Escolher horário',
  toggleWithValue: (label, value) => `${label}. Atual: ${value}`,
  list: 'Horários',
  invalid: 'Hora inválida. Use hh:mm, de 00:00 a 23:59.',
  outOfRange: (min, max) =>
    min && max
      ? `Escolha um horário entre ${min} e ${max}.`
      : min
        ? `Escolha um horário a partir de ${min}.`
        : `Escolha um horário até ${max ?? ''}.`,
  selected: (time) => `Horário selecionado: ${time}.`,
};

const DEFAULT_STEP = 30;

export interface TimePickerProps extends Omit<
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
  | 'maxLength'
  | 'step'
> {
  /** Horário `HH:MM` (controlado). `''` = nenhum. */
  value?: string;
  /** Horário inicial (não controlado). */
  defaultValue?: string;
  /** Mudança do horário: `HH:MM` quando completo e permitido, senão `''`. */
  onValueChange?: (value: string) => void;
  /** Intervalo da lista, em minutos (1 a 720). Padrão: `30`. A digitação aceita qualquer minuto. */
  step?: number;
  /** Menor horário permitido (`HH:MM`). Padrão: `00:00`. */
  min?: string;
  /** Maior horário permitido (`HH:MM`). Padrão: `23:59`. */
  max?: string;
  /** Gera um `<input type="hidden">` com o valor `HH:MM` para envio em formulário. */
  name?: string;
  /** Padrão: `md`. */
  size?: TimePickerSize;
  /** Erro: `aria-invalid="true"`. Dentro de um Field com `error` já é automático. */
  invalid?: boolean;
  /** Sucesso: `data-valid`. */
  valid?: boolean;
  /** Textos internos substituíveis (i18n). */
  texts?: Partial<TimePickerTexts>;
}

/**
 * Campo de horário `hh:mm` com máscara e lista de horários (APG: combobox com listbox, foco
 * sempre no campo, `aria-activedescendant`). A lista é um popover manual posicionado por
 * `--_timepicker-x/-y/-width`. O `ref` vai para o `<input>`. Sem JS e sem lista, use
 * `<Input type="time">`.
 */
export const TimePicker = forwardRef<HTMLInputElement, TimePickerProps>(function TimePicker(
  {
    value: valueProp,
    defaultValue,
    onValueChange,
    step: stepProp = DEFAULT_STEP,
    min,
    max,
    name,
    size = 'md',
    invalid,
    valid,
    texts: textsProp,
    disabled,
    readOnly,
    placeholder = 'hh:mm',
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
  const t = mergeTexts(defaultTexts, textsProp);
  const generated = useId();
  const listId = `${generated}-list`;
  const errorId = `${generated}-err`;
  const optionId = (i: number) => `${generated}-opt-${i}`;

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [touched, setTouched] = useState(false);
  const { text: status, announce } = useAnnouncer();

  const step =
    Number.isFinite(stepProp) && stepProp >= 1 && stepProp <= 720
      ? Math.floor(stepProp)
      : DEFAULT_STEP;
  const minMinutes = parseTime(min ?? '') ?? 0;
  const maxMinutes = parseTime(max ?? '') ?? LAST_MINUTE;
  const times = useMemo(() => {
    const list: string[] = [];
    for (let m = minMinutes; m <= maxMinutes; m += step) list.push(formatTime(m));
    return list;
  }, [minMinutes, maxMinutes, step]);

  const [value, setValue] = useControllable<string>(valueProp, defaultValue ?? '', onValueChange);
  const [text, setText] = useState(value);
  const lastValue = useRef(value);
  const caret = useRef<number | null>(null);
  const [caretTick, setCaretTick] = useState(0);

  // O valor mudou de fora (ou pela lista): o texto acompanha.
  useEffect(() => {
    if (value === lastValue.current) return;
    lastValue.current = value;
    setText(value);
  }, [value]);

  const minutes = parseTime(text);
  const inRange = minutes !== null && minutes >= minMinutes && minutes <= maxMinutes;
  const error =
    text === ''
      ? ''
      : minutes === null
        ? t.invalid
        : inRange
          ? ''
          : t.outOfRange(min ? formatTime(minMinutes) : null, max ? formatTime(maxMinutes) : null);
  const shownError = touched ? error : '';

  useEffect(() => {
    inputRef.current?.setCustomValidity(error);
  }, [error]);

  useLayoutEffect(() => {
    const input = inputRef.current;
    const pos = caret.current;
    caret.current = null;
    if (input && pos !== null && document.activeElement === input)
      input.setSelectionRange(pos, pos);
  }, [caretTick]);

  const nearestIndex = (typed: number | null): number => {
    if (times.length === 0) return -1;
    if (typed === null) return 0;
    const at = times.findIndex((time) => (parseTime(time) ?? -1) >= typed);
    return at === -1 ? times.length - 1 : at;
  };

  const readOnlyOrDisabled = Boolean(disabled || readOnly);
  const expanded = open && times.length > 0 && !readOnlyOrDisabled;
  usePopupPosition(popupRef, wrapRef, expanded, times.length, 'timepicker');
  useScrollActiveIntoView(expanded && active >= 0 ? optionId(active) : undefined);

  const openList = () => {
    if (readOnlyOrDisabled || times.length === 0) return;
    setOpen(true);
    setActive(nearestIndex(minutes ?? parseTime(value)));
  };
  const closeList = () => {
    setOpen(false);
    setActive(-1);
  };

  const commitText = (masked: string) => {
    setText(masked);
    const parsed = parseTime(masked);
    const next = parsed !== null && parsed >= minMinutes && parsed <= maxMinutes ? masked : '';
    if (next !== value) {
      lastValue.current = next;
      setValue(next);
    }
    if (expanded) setActive(nearestIndex(parsed));
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    const masked = maskTime(raw);
    const cursor = event.target.selectionStart ?? raw.length;
    if (cursor < raw.length || masked !== raw) {
      // Digitando no fim ("9" vira "09"): o cursor fica no fim, não entre o zero automático e o 9.
      caret.current =
        cursor >= raw.length
          ? masked.length
          : caretAfterDigits(masked, raw.slice(0, cursor).replace(/\D/g, '').length);
      setCaretTick((n) => n + 1);
    }
    commitText(masked);
  };

  const choose = (index: number) => {
    const time = times[index];
    if (time === undefined) return;
    setText(time);
    lastValue.current = time;
    setValue(time);
    setTouched(true);
    closeList();
    announce(t.selected(time));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || readOnlyOrDisabled) return;
    const last = times.length - 1;
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault();
        if (!expanded) {
          openList();
          return;
        }
        if (event.altKey && event.key === 'ArrowUp') {
          closeList();
          return;
        }
        const down = event.key === 'ArrowDown';
        const next = active === -1 ? (down ? 0 : last) : active + (down ? 1 : -1);
        setActive(Math.max(0, Math.min(last, next)));
        break;
      }
      case 'PageDown':
      case 'PageUp':
        if (expanded) {
          event.preventDefault();
          setActive(Math.max(0, Math.min(last, active + (event.key === 'PageDown' ? 8 : -8))));
        }
        break;
      case 'Home':
      case 'End':
        if (expanded && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          setActive(event.key === 'Home' ? 0 : last);
        }
        break;
      case 'Enter':
        if (expanded && active >= 0) {
          event.preventDefault();
          choose(active);
        } else setTouched(true);
        break;
      case 'Escape':
        if (expanded) {
          // Fecha só a lista: o diálogo em volta, se houver, não fecha junto.
          event.preventDefault();
          event.stopPropagation();
          closeList();
        }
        break;
      case 'Tab':
        closeList();
        break;
      default:
    }
  };

  // Erro do Field/consumidor prevalece: a mensagem própria só aparece sem ele.
  const external = attrs['aria-invalid'] === true || attrs['aria-invalid'] === 'true';
  const ownError = external ? '' : shownError;
  const describedBy = [attrs['aria-describedby'], ownError ? errorId : undefined]
    .filter(Boolean)
    .join(' ');
  const labelledBy =
    rest['aria-labelledby'] ??
    (rest['aria-label'] || !ctx.id || !rest.id || rest.id === ctx.id ? undefined : ctx.labelId);
  const toggleName = value && !error ? t.toggleWithValue(t.toggle, value) : t.toggle;

  return (
    <>
      <div ref={wrapRef} className="eds-timepicker">
        <input
          autoComplete="off"
          {...rest}
          {...attrs}
          ref={mergeRefs(ref, inputRef)}
          type="text"
          role="combobox"
          inputMode="numeric"
          maxLength={5}
          placeholder={placeholder}
          className={cx(
            'eds-input',
            size !== 'md' && `eds-input-${size}`,
            'eds-timepicker-input',
            className,
          )}
          aria-autocomplete="none"
          aria-haspopup="listbox"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-activedescendant={expanded && active >= 0 ? optionId(active) : undefined}
          aria-labelledby={labelledBy}
          aria-describedby={describedBy || undefined}
          aria-invalid={shownError ? true : attrs['aria-invalid']}
          disabled={disabled}
          readOnly={readOnly}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={(event) => {
            setTouched(true);
            closeList();
            onBlur?.(event);
          }}
        />
        <button
          type="button"
          className="eds-timepicker-toggle"
          tabIndex={-1}
          aria-label={toggleName}
          aria-haspopup="listbox"
          aria-expanded={expanded}
          aria-controls={listId}
          disabled={disabled || readOnly}
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => {
            inputRef.current?.focus();
            if (expanded) closeList();
            else openList();
          }}
        >
          <ClockGlyph />
        </button>
        {name ? (
          <input type="hidden" name={name} value={error ? '' : value} disabled={disabled} />
        ) : null}
        <div ref={popupRef} className="eds-timepicker-popup" popover="manual">
          <ul id={listId} className="eds-timepicker-listbox" role="listbox" aria-label={t.list}>
            {times.map((time, i) => (
              // Teclado: tratado no input (aria-activedescendant); a opção só recebe o clique.
              // eslint-disable-next-line jsx-a11y/click-events-have-key-events
              <li
                key={time}
                id={optionId(i)}
                className="eds-timepicker-option"
                role="option"
                aria-selected={i === active}
                data-value={time}
                data-current={time === value ? '' : undefined}
                onPointerDown={(event) => event.preventDefault()}
                onPointerMove={() => {
                  if (active !== i) setActive(i);
                }}
                onClick={() => choose(i)}
              >
                {time}
              </li>
            ))}
          </ul>
        </div>
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
TimePicker.displayName = 'TimePicker';
