import { Radio, RadioGroup } from '@eds-ui/react';

export default function Prazo() {
  return (
    <RadioGroup legend="Prazo de entrega" defaultValue="padrao" required>
      <Radio value="padrao">Padrão (5 dias úteis)</Radio>
      <Radio value="expresso">Expresso (2 dias úteis)</Radio>
      <Radio value="retirada" disabled>
        Retirada (indisponível)
      </Radio>
    </RadioGroup>
  );
}
