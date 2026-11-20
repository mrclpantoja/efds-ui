import { forwardRef, useContext, type InputHTMLAttributes, type ReactNode } from 'react';
import { cx } from '../../utils/cx';
import { useControlAttrs } from '../../internal/field-context';
import { RadioGroupContext } from '../../internal/radio-group-context';

export type RadioSize = 'sm' | 'md' | 'lg';

export interface RadioProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'size' | 'children' | 'value' | 'checked' | 'defaultChecked'
> {
  /** Texto do rótulo (obrigatório). */
  children: ReactNode;
  /** Padrão: `md`. */
  size?: RadioSize;
  /** Valor da opção (obrigatório). */
  value: string;
  /** Só fora de um RadioGroup (dentro dele, quem controla é o grupo). */
  checked?: boolean;
  /** Só fora de um RadioGroup. */
  defaultChecked?: boolean;
  /** Erro: `aria-invalid="true"`. Dentro de um RadioGroup com `error` já é automático. */
  invalid?: boolean;
}

/** Dentro de um RadioGroup herda `name`, `required` e o estado marcado. `ref`/`className` vão para o `<input>`. */
export const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio(
  { size = 'md', invalid, className, children, value, checked, defaultChecked, onChange, ...rest },
  ref,
) {
  const group = useContext(RadioGroupContext);
  const attrs = useControlAttrs(
    {
      id: rest.id,
      describedBy: rest['aria-describedby'],
      ariaInvalid: rest['aria-invalid'],
      required: rest.required ?? group?.required,
      invalid,
    },
    { useId: false },
  );
  const state = group
    ? {
        name: group.name,
        checked: group.value === value,
        onChange: (event: Parameters<NonNullable<typeof onChange>>[0]) => {
          group.select(value);
          onChange?.(event);
        },
      }
    : { checked, defaultChecked, onChange };

  return (
    <label className="eds-check">
      <input
        {...rest}
        ref={ref}
        type="radio"
        value={value}
        className={cx('eds-radio', size !== 'md' && `eds-radio-${size}`, className)}
        {...state}
        {...attrs}
        data-valid={undefined}
      />
      {children}
    </label>
  );
});
Radio.displayName = 'Radio';
