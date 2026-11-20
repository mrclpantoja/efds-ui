import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cx } from '../../utils/cx';

export type InputGroupSize = 'sm' | 'md' | 'lg';

export interface InputGroupProps extends Omit<HTMLAttributes<HTMLDivElement>, 'prefix'> {
  /** Texto (ou nó) antes do campo, ex.: "R$", "@". Texto simples vira `.eds-input-group-text`. */
  prefix?: ReactNode;
  /** Texto (ou nó) depois do campo, ex.: "kg". Um `Button` com `className="eds-input-group-button"` também serve. */
  suffix?: ReactNode;
  /** Padrão: `md`. */
  size?: InputGroupSize;
  /** Um único campo (Input, Combobox...) entre o prefixo e o sufixo. */
  children: ReactNode;
}

const part = (node: ReactNode) =>
  typeof node === 'string' || typeof node === 'number' ? (
    <span className="eds-input-group-text">{node}</span>
  ) : (
    node
  );

/**
 * Campo com prefixo e/ou sufixo numa borda só; o foco e o erro são do grupo (lidos do campo filho
 * direto: `aria-invalid`, `data-valid`, `readOnly`, `disabled`). Dentro de um Field, o rótulo continua
 * apontando para o campo. O texto do prefixo/sufixo é só visual: diga a unidade também no rótulo
 * ("Valor, em reais") quando importar.
 */
export const InputGroup = forwardRef<HTMLDivElement, InputGroupProps>(function InputGroup(
  { prefix, suffix, size = 'md', className, children, ...rest },
  ref,
) {
  return (
    <div
      {...rest}
      ref={ref}
      className={cx('eds-input-group', size !== 'md' && `eds-input-group-${size}`, className)}
    >
      {prefix != null && prefix !== false && part(prefix)}
      {children}
      {suffix != null && suffix !== false && part(suffix)}
    </div>
  );
});
InputGroup.displayName = 'InputGroup';
