import { Field, Input } from '@efds-ui/react';

export default function Limites() {
  return (
    <Field label="Data da reunião" helper="Escolha uma data de 2026." required>
      <Input type="date" name="reuniao" min="2026-01-01" max="2026-12-31" />
    </Field>
  );
}
