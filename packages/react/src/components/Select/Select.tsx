import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cx } from '../../utils/cx';
import { useControlAttrs } from '../../internal/field-context';

export type SelectSize = 'sm' | 'md' | 'lg';

/** `<select>` nativo: passe `<option>`/`<optgroup>` como filhos. */
export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  /** Padrão: `md`. */
  size?: SelectSize;
  /** Erro: `aria-invalid="true"`. Dentro de um Field com `error` já é automático. */
  invalid?: boolean;
  /** Sucesso: `data-valid="true"`. */
  valid?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { size = 'md', invalid, valid, className, ...rest },
  ref,
) {
  const attrs = useControlAttrs({
    id: rest.id,
    describedBy: rest['aria-describedby'],
    ariaInvalid: rest['aria-invalid'],
    required: rest.required,
    invalid,
    valid,
  });
  return (
    <select
      {...rest}
      ref={ref}
      className={cx('eds-select', size !== 'md' && `eds-select-${size}`, className)}
      {...attrs}
    />
  );
});
Select.displayName = 'Select';
