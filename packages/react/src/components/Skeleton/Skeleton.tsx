import { forwardRef, type HTMLAttributes } from 'react';
import { cx } from '../../utils/cx';

export type SkeletonVariant = 'block' | 'text' | 'circle';

export interface SkeletonProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /**
   * `block` (padrão: 100% x 1rem), `text` (altura da linha herdada; a última de um grupo é mais
   * curta) ou `circle` (quadrado redondo; informe só a largura).
   */
  variant?: SkeletonVariant;
  /** Faixa de brilho varrendo o bloco (some em reduced-motion). */
  shimmer?: boolean;
}

/**
 * Marcador decorativo (`aria-hidden`). Dimensões vêm do consumidor (`className` da aplicação ou
 * `style`), pois o core não define tamanhos. Use dentro de SkeletonRegion para anunciar o estado.
 */
export const Skeleton = forwardRef<HTMLSpanElement, SkeletonProps>(function Skeleton(
  { variant = 'block', shimmer = false, className, ...rest },
  ref,
) {
  return (
    <span
      {...rest}
      ref={ref}
      className={cx(
        'eds-skeleton',
        variant !== 'block' && `eds-skeleton-${variant}`,
        shimmer && 'eds-skeleton-shimmer',
        className,
      )}
      aria-hidden="true"
    />
  );
});
Skeleton.displayName = 'Skeleton';
