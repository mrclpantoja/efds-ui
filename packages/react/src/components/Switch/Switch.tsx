import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cx } from '../../utils/cx';
import { useControlAttrs } from '../../internal/field-context';

export interface SwitchProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'size' | 'children' | 'role'
> {
  /** Texto do rótulo (obrigatório). Descreva o estado ligado, não uma ação. */
  children: ReactNode;
  /** Erro: `aria-invalid="true"`. */
  invalid?: boolean;
}

/** `<input type="checkbox" role="switch">`. `ref`, `className` e props nativas vão para o `<input>`. */
export const Switch = forwardRef<HTMLInputElement, SwitchProps>(function Switch(
  { invalid, className, children, ...rest },
  ref,
) {
  const attrs = useControlAttrs(
    {
      id: rest.id,
      describedBy: rest['aria-describedby'],
      ariaInvalid: rest['aria-invalid'],
      required: rest.required,
      invalid,
    },
    { useId: false },
  );
  return (
    <label className="eds-check">
      <input
        {...rest}
        ref={ref}
        type="checkbox"
        role="switch"
        className={cx('eds-switch', className)}
        {...attrs}
        data-valid={undefined}
      />
      {children}
    </label>
  );
});
Switch.displayName = 'Switch';
