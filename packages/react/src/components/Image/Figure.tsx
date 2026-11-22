import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cx } from '../../utils/cx';

export interface FigureProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  /** Legenda (`<figcaption>`). */
  caption?: ReactNode;
  /** Crédito, junto da legenda (ex.: "Foto: Ana Exemplo"). Só aparece com `caption`. */
  credit?: ReactNode;
  /** A imagem (em geral `<Image>`), ou qualquer mídia. */
  children: ReactNode;
}

/** `<figure>` com legenda e crédito: a legenda dá o contexto que o `alt` não precisa repetir. */
export const Figure = forwardRef<HTMLElement, FigureProps>(function Figure(
  { caption, credit, className, children, ...rest },
  ref,
) {
  return (
    <figure {...rest} ref={ref} className={cx('eds-figure', className)}>
      {children}
      {caption ? (
        <figcaption className="eds-figure-caption">
          {caption}
          {credit ? (
            <>
              {' '}
              <span className="eds-figure-credit">{credit}</span>
            </>
          ) : null}
        </figcaption>
      ) : null}
    </figure>
  );
});
Figure.displayName = 'Figure';
