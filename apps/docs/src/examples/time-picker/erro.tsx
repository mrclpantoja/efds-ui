import { Field, TimePicker } from '@efds-ui/react';

export default function Erro() {
  return (
    <Field label="Término" error="Escolha um horário entre 08:00 e 18:00.">
      <TimePicker name="fim" min="08:00" max="18:00" defaultValue="19:30" />
    </Field>
  );
}
