import { createElement, forwardRef, type HTMLAttributes } from 'react';
import type { Gap, LayoutElement, Span } from '../../internal/layout';
import { cx } from '../../utils/cx';

export interface GridProps extends HTMLAttributes<HTMLElement> {
  /** Espaçamento entre células (escala do core). Sem a prop: space-4, que acompanha a densidade. */
  gap?: Gap;
  /** Colunas intrínsecas (auto-fit, mínimo 256px), sem precisar de `span`. */
  auto?: boolean;
  /** Para um Grid que também é item de outro Grid: herda as trilhas do pai. */
  subgrid?: boolean;
  as?: LayoutElement;
}

/** Swiss Grid de 12 colunas; responde à largura do próprio grid (container query). */
export const Grid = forwardRef<HTMLElement, GridProps>(function Grid(
  { gap, auto = false, subgrid = false, as = 'div', className, ...rest },
  ref,
) {
  return createElement(as, {
    ...rest,
    ref,
    className: cx(
      'eds-grid',
      auto && 'eds-grid-auto',
      subgrid && 'eds-grid-subgrid',
      gap !== undefined && `eds-gap-${gap}`,
      className,
    ),
  });
});
Grid.displayName = 'Grid';

export interface GridItemProps extends HTMLAttributes<HTMLElement> {
  /** Colunas ocupadas em todas as larguras do grid. */
  span?: Span;
  /** Colunas quando o grid tiver 640px ou mais (mobile-first; herda a faixa anterior). */
  spanSm?: Span;
  /** 768px ou mais. */
  spanMd?: Span;
  /** 1024px ou mais. */
  spanLg?: Span;
  as?: LayoutElement;
}

/** Filho de Grid com os spans de coluna. Sem spans, ocupa a linha inteira. */
export const GridItem = forwardRef<HTMLElement, GridItemProps>(function GridItem(
  { span, spanSm, spanMd, spanLg, as = 'div', className, ...rest },
  ref,
) {
  return createElement(as, {
    ...rest,
    ref,
    className:
      cx(
        span && `eds-col-span-${span}`,
        spanSm && `eds-col-span-sm-${spanSm}`,
        spanMd && `eds-col-span-md-${spanMd}`,
        spanLg && `eds-col-span-lg-${spanLg}`,
        className,
      ) || undefined,
  });
});
GridItem.displayName = 'GridItem';
