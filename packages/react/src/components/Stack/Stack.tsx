import { createElement, forwardRef, type HTMLAttributes } from 'react';
import type { Gap, LayoutElement } from '../../internal/layout';
import { cx } from '../../utils/cx';

export type StackDirection = 'column' | 'row';
export type StackAlign = 'start' | 'center' | 'end' | 'stretch' | 'baseline';
export type StackJustify = 'start' | 'center' | 'end' | 'between';

export interface StackProps extends HTMLAttributes<HTMLElement> {
  /** `column` (padrão, itens esticados) ou `row` (itens centralizados no eixo cruzado). */
  direction?: StackDirection;
  /** Eixo cruzado (align-items). */
  align?: StackAlign;
  /** Eixo principal (justify-content). */
  justify?: StackJustify;
  /** Quebra linha quando não couber. Obrigatório em linhas que possam não caber a 320px. */
  wrap?: boolean;
  /** Espaçamento (escala do core). Sem a prop: space-4. */
  gap?: Gap;
  as?: LayoutElement;
}

export const Stack = forwardRef<HTMLElement, StackProps>(function Stack(
  { direction = 'column', align, justify, wrap = false, gap, as = 'div', className, ...rest },
  ref,
) {
  return createElement(as, {
    ...rest,
    ref,
    className: cx(
      'eds-stack',
      direction === 'row' && 'eds-stack-row',
      align && `eds-stack-align-${align}`,
      justify && `eds-stack-justify-${justify}`,
      wrap && 'eds-stack-wrap',
      gap !== undefined && `eds-gap-${gap}`,
      className,
    ),
  });
});
Stack.displayName = 'Stack';
