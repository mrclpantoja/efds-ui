import { createElement, forwardRef, type HTMLAttributes } from 'react';
import type { LayoutElement } from '../../internal/layout';
import { cx } from '../../utils/cx';

export type ContainerSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'fluid';

export interface ContainerProps extends HTMLAttributes<HTMLElement> {
  /** Largura máxima (640/768/1024/1280/1440px) ou `fluid` (100%). Padrão: `xl`. */
  size?: ContainerSize;
  /** Remove o padding lateral (ex.: tabela de ponta a ponta). */
  flush?: boolean;
  /** Elemento renderizado. Padrão: `div`. */
  as?: LayoutElement;
}

export const Container = forwardRef<HTMLElement, ContainerProps>(function Container(
  { size = 'xl', flush = false, as = 'div', className, ...rest },
  ref,
) {
  return createElement(as, {
    ...rest,
    ref,
    className: cx(
      'eds-container',
      size !== 'xl' && `eds-container-${size}`,
      flush && 'eds-container-flush',
      className,
    ),
  });
});
Container.displayName = 'Container';
