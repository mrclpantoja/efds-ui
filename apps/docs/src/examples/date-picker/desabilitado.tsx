import { DatePicker, Field } from '@efds-ui/react';

export default function Desabilitado() {
  return (
    <Field label="Data de encerramento">
      <DatePicker name="encerramento" defaultValue="2026-03-15" disabled />
    </Field>
  );
}
