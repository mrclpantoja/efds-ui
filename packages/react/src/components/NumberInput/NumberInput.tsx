import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { clampNumber, decimalsOf, stepNumber } from '@efds-ui/behavior/fields';
import { createMask } from '@efds-ui/behavior/mask';
import { useAnnouncer } from '../../internal/announcer';
import { MinusGlyph, PlusGlyph } from '../../internal/glyphs-c1';
import { mergeRefs } from '../../internal/refs-d';
import { cx } from '../../utils/cx';
import { mergeTexts } from '../../utils/texts';
import { Button } from '../Button';
import { Input, type InputProps, type InputSize } from '../Input';

/** Textos internos do NumberInput (padrões em pt-BR). */
export interface NumberInputTexts {
  decrement: string;
  increment: string;
  /** Anúncio de quando o valor digitado é ajustado à faixa. */
  adjusted: (value: string) => string;
}

const defaultTexts: NumberInputTexts = {
  decrement: 'Diminuir',
  increment: 'Aumentar',
  adjusted: (value) => `Valor ajustado para ${value}.`,
};

export type NumberInputSize = InputSize;

export interface NumberInputProps extends Omit<
  InputProps,
  | 'type'
  | 'value'
  | 'defaultValue'
  | 'onChange'
  | 'mask'
  | 'maskOptions'
  | 'texts'
  | 'onValueChange'
  | 'min'
  | 'max'
  | 'step'
  | 'size'
> {
  /** Valor (controlado); `null` é campo vazio. */
  value?: number | null;
  defaultValue?: number | null;
  /** Ao confirmar (sair do campo, Enter, setas, botões), nunca a cada tecla. */
  onValueChange?: (value: number | null) => void;
  min?: number;
  max?: number;
  /** Passo das setas e dos botões. Padrão: 1. */
  step?: number;
  /** Casas decimais (máscara `numero`). Padrão: as do passo. */
  decimals?: number;
  /** Padrão: `md`. */
  size?: InputSize;
  texts?: Partial<NumberInputTexts>;
}

const REPEAT_DELAY_MS = 400;
const REPEAT_INTERVAL_MS = 70;

/**
 * Campo numérico com botões − / + (fora do Tab), padrão `spinbutton`: ↑/↓ um passo, PageUp/PageDown
 * dez, Home/End mínimo e máximo, segurar o botão repete. Um valor fora da faixa é ajustado ao sair
 * do campo e anunciado. Com casas decimais usa a máscara `numero` (vírgula; milhar com ponto).
 */
