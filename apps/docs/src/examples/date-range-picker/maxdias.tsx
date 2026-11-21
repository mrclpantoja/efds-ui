import { DateRangePicker, Field } from '@efds-ui/react';

export default function MaxDias() {
  return (
    <Field label="Período da reserva (até 7 dias)">
      <DateRangePicker nameStart="checkin" nameEnd="checkout" maxDays={7} />
    </Field>
  );
}
