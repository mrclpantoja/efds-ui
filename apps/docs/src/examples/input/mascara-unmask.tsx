import { useState } from 'react';
import { Field, Input, Stack } from '@eds-ui/react';

export default function MascaraUnmask() {
  const [raw, setRaw] = useState('');
  return (
    <Stack gap={3}>
      <Field label="CPF" helper="Aparece como 123.456.789-00 e o servidor recebe 12345678900.">
        <Input name="cpf" mask="cpf" unmask />
      </Field>
      <Field label="Valor" helper="Aparece como R$ 1.234,56 e o servidor recebe 1234.56.">
        <Input name="valor" mask="moeda" unmask onValueChange={(_masked, value) => setRaw(value)} />
      </Field>
      <p className="eds-text-small">
        Valor limpo do campo acima: <code>{raw === '' ? '(vazio)' : raw}</code>
      </p>
    </Stack>
  );
}
