import { forwardRef, useId, useMemo, type FieldsetHTMLAttributes, type ReactNode } from 'react';
import { cx } from '../../utils/cx';
import { FieldContext } from '../../internal/field-context';

export interface FieldsetProps extends Omit<
  FieldsetHTMLAttributes<HTMLFieldSetElement>,
  'children'
> {
  /** Título do grupo (`<legend>`). */
  legend: ReactNode;
  /** Ajuda do grupo: descreve o `fieldset`. */
  helper?: ReactNode;
  /** Erro do grupo: descreve cada controle filho, que recebe `aria-invalid="true"`. */
  error?: ReactNode;
  children: ReactNode;
}

/** Uso interno do RadioGroup: acrescenta o asterisco na legenda. */
export interface FieldsetBaseProps extends FieldsetProps {
  legendRequired?: boolean;
}

export const FieldsetBase = forwardRef<HTMLFieldSetElement, FieldsetBaseProps>(
  function FieldsetBase(
    {
      legend,
      helper,
      error,
      legendRequired,
      className,
      children,
      'aria-describedby': own,
      ...rest
    },
    ref,
  ) {
    const id = useId();
    const helperId = `${id}-helper`;
    const errorId = `${id}-error`;
    const hasHelper = helper != null && helper !== false;
    const hasError = error != null && error !== false;

    const value = useMemo(
      () => ({ describedBy: hasError ? errorId : undefined, invalid: hasError }),
      [hasError, errorId],
    );

    return (
      <fieldset
        {...rest}
        ref={ref}
        className={cx('eds-fieldset', className)}
        aria-describedby={[own, hasHelper && helperId].filter(Boolean).join(' ') || undefined}
      >
        <legend className="eds-legend" data-required={legendRequired || undefined}>
          {legend}
        </legend>
        <FieldContext.Provider value={value}>{children}</FieldContext.Provider>
        {hasHelper && (
          <p className="eds-helper" id={helperId}>
            {helper}
          </p>
        )}
        {hasError && (
          <p className="eds-error" id={errorId}>
            {error}
          </p>
        )}
      </fieldset>
    );
  },
);

/**
 * Grupo de Checkbox/Switch com legenda, ajuda e erro. O erro descreve cada controle (não o
 * `fieldset`, para não ser lido duas vezes). Para rádios, use RadioGroup.
 */
export const Fieldset = forwardRef<HTMLFieldSetElement, FieldsetProps>(
  function Fieldset(props, ref) {
    return <FieldsetBase {...props} ref={ref} />;
  },
);
Fieldset.displayName = 'Fieldset';
