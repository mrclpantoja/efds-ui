import { forwardRef, type HTMLAttributes } from 'react';
import { cx } from '../../utils/cx';

export type SpinnerSize = 'sm' | 'md' | 'lg';

export interface SpinnerProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** Padrão: `md`. */
  size?: SpinnerSize;
  /** Texto anunciado. Padrão: "Carregando". */
  label?: string;
  /**
   * Só visual (`aria-hidden`, sem texto): use quando já há texto de estado ao lado, em uma região
   * `role="status"` montada antes do carregamento.
   */
  decorative?: boolean;
}

/**
 * `role="status"` com texto oculto. Atenção: uma live region que já nasce preenchida não é
 * anunciada; para anunciar ao entrar em loading, mantenha um `role="status"` vazio montado e
 * renderize o Spinner/texto dentro dele quando começar (ou use `decorative`).
 */
export const Spinner = forwardRef<HTMLSpanElement, SpinnerProps>(function Spinner(
  { size = 'md', label = 'Carregando', decorative = false, className, ...rest },
  ref,
) {
  return (
    <span
      {...rest}
      ref={ref}
      className={cx('eds-spinner', size !== 'md' && `eds-spinner-${size}`, className)}
      role={decorative ? undefined : 'status'}
      aria-hidden={decorative || undefined}
    >
      {!decorative && <span className="eds-visually-hidden">{label}</span>}
    </span>
  );
});
Spinner.displayName = 'Spinner';