export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(function NumberInput(
  {
    value,
    defaultValue,
    onValueChange,
    min,
    max,
    step: stepProp,
    decimals: decimalsProp,
    size = 'md',
    texts: textsProp,
    className,
    disabled,
    readOnly,
    onBlur,
    onKeyDown,
    ...rest
  },
  ref,
) {
  const t = mergeTexts(defaultTexts, textsProp);
  const step = stepProp !== undefined && stepProp > 0 ? stepProp : 1;
  const decimals = Math.max(0, Math.min(8, Math.trunc(decimalsProp ?? decimalsOf(step))));
  const negative = min === undefined || min < 0;
  const range = useMemo(() => ({ min, max }), [min, max]);
  const mask = useMemo(
    () => (decimals > 0 ? createMask('numero', { decimals, negative }) : null),
    [decimals, negative],
  );

  const parse = useCallback(
    (text: string): number | null => {
      if (text.trim() === '') return null;
      if (mask) {
        const raw = mask.unmask(text);
        return raw === '' || raw === '-' ? null : Number(raw);
      }
      const digits = text.replace(/\D/g, '');
      if (digits === '') return null;
      return Number(negative && text.trim().startsWith('-') ? `-${digits}` : digits);
    },
    [mask, negative],
  );
  const show = useCallback(
    (n: number | null): string => {
      if (n === null) return '';
      return mask ? mask.format(n.toFixed(decimals)) : String(n);
    },
    [mask, decimals],
  );

  const [text, setText] = useState(() =>
    show(value !== undefined ? value : (defaultValue ?? null)),
  );
  const textRef = useRef(text);
  textRef.current = text;
  const current = parse(text);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const merged = useMemo(() => mergeRefs(ref, inputRef), [ref]);
  const { text: said, announce } = useAnnouncer();

  // Controlado: acompanha o valor de fora.
  useEffect(() => {
    if (value === undefined) return;
    emitted.current = value;
    if (value !== parse(textRef.current)) setText(show(value));
  }, [value, parse, show]);

  // Último valor entregue ao `onValueChange` (só avisa quando muda).
  const emitted = useRef<number | null>(parse(text));
  const apply = useCallback(
    (next: number | null) => {
      const shown = show(next);
      textRef.current = shown;
      setText(shown);
      if (emitted.current !== next) {
        emitted.current = next;
        onValueChange?.(next);
      }
    },
    [onValueChange, show],
  );

  const stepBy = useCallback(
    (steps: number) => {
      apply(stepNumber(parse(textRef.current), steps, step, range, decimals));
    },
    [apply, parse, step, range, decimals],
  );

  /** Fim da edição: lê o texto, ajusta à faixa e avisa. */
  const commit = () => {
    const typed = parse(textRef.current);
    const fixed = typed === null ? null : clampNumber(typed, range);
    apply(fixed);
    if (fixed !== null && fixed !== typed) announce(t.adjusted(show(fixed)));
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    setText(mask ? raw : raw.replace(negative ? /(?!^-)[^\d]/g : /[^\d]/g, ''));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || readOnly || event.ctrlKey || event.metaKey || event.altKey)
      return;
    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        stepBy(1);
        break;
      case 'ArrowDown':
        event.preventDefault();
        stepBy(-1);
        break;
      case 'PageUp':
        event.preventDefault();
        stepBy(10);
        break;
      case 'PageDown':
        event.preventDefault();
        stepBy(-10);
        break;
      case 'Home':
        if (min !== undefined) {
          event.preventDefault();
          apply(min);
        }
        break;
      case 'End':
        if (max !== undefined) {
          event.preventDefault();
          apply(max);
        }
        break;
      case 'Enter':
        commit();
        break;
      default:
    }
  };

  // Segurar o botão repete (um passo ao pressionar; depois de uma pausa, a cada intervalo).
  const stepRef = useRef(stepBy);
  stepRef.current = stepBy;
  const delay = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeat = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopRepeat = useCallback(() => {
    if (delay.current) clearTimeout(delay.current);
    if (repeat.current) clearInterval(repeat.current);
    delay.current = null;
    repeat.current = null;
  }, []);
  useEffect(() => stopRepeat, [stopRepeat]);

  const press = (direction: 1 | -1) => (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || disabled || readOnly) return;
    if (document.activeElement === inputRef.current) event.preventDefault();
    stepRef.current(direction);
    stopRepeat();
    delay.current = setTimeout(() => {
      repeat.current = setInterval(() => stepRef.current(direction), REPEAT_INTERVAL_MS);
    }, REPEAT_DELAY_MS);
  };
  // Enter/Espaço geram `click` sem ponteiro (`detail` 0); o do mouse já foi tratado no pointerdown.
  const keyClick = (direction: 1 | -1) => (event: { detail: number }) => {
    if (event.detail === 0 && !disabled && !readOnly) stepBy(direction);
  };

  const atMin = current !== null && min !== undefined && current <= min;
  const atMax = current !== null && max !== undefined && current >= max;

  // Um botão que se desabilita com o foco nele (clique no limite) o perderia: o foco vai ao campo.
  useLayoutEffect(() => {
    const active = document.activeElement;
    if (
      active instanceof HTMLButtonElement &&
      active.disabled &&
      rootRef.current?.contains(active)
    ) {
      inputRef.current?.focus();
    }
  }, [atMin, atMax]);

  return (
    <>
      <div
        ref={rootRef}
        className={cx('eds-number', size !== 'md' && `eds-number-${size}`, className)}
      >
        <Button
          type="button"
          variant="ghost"
          iconOnly
          className="eds-number-button"
          aria-label={t.decrement}
          tabIndex={-1}
          disabled={disabled || atMin}
          onPointerDown={press(-1)}
          onPointerUp={stopRepeat}
          onPointerLeave={stopRepeat}
          onPointerCancel={stopRepeat}
          onClick={keyClick(-1)}
        >
          <MinusGlyph />
        </Button>
        <Input
          autoComplete="off"
          {...rest}
          ref={merged}
          className="eds-number-input"
          role="spinbutton"
          inputMode={decimals > 0 ? 'decimal' : negative ? 'text' : 'numeric'}
          mask={mask ? 'numero' : undefined}
          maskOptions={mask ? { decimals, negative } : undefined}
          value={text}
          disabled={disabled}
          readOnly={readOnly}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={current ?? undefined}
          aria-valuetext={current === null ? undefined : text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={(event: FocusEvent<HTMLInputElement>) => {
            onBlur?.(event);
            commit();
          }}
        />
        <Button
          type="button"
          variant="ghost"
          iconOnly
          className="eds-number-button"
          aria-label={t.increment}
          tabIndex={-1}
          disabled={disabled || atMax}
          onPointerDown={press(1)}
          onPointerUp={stopRepeat}
          onPointerLeave={stopRepeat}
          onPointerCancel={stopRepeat}
          onClick={keyClick(1)}
        >
          <PlusGlyph />
        </Button>
      </div>
      <span className="eds-visually-hidden" role="status">
        {said}
      </span>
    </>
  );
});
NumberInput.displayName = 'NumberInput';
