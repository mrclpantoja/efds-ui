import { DateRangePicker, Field } from '@eds-ui/react';

export default function Nomes() {
  return (
    <Field label="Período de vigência">
      <DateRangePicker
        nameStart="vigencia_inicio"
        nameEnd="vigencia_fim"
        min="2026-01-01"
        max="2026-12-31"
      />
    </Field>
  );
}
