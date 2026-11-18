import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { cx } from '../../utils/cx';
import { useControlAttrs } from '../../internal/field-context';

type CheckboxBaseProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'size' | 'children'
> & {
  /**
   * Estado misto (propriedade DOM, aplicada via ref). O clique do usuário o desfaz no DOM:
   * no `onChange`, atualize seu estado para `indeterminate={false}`.
   */
  indeterminate?: boolean;
  /** Erro: `aria-invalid="true"`. Dentro de um Fieldset com `error` já é automático. */
  invalid?: boolean;
};

export type CheckboxProps = CheckboxBaseProps &
  (
    | {
        /** Texto do rótulo: o `<input>` fica dentro de um `<label class="eds-check">`. */
        children: ReactNode;
      }
    | {
        /**
         * Sem texto visível (célula de tabela, "selecionar todos"): renderiza só o `<input>`,
         * sem `<label>`, e o nome acessível é obrigatório.
         */
        children?: undefined;
        'aria-label': string;
      }
    | { children?: undefined; 'aria-labelledby': string }
  );

/** `ref`, `className` e demais props nativas vão para o `<input>`. */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { indeterminate = false, invalid, className, children, ...rest },
  ref,
) {
  const inner = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => inner.current as HTMLInputElement);
  useEffect(() => {
    if (inner.current) inner.current.indeterminate = indeterminate;
  }, [indeterminate]);

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
  const input = (
    <input
      {...rest}
      ref={inner}
      type="checkbox"
      className={cx('eds-checkbox', className)}
      {...attrs}
      data-valid={undefined}
    />
  );
  if (children == null) return input;
  return (
    <label className="eds-check">
      {input}
      {children}
    </label>
  );
});
Checkbox.displayName = 'Checkbox';
