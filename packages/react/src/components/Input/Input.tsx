import { forwardRef, useEffect, useMemo, type InputHTMLAttributes } from 'react';
import { cx } from '../../utils/cx';
import { useControlAttrs } from '../../internal/field-context';
import { mergeRefs } from '../../internal/refs-d';
import { useInputMask, type InputMaskOptions } from '../../internal/useInputMask';
import { applyValidatorBy } from '@efds-ui/behavior/internal';
import { validationMessages, type ValidatorName } from '@efds-ui/behavior/validate';

export type { InputMaskOptions, ValidatorName };

export type InputSize = 'sm' | 'md' | 'lg';

/** Máscaras prontas. Qualquer outra string é um padrão: `0` dígito, `A` letra, `*` letra ou dígito. */
export type InputMaskName =
  | 'telefone'
  | 'cpf'
  | 'cnpj'
  | 'cpf-cnpj'
  | 'cep'
  | 'moeda'
  | 'numero'
  | 'hora'
  | 'competencia'
  | 'processo';

/** Mensagens de validação do Input. Sem valor, vale a padrão (pt-BR) da máscara ou do validador. */
export interface InputTexts {
  /** Mensagem de `maskValidate`. Padrão: hora, competência ou número de processo inválido. */
  maskInvalid: string;
  /** Mensagem do `validate`. Padrão: a do validador, ex.: "Informe um CPF válido.". */
  validate: string;
}

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Padrão: `md`. */
  size?: InputSize;
  /** Erro: `aria-invalid="true"`. Dentro de um Field com `error` já é automático. */
  invalid?: boolean;
  /** Sucesso: `data-valid`. */
  valid?: boolean;
  /**
   * Máscara de entrada: o nome de uma pronta (`telefone`, `cpf`, `cnpj`, `cpf-cnpj`, `cep`,
   * `moeda`, `numero`) ou um padrão como `"00.000-AAA"`. O valor do campo e o de `onChange` são
   * os mascarados. A máscara não valida.
   */
  mask?: InputMaskName | (string & Record<never, never>);
  /** Casas decimais, símbolo e sinal de `moeda` e `numero`. */
  maskOptions?: InputMaskOptions;
  /**
   * Confere a faixa de `hora` (00:00 a 23:59), `competencia` (mês 01 a 12) e `processo` (dígito
   * verificador do CNJ): o campo fica inválido (`setCustomValidity`) e o envio é bloqueado. A mensagem
   * visível é sua (`Field error`). Padrão: não valida.
   */
  maskValidate?: boolean;
  /**
   * Validador brasileiro: `cpf`, `cnpj`, `cpf-cnpj`, `cep`, `telefone`, `email`, `pis`, `titulo`, `placa` ou `data`
   * (as mesmas regras de `data-eds-validate`). Vira a validade nativa do campo (`setCustomValidity`): campo
   * vazio é válido (use `required`). Para mostrar o erro, use `useFormValidation` com `Field error`.
   * `data` lê `min` e `max`; `telefone` aceita `data-eds-validate-phone-type="landline|mobile"`.
   */
  validate?: ValidatorName;
  /** Mensagens trocáveis (`maskInvalid`, `validate`). Sem elas, valem as padrões em pt-BR. */
  texts?: Partial<InputTexts>;
  /** Com `name`, o campo visível deixa de ser enviado e um hidden leva só os caracteres significativos. */
  unmask?: boolean;
  /** Valor mascarado e valor limpo (moeda: `"1234.56"`), a cada alteração. */
  onValueChange?: (masked: string, raw: string) => void;
}

const INVALID_MESSAGES: Record<string, string> = {
  hora: 'Hora inválida. Use hh:mm, de 00:00 a 23:59.',
  competencia: 'Competência inválida. Use mm/aaaa, com o mês de 01 a 12.',
  processo: 'Número de processo inválido. Confira o número e o dígito verificador.',
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    size = 'md',
    invalid,
    valid,
    className,
    mask: maskSpec,
    maskOptions,
    unmask,
    maskValidate,
    validate,
    texts,
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
  // Validação de faixa (hora, competência, processo): vira a validade nativa do campo.
  useEffect(() => {
    const el = innerRef.current;
    if (!el || !mask) return;
    if (!maskValidate || !mask.validate) {
      el.setCustomValidity('');
      return;
    }
    const ok = mask.validate(el.value);
    el.setCustomValidity(
      ok ? '' : (texts?.maskInvalid ?? INVALID_MESSAGES[mask.name] ?? 'Valor inválido.'),
    );
  });
  // : a validade nativa acompanha o valor (a cada digitação e a cada render controlado).
  useEffect(() => {
    const el = innerRef.current;
    if (!el || !validate) return;
    const apply = () => applyValidatorBy(el, validate, validationMessages, texts?.validate);
    apply();
    el.addEventListener('input', apply);
    el.addEventListener('change', apply);
    return () => {
      el.removeEventListener('input', apply);
      el.removeEventListener('change', apply);
      el.setCustomValidity('');
    };
  }, [innerRef, validate, texts?.validate]);
  useEffect(() => {
    const el = innerRef.current;
    if (el && validate) applyValidatorBy(el, validate, validationMessages, texts?.validate);
  });
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
