import { forwardRef, type HTMLAttributes } from 'react';
import { cx } from '../../utils/cx';
import type { Tone } from '../../internal/tone';

export type BadgeTone = Extract<Tone, 'neutral' | 'info' | 'success' | 'warning' | 'danger'>;

export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** Padrão: `neutral`. A cor nunca é o único sinal: o texto diz a situação. */
  tone?: BadgeTone;
  /** Padrão: `md`. */
  size?: BadgeSize;
  /** Ponto + texto, sem fundo. */
  dot?: boolean;
}

/** Rótulo informativo, não interativo. */
export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { tone = 'neutral', size = 'md', dot = false, className, ...rest },
  ref,
) {
  return (
    <span
      {...rest}
      ref={ref}
      className={cx(
        'eds-badge',
        `eds-badge-${tone}`,
        size !== 'md' && `eds-badge-${size}`,
        dot && 'eds-badge-dot',
        className,
      )}
    />
  );
});
Badge.displayName = 'Badge';
