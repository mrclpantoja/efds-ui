import { useState } from 'react';
import { Field, NumberInput } from '@efds-ui/react';

export default function Basico() {
  const [quantidade, setQuantidade] = useState<number | null>(1);
  return (
    <Field label="Quantidade" helper={`Entre 0 e 99. Valor atual: ${quantidade ?? 'vazio'}.`}>
      <NumberInput
        name="quantidade"
        min={0}
        max={99}
        value={quantidade}
        onValueChange={setQuantidade}
      />
    </Field>
  );
}
