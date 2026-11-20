import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type FieldsetHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { otpFill, otpSanitize, type OtpKind } from '@eds-ui/behavior/fields';
import { cx } from '../../utils/cx';
import { mergeTexts } from '../../utils/texts';

/** Textos internos do OtpInput (padrões em pt-BR). */
export interface OtpTexts {
  /** Nome de cada célula. */
  cell: (n: number, total: number) => string;
  /** Nome de cada célula quando o código aceita letras. */
  cellChar: (n: number, total: number) => string;
}

const defaultTexts: OtpTexts = {
  cell: (n, total) => `Dígito ${n} de ${total}`,
  cellChar: (n, total) => `Caractere ${n} de ${total}`,
};

export interface OtpInputProps extends Omit<
  FieldsetHTMLAttributes<HTMLFieldSetElement>,
  'onChange' | 'defaultValue' | 'children'
> {
  /** Ajuda ou erro (`<p className="eds-helper">`, `<p className="eds-error">`), depois das células, dentro do grupo. */
  children?: ReactNode;
  /** Nome do grupo (obrigatório: é a `<legend>`). */
  legend: ReactNode;
  /** Quantidade de células. Padrão: 6. */
  length?: number;
  /** Nome do campo no envio do formulário (um hidden leva o código inteiro). */
  name?: string;
  /** Código (controlado). */
  value?: string;
  defaultValue?: string;
  /** `numeric` (padrão) ou `alphanumeric` (letras viram maiúsculas). */
  kind?: OtpKind;
  /** A cada alteração, com o código (pode estar incompleto). */
  onChange?: (value: string) => void;
  /** Quando todas as células estão preenchidas. */
  onComplete?: (value: string) => void;
  /** Erro: `aria-invalid` em todas as células. Mostre a mensagem num `Field`/`<p class="eds-error">`. */
  invalid?: boolean;
  required?: boolean;
  /** Id da mensagem de ajuda/erro, ligado a cada célula por `aria-describedby`. */
  describedBy?: string;
  texts?: Partial<OtpTexts>;
}

const toCells = (code: string, length: number, kind: OtpKind): string[] =>
  otpFill(
    Array.from({ length }, () => ''),
    0,
    code,
    kind,
  ).cells;

/**
 * Código de verificação em células: digitar avança, Backspace volta, setas movem, colar (ou o
 * preenchimento do SMS na primeira célula) distribui. `autoComplete="one-time-code"` só na primeira.
 * Sem JS no cliente o fallback é um único `<input>`, que o React não precisa.
 */
export const OtpInput = forwardRef<HTMLFieldSetElement, OtpInputProps>(function OtpInput(
  {
    legend,
    length = 6,
    name,
    value,
    defaultValue,
    kind = 'numeric',
    onChange,
    onComplete,
    invalid,
    required,
    disabled,
    describedBy,
    texts: textsProp,
    className,
    children,
    ...rest
  },
  ref,
) {
  const t = mergeTexts(defaultTexts, textsProp);
  const total = Math.max(1, Math.trunc(length) || 6);
  const [cells, setCells] = useState<string[]>(() =>
    toCells(value ?? defaultValue ?? '', total, kind),
  );
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const code = cells.join('');

  // Controlado: o valor de fora manda.
  useEffect(() => {
    if (value !== undefined && value !== cells.join('')) setCells(toCells(value, total, kind));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, total, kind]);

  const focusCell = (index: number) => {
    const el = refs.current[Math.max(0, Math.min(total - 1, index))];
    el?.focus();
    el?.select();
  };

  const commit = (next: string[]) => {
    setCells(next);
    const joined = next.join('');
    onChange?.(joined);
    if (joined.length === total && next.every((c) => c !== '')) onComplete?.(joined);
  };

  const handleChange = (index: number) => (event: ChangeEvent<HTMLInputElement>) => {
    const text = otpSanitize(event.target.value, kind);
    if (text === '') {
      commit(cells.map((c, i) => (i === index ? '' : c)));
      return;
    }
    if (text.length > 1) {
      // Preenchimento do SMS (ou colar sem o evento): distribui.
      const filled = otpFill(cells, index, text, kind);
      commit(filled.cells);
      focusCell(filled.next);
      return;
    }
    commit(cells.map((c, i) => (i === index ? text : c)));
    if (index < total - 1) focusCell(index + 1);
  };

  const handleKeyDown = (index: number) => (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    switch (event.key) {
      case 'Backspace':
        if (cells[index] === '' && index > 0) {
          event.preventDefault();
          commit(cells.map((c, i) => (i === index - 1 ? '' : c)));
          focusCell(index - 1);
        }
        break;
      case 'Delete':
        event.preventDefault();
        commit(cells.map((c, i) => (i === index ? '' : c)));
        break;
      case 'ArrowLeft':
        event.preventDefault();
        focusCell(index - 1);
        break;
      case 'ArrowRight':
        event.preventDefault();
        focusCell(index + 1);
        break;
      case 'Home':
        event.preventDefault();
        focusCell(0);
        break;
      case 'End':
        event.preventDefault();
        focusCell(total - 1);
        break;
      default:
    }
  };

  const handlePaste = (index: number) => (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const text = otpSanitize(event.clipboardData.getData('text'), kind);
    if (text === '') return;
    // Código inteiro: desde a primeira célula; trecho: a partir da atual.
    const filled = otpFill(cells, text.length >= total ? 0 : index, text, kind);
    commit(filled.cells);
    focusCell(filled.next);
  };

  return (
    <fieldset {...rest} ref={ref} className={cx('eds-otp', className)} disabled={disabled}>
      <legend className="eds-label">{legend}</legend>
      <div className="eds-otp-cells">
        {cells.map((cell, index) => (
          <input
            key={index}
            ref={(el) => {
              refs.current[index] = el;
            }}
            className="eds-input eds-otp-cell"
            type="text"
            inputMode={kind === 'numeric' ? 'numeric' : 'text'}
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            // A primeira célula aceita o código inteiro (preenchimento do SMS).
            maxLength={index === 0 ? undefined : 1}
            aria-label={(kind === 'numeric' ? t.cell : t.cellChar)(index + 1, total)}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            required={required}
            value={cell}
            onChange={handleChange(index)}
            onKeyDown={handleKeyDown(index)}
            onPaste={handlePaste(index)}
            onFocus={(event) => event.currentTarget.select()}
          />
        ))}
      </div>
      {children}
      {name !== undefined && <input type="hidden" name={name} value={code} disabled={disabled} />}
    </fieldset>
  );
});
OtpInput.displayName = 'OtpInput';
