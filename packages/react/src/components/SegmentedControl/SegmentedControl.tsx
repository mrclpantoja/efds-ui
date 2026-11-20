import { forwardRef, useId, type FieldsetHTMLAttributes, type ReactNode } from 'react';
import { cx } from '../../utils/cx';
import { useControllable } from '../../internal/useControllable';

export type SegmentedSize = 'sm' | 'md';

export interface SegmentedOption {
  value: string;
  /** Texto do segmento. Com `icon` e `iconOnly`, vira texto oculto (nome acessível). */
  label: string;
  /** Ícone decorativo antes do texto. */
  icon?: ReactNode;
  /** Mostra só o ícone; o `label` continua como texto oculto. */
  iconOnly?: boolean;
  disabled?: boolean;
}

export interface SegmentedControlProps extends Omit<
  FieldsetHTMLAttributes<HTMLFieldSetElement>,
  'onChange' | 'defaultValue' | 'children' | 'name'
> {
  /** Nome do grupo (a `<legend>`), obrigatório. */
  legend: ReactNode;
  /** Esconde a legenda visualmente (o contexto já nomeia o grupo); ela segue lida. */
  hideLegend?: boolean;
  /** 2 a 4 opções; para mais, use Select ou Tabs. */
  options: readonly SegmentedOption[];
  /** Valor escolhido (controlado). */
  value?: string;
  /** Valor inicial (não controlado). Padrão: nenhum. */
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** `name` dos rádios (envio em formulário). Padrão: gerado. */
  name?: string;
  /** Padrão: `md`. */
  size?: SegmentedSize;
  /** Segmentos iguais ocupando a largura toda. */
  fill?: boolean;
}

/**
 * Escolha única entre poucas opções, em faixa (Dia / Semana / Mês): rádios nativos dentro de
 * um `<fieldset>`; as setas, o Tab em grupo e o envio no formulário são do navegador.
 */
export const SegmentedControl = forwardRef<HTMLFieldSetElement, SegmentedControlProps>(
  function SegmentedControl(
    {
      legend,
      hideLegend = false,
      options,
      value: valueProp,
      defaultValue = '',
      onChange,
      name: nameProp,
      size = 'md',
      fill = false,
      className,
      ...rest
    },
    ref,
  ) {
    const generated = useId();
    const name = nameProp ?? generated;
    const [value, setValue] = useControllable<string>(valueProp, defaultValue, onChange);
    return (
      <fieldset
        {...rest}
        ref={ref}
        className={cx(
          'eds-segmented',
          size === 'sm' && 'eds-segmented-sm',
          fill && 'eds-segmented-fill',
          className,
        )}
      >
        <legend className={hideLegend ? 'eds-visually-hidden' : undefined}>{legend}</legend>
        {options.map((option) => (
          <label key={option.value}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              disabled={option.disabled}
              onChange={() => setValue(option.value)}
            />
            {option.icon}
            {option.icon && option.iconOnly ? (
              <span className="eds-visually-hidden">{option.label}</span>
            ) : (
              option.label
            )}
          </label>
        ))}
      </fieldset>
    );
  },
);
SegmentedControl.displayName = 'SegmentedControl';
