import { forwardRef, useMemo, type InputHTMLAttributes } from 'react';
import { cx } from '../../utils/cx';
import { useControlAttrs } from '../../internal/field-context';
import { mergeRefs } from '../../internal/refs-d';
import { useInputMask, type InputMaskOptions } from '../../internal/useInputMask';

export type { InputMaskOptions };

export type InputSize = 'sm' | 'md' | 'lg';

/** Máscaras prontas. Qualquer outra string é um padrão: `0` dígito, `A` letra, `*` letra ou dígito. */
export type InputMaskName = 'telefone' | 'cpf' | 'cnpj' | 'cpf-cnpj' | 'cep' | 'moeda' | 'numero';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Padrão: `md`. */
  size?: InputSize;
  /** Erro: `aria-invalid="true"`. Dentro de um Field com `error` já é automático. */
  invalid?: boolean;
  /** Sucesso: `data-valid="true"`. */
  valid?: boolean;
  /**
   * Máscara de entrada: o nome de uma pronta (`telefone`, `cpf`, `cnpj`, `cpf-cnpj`, `cep`,
   * `moeda`, `numero`) ou um padrão como `"00.000-AAA"`. O valor do campo e o de `onChange` são
   * os mascarados. A máscara não valida.
   */
  mask?: InputMaskName | (string & Record<never, never>);
  /** Casas decimais, símbolo e sinal de `moeda` e `numero`. */
  maskOptions?: InputMaskOptions;
  /** Com `name`, o campo visível deixa de ser enviado e um hidden leva só os caracteres significativos. */
  unmask?: boolean;
  /** Valor mascarado e valor limpo (moeda: `"1234.56"`), a cada alteração. */
  onValueChange?: (masked: string, raw: string) => void;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    size = 'md',
    invalid,
    valid,
    className,
    mask: maskSpec,
    maskOptions,
    unmask,
    onValueChange,
    value,
    defaultValue,
    onChange,
    onPaste,
    name,
    ...rest
  },
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
  const masked = useInputMask({
    spec: maskSpec,
    options: maskOptions,
    value,
    defaultValue,
    onChange,
    onPaste,
    onValueChange,
  });
  const mask = masked.mask;
  const innerRef = masked.inputRef;
  const mergedRef = useMemo(() => mergeRefs(ref, innerRef), [ref, innerRef]);
  const sendRaw = mask !== null && unmask === true && name !== undefined && name !== '';

  const control = (
    <input
      {...rest}
      {...(mask
        ? {
            ...masked.props,
            inputMode: rest.inputMode ?? mask.inputMode,
            autoComplete: rest.autoComplete ?? mask.autocomplete,
            maxLength: rest.maxLength ?? mask.maxLength,
            'data-eds-mask': maskSpec,
          }
        : { value, defaultValue, onChange, onPaste })}
      name={sendRaw ? undefined : name}
      ref={mergedRef}
      className={cx('eds-input', size !== 'md' && `eds-input-${size}`, className)}
      {...attrs}
    />
  );
  if (!sendRaw) return control;
  return (
    <>
      {control}
      <input
        type="hidden"
        name={name}
        value={masked.raw}
        disabled={rest.disabled}
        form={rest.form}
      />
    </>
  );
});
Input.displayName = 'Input';
