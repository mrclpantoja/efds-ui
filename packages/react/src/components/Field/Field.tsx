import { useId, useMemo, type HTMLAttributes, type ReactNode } from 'react';
import { cx } from '../../utils/cx';
import { FieldContext } from '../../internal/field-context';

export interface FieldProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Rótulo visível (sempre obrigatório: campo sem rótulo não é acessível). */
  label: ReactNode;
  /** Texto de ajuda; vira parte do `aria-describedby` do controle. */
  helper?: ReactNode;
  /** Mensagem de erro: o controle recebe `aria-invalid="true"` e a descrição. */
  error?: ReactNode;
  /** Mensagem de sucesso: o controle recebe `data-valid="true"`. Ignorada se houver `error`. */
  success?: ReactNode;
  /** `required` real no controle + asterisco no rótulo (`data-required`). */
  required?: boolean;
  /**
   * id do controle, se você precisar fixá-lo (padrão: gerado com `useId`).
   * Não defina `id` no próprio controle: o `htmlFor` do rótulo aponta para este.
   */
  controlId?: string;
  /** Um único controle: Input, Textarea ou Select. */
  children: ReactNode;
}

/**
 * Rótulo + controle + ajuda/erro. Liga `htmlFor`/`id` e `aria-describedby`, e propaga
 * `aria-invalid` e `required` ao Input/Textarea/Select filho. Para grupos use Fieldset/RadioGroup.
 */
export function Field({
  label,
  helper,
  error,
  success,
  required,
  controlId,
  className,
  children,
  ...rest
}: FieldProps) {
  const generated = useId();
  const id = controlId ?? generated;
  const labelId = `${id}-label`;
  const helperId = `${id}-helper`;
  const errorId = `${id}-error`;
  const successId = `${id}-success`;
  const hasHelper = helper != null && helper !== false;
  const hasError = error != null && error !== false;
  const hasSuccess = !hasError && success != null && success !== false;

  const describedBy =
    [hasHelper && helperId, hasError && errorId, hasSuccess && successId]
      .filter(Boolean)
      .join(' ') || undefined;

  const value = useMemo(
    () => ({ id, labelId, describedBy, invalid: hasError, valid: hasSuccess, required }),
    [id, labelId, describedBy, hasError, hasSuccess, required],
  );

  return (
    <div {...rest} className={cx('eds-field', className)}>
      <label className="eds-label" id={labelId} htmlFor={id} data-required={required || undefined}>
        {label}
      </label>
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
      {hasSuccess && (
        <p className="eds-success" id={successId}>
          {success}
        </p>
      )}
    </div>
  );
}
Field.displayName = 'Field';
