import { Field, Input } from '@eds-ui/react';

export default function Nativo() {
  return (
    <Field label="Horário de saída" helper="Das 08:00 às 18:00.">
      <Input type="time" name="saida" min="08:00" max="18:00" step={900} />
    </Field>
  );
}
