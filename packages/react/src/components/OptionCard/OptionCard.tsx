import { forwardRef, useContext, type InputHTMLAttributes, type ReactNode } from 'react';
import { useControlAttrs } from '../../internal/field-context';
import { RadioGroupContext } from '../../internal/radio-group-context';

export interface OptionCardProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'size' | 'children' | 'title' | 'value' | 'checked' | 'defaultChecked'
> {
  /** Controle nativo do cartão. */
  type: 'radio' | 'checkbox';
  /** Título da opção (obrigatório): é o nome acessível do controle. */
  title: ReactNode;
  /** Ícone decorativo à esquerda (um `<svg>` ou um `IconDisc`). */
  icon?: ReactNode;
  /** Texto de apoio: descreve a opção. */
  description?: ReactNode;
  /**
   * Marca visual do estado escolhido (um `<svg>`, decorativo). Sem ela, o CSS desenha o visto no
   * canto.
   */
  mark?: ReactNode;
  /** Valor da opção (obrigatório). */
  value: string;
  /** Só fora de um OptionCardGroup (dentro dele, quem controla é o grupo, nos rádios). */
  checked?: boolean;
  /** Só fora de um OptionCardGroup. */
  defaultChecked?: boolean;
  /** Erro: `aria-invalid="true"`. Dentro de um grupo com `error` já é automático. */
  invalid?: boolean;
}

/**
 * Cartão de opção: o `<input>` nativo (rádio ou caixa de seleção) é filho direto do `<label>` e o
 * CSS o estende por cima do cartão inteiro. `ref`, `className` e as demais props vão para o
 * `<input>`. Num `OptionCardGroup`, os rádios herdam `name`, `required` e o estado marcado.
 */
export const OptionCard = forwardRef<HTMLInputElement, OptionCardProps>(function OptionCard(
  {
    type,
    title,
    icon,
    description,
    mark,
    value,
    checked,
    defaultChecked,
    invalid,
    className,
    onChange,
    ...rest
  },
  ref,
) {
  const group = useContext(RadioGroupContext);
  const grouped = group !== null && type === 'radio';
  const attrs = useControlAttrs(
    {
      id: rest.id,
      describedBy: rest['aria-describedby'],
      ariaInvalid: rest['aria-invalid'],
      required: rest.required ?? (grouped ? group.required : undefined),
      invalid,
    },
    { useId: false },
  );
  const state = grouped
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
    <label className="eds-option-card">
      <input
        {...rest}
        ref={ref}
        type={type}
        value={value}
        className={className}
        {...state}
        {...attrs}
        data-valid={undefined}
      />
      {icon != null && icon !== false && (
        <span className="eds-option-card-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="eds-option-card-text">
        <span className="eds-option-card-title">{title}</span>
        {description != null && description !== false && description !== '' && (
          <span className="eds-option-card-description">{description}</span>
        )}
      </span>
      {mark != null && mark !== false && (
        <span className="eds-option-card-mark" aria-hidden="true">
          {mark}
        </span>
      )}
    </label>
  );
});
OptionCard.displayName = 'OptionCard';
