import { forwardRef, type HTMLAttributes } from 'react';
import { cx } from '../../utils/cx';

export type BadgeVariant = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** Padrão: `neutral`. A cor nunca é o único sinal: o texto diz a situação. */
  variant?: BadgeVariant;
  /** Ponto + texto, sem fundo. */
  dot?: boolean;
}

/** Rótulo informativo, não interativo. */
export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { variant = 'neutral', dot = false, className, ...rest },
  ref,
) {
  return (
    <span
      {...rest}
      ref={ref}
      className={cx('eds-badge', `eds-badge-${variant}`, dot && 'eds-badge-dot', className)}
    />
  );
});
Badge.displayName = 'Badge';
