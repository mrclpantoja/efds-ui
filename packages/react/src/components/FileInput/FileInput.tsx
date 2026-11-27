import { forwardRef, type InputHTMLAttributes } from 'react';
import { cx } from '../../utils/cx';
import { useControlAttrs } from '../../internal/field-context';

export type FileInputSize = 'sm' | 'md' | 'lg';

export interface FileInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'size' | 'type' | 'value' | 'defaultValue' | 'children'
> {
  /** Padrão: `md`. */
  size?: FileInputSize;
  /** Erro: `aria-invalid="true"`. Dentro de um Field com `error` já é automático. */
  invalid?: boolean;
  /** Sucesso: `data-valid`. */
  valid?: boolean;
}

/** Upload simples: `<input type="file">` nativo com a aparência do core (sem JS). */
export const FileInput = forwardRef<HTMLInputElement, FileInputProps>(function FileInput(
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
    <input
      {...rest}
      ref={ref}
      type="file"
      className={cx('eds-file', size !== 'md' && `eds-file-${size}`, className)}
      {...attrs}
    />
  );
});
FileInput.displayName = 'FileInput';
