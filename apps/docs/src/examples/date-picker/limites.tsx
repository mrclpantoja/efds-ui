import { DatePicker, Field } from '@eds-ui/react';

export default function Limites() {
  return (
    <Field label="Data da reunião" helper="De 01/01/2026 a 31/12/2026.">
      <DatePicker name="reuniao" min="2026-01-01" max="2026-12-31" />
    </Field>
  );
}
