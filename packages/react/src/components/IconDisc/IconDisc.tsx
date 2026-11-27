import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cx } from '../../utils/cx';
import type { Tone } from '../../internal/tone';

export type IconDiscTone = Extract<
  Tone,
  'accent' | 'neutral' | 'info' | 'success' | 'warning' | 'danger'
>;
export type IconDiscSize = 'sm' | 'md' | 'lg';

export interface IconDiscProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** O ícone (um `<svg>`). Decorativo: o significado vem do texto ao lado. */
  children: ReactNode;
  /** Padrão: `accent`. */
  tone?: IconDiscTone;
  /** Padrão: `md`. */
  size?: IconDiscSize;
  /** Disco circular em vez do canto arredondado do tema. */
  round?: boolean;
}

/** Disco com ícone, decorativo (`aria-hidden`): sempre acompanhado de texto que diz o que é. */
export const IconDisc = forwardRef<HTMLSpanElement, IconDiscProps>(function IconDisc(
  { tone = 'accent', size = 'md', round = false, className, children, ...rest },
  ref,
) {
  return (
    <span
      aria-hidden="true"
      {...rest}
      ref={ref}
      className={cx(
        'eds-icon-disc',
        tone !== 'accent' && `eds-icon-disc-${tone}`,
        size !== 'md' && `eds-icon-disc-${size}`,
        round && 'eds-icon-disc-round',
        className,
      )}
    >
      {children}
    </span>
  );
});
IconDisc.displayName = 'IconDisc';
