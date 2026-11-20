import { forwardRef, type HTMLAttributes, type ReactNode, type Ref } from 'react';
import { cx } from '../../utils/cx';

interface DividerBase extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  /** Linha mais marcada (separação de seções). */
  strong?: boolean;
  /**
   * Só visual: sai da árvore de acessibilidade (`aria-hidden`). Padrão: o separador é anunciado
   * (`<hr>` é `role="separator"`).
   */
  decorative?: boolean;
}

export type DividerProps = DividerBase &
  (
    | { orientation?: 'horizontal'; label?: ReactNode }
    | { orientation: 'vertical'; label?: undefined }
  );

/**
 * Separador de conteúdo. Horizontal: `<hr>`, ou, com `label` ("ou"), uma linha com texto no
 * meio (o texto é lido no fluxo). Vertical: `role="separator"` com `aria-orientation`.
 * Sem margem própria: o espaço vem do `gap` do contêiner (`Stack`).
 */
export const Divider = forwardRef<HTMLElement, DividerProps>(function Divider(
  { orientation = 'horizontal', label, strong = false, decorative = false, className, ...rest },
  ref,
) {
  const classes = cx(
    'eds-divider',
    strong && 'eds-divider-strong',
    orientation === 'vertical' && 'eds-divider-vertical',
    className,
  );
  const hidden = decorative ? true : undefined;
  if (orientation === 'vertical') {
    return (
      <span
        {...rest}
        ref={ref}
        className={classes}
        role={decorative ? undefined : 'separator'}
        aria-orientation={decorative ? undefined : 'vertical'}
        aria-hidden={hidden}
      />
    );
  }
  if (label !== undefined && label !== null && label !== false) {
    return (
      <div {...rest} ref={ref as Ref<HTMLDivElement>} className={classes} aria-hidden={hidden}>
        <span className="eds-divider-label">{label}</span>
      </div>
    );
  }
  return <hr {...rest} ref={ref as Ref<HTMLHRElement>} className={classes} aria-hidden={hidden} />;
});
Divider.displayName = 'Divider';
