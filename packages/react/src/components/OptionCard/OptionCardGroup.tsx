import { forwardRef } from 'react';
import { RadioGroup, type RadioGroupProps } from '../RadioGroup';

export type OptionCardGroupProps = RadioGroupProps;

/**
 * Grupo de cartões de opção: `<fieldset>` + `<legend>` + grade (`.eds-option-cards`). Com
 * `OptionCard type="radio"`, controla `name`, `value`/`onValueChange` e `required` (como o
 * RadioGroup); com `type="checkbox"`, cada cartão guarda o próprio estado e o `error` do grupo
 * descreve todos.
 */
export const OptionCardGroup = forwardRef<HTMLFieldSetElement, OptionCardGroupProps>(
  function OptionCardGroup({ children, ...rest }, ref) {
    return (
      <RadioGroup {...rest} ref={ref}>
        <div className="eds-option-cards">{children}</div>
      </RadioGroup>
    );
  },
);
OptionCardGroup.displayName = 'OptionCardGroup';
