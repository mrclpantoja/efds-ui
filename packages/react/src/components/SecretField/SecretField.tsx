import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { cx } from '../../utils/cx';
import { mergeTexts } from '../../utils/texts';
import { Button } from '../Button';
import { CopyButton, type CopyButtonTexts } from '../CopyButton';

export interface SecretFieldTexts {
  /** Nome fixo do botão de mostrar/ocultar (o estado vai em `aria-pressed`). */
  toggle: string;
  /** Nome do botão de copiar. */
  copy: string;
  /** Aviso padrão sob o campo. */
  warning: string;
}

const defaultTexts: SecretFieldTexts = {
  toggle: 'Mostrar valor',
  copy: 'Copiar valor',
  warning: 'Este valor não será mostrado de novo. Guarde-o em local seguro.',
};

export interface SecretFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'value' | 'defaultValue' | 'readOnly' | 'children' | 'size'
> {
  /** Rótulo visível (ex.: "Token de acesso"). */
  label: ReactNode;
  /** O valor secreto (mostrado uma vez). Nasce mascarado. */
  value: string;
  /** Troca o aviso padrão. */
  warning?: ReactNode;
  /** Mostra o botão de copiar. Padrão: `true`. */
  copyable?: boolean;
  texts?: Partial<SecretFieldTexts>;
  /** Textos do botão de copiar. */
  copyTexts?: Partial<CopyButtonTexts>;
}

const EyeGlyph = () => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    focusable="false"
    aria-hidden="true"
  >
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

/**
 * Caixa de segredo (valor exibido uma vez): campo somente leitura mascarado, Mostrar/Ocultar,
 * Copiar e o aviso de que o valor não aparece de novo. Use depois de gerar um token ou chave.
 */
export const SecretField = forwardRef<HTMLInputElement, SecretFieldProps>(function SecretField(
  { label, value, warning, copyable = true, texts, copyTexts, className, id, ...rest },
  ref,
) {
  const t = mergeTexts(defaultTexts, texts);
  const auto = useId();
  const inputId = id ?? `${auto}-input`;
  const warningId = `${auto}-warning`;
  const [visible, setVisible] = useState(false);
  return (
    <div className={cx('eds-secret', className)}>
      <label className="eds-label" htmlFor={inputId}>
        {label}
      </label>
      <div className="eds-input-group">
        <input
          autoComplete="off"
          aria-describedby={warningId}
          {...rest}
          ref={ref}
          id={inputId}
          className="eds-input eds-secret-value"
          type={visible ? 'text' : 'password'}
          value={value}
          readOnly
        />
        <Button
          variant="ghost"
          iconOnly
          aria-label={t.toggle}
          aria-pressed={visible}
          className="eds-input-group-button"
          onClick={() => setVisible((v) => !v)}
        >
          <EyeGlyph />
        </Button>
        {copyable && (
          <CopyButton
            iconOnly
            variant="ghost"
            size="md"
            className="eds-input-group-button"
            aria-label={t.copy}
            text={value}
            texts={copyTexts}
          />
        )}
      </div>
      <p className="eds-secret-warning" id={warningId}>
        {warning ?? t.warning}
      </p>
    </div>
  );
});
SecretField.displayName = 'SecretField';
