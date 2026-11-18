import { forwardRef, useId, useMemo, useState } from 'react';
import { FieldsetBase, type FieldsetProps } from '../Fieldset/Fieldset';
import { RadioGroupContext } from '../../internal/radio-group-context';

export interface RadioGroupProps extends Omit<FieldsetProps, 'defaultValue' | 'onChange'> {
  /** `name` compartilhado pelos rádios (padrão: gerado com `useId`). */
  name?: string;
  /** Controlado. */
  value?: string;
  /** Não controlado. */
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** `required` real em cada rádio + asterisco na legenda. */
  required?: boolean;
}

/** `<fieldset>` + `<legend>` com Radio filhos; o grupo controla `name`, seleção e `required`. */
export const RadioGroup = forwardRef<HTMLFieldSetElement, RadioGroupProps>(function RadioGroup(
  { name, value, defaultValue, onValueChange, required, ...rest },
  ref,
) {
  const generated = useId();
  const [inner, setInner] = useState(defaultValue);
  const current = value !== undefined ? value : inner;

  const ctx = useMemo(
    () => ({
      name: name ?? generated,
      value: current,
      required,
      select: (next: string) => {
        if (value === undefined) setInner(next);
        onValueChange?.(next);
      },
    }),
    [name, generated, current, required, value, onValueChange],
  );

  return (
    <RadioGroupContext.Provider value={ctx}>
      <FieldsetBase {...rest} ref={ref} legendRequired={required} />
    </RadioGroupContext.Provider>
  );
});
RadioGroup.displayName = 'RadioGroup';
