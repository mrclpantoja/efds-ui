import { DatePicker, Field } from '@efds-ui/react';

const feriados = ['2026-11-20', '2026-12-25', '2027-01-01'];

function toIso(date: Date): string {
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const dia = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mes}-${dia}`;
}

export default function Bloqueios() {
  return (
    <Field label="Data da entrega" helper="Dias úteis, exceto feriados.">
      <DatePicker
        name="entrega"
        disableWeekends
        isDateDisabled={(date) => feriados.includes(toIso(date))}
      />
    </Field>
  );
}
