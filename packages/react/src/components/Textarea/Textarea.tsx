import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cx } from '../../utils/cx';
import { useControlAttrs } from '../../internal/field-context';

export type TextareaSize = 'sm' | 'md' | 'lg';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Padrão: `md`. */
  size?: TextareaSize;
  /** Erro: `aria-invalid="true"`. Dentro de um Field com `error` já é automático. */
  invalid?: boolean;
  /** Sucesso: `data-valid`. */
  valid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
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
    <textarea
      {...rest}
      ref={ref}
      className={cx('eds-textarea', size !== 'md' && `eds-textarea-${size}`, className)}
      {...attrs}
    />
  );
});
Textarea.displayName = 'Textarea';
