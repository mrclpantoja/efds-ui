import { useState } from 'react';
import { Checkbox, Field, Input, Select, Stack } from '@efds-ui/react';

/**
 * No React o padrão é o estado: o que não deve aparecer nem ir no envio simplesmente não é
 * renderizado. Não há API nova.
 */
export default function Basico() {
  const [tipo, setTipo] = useState('pf');
  const [outro, setOutro] = useState(false);
  return (
    <form onSubmit={(event) => event.preventDefault()}>
      <Stack gap={4}>
        <Field label="Tipo de pessoa">
          <Select name="tipo" value={tipo} onChange={(event) => setTipo(event.target.value)}>
            <option value="pf">Pessoa física</option>
            <option value="pj">Pessoa jurídica</option>
          </Select>
        </Field>
        {tipo === 'pj' && (
          <Field label="Razão social" required>
            <Input name="razao" />
          </Field>
        )}
        {tipo === 'pf' && (
          <Field label="Nome completo">
            <Input name="nome" autoComplete="name" />
          </Field>
        )}
        <Checkbox name="outro" checked={outro} onChange={(event) => setOutro(event.target.checked)}>
          Informar contato alternativo
        </Checkbox>
        {outro && (
          <Field label="E-mail alternativo">
            <Input name="contato" type="email" autoComplete="email" />
          </Field>
        )}
      </Stack>
    </form>
  );
}
