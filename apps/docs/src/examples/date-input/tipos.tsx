import { Field, Grid, Input } from '@efds-ui/react';

export default function Tipos() {
  return (
    <Grid auto>
      <Field label="Data">
        <Input type="date" name="data" defaultValue="2026-03-15" />
      </Field>
      <Field label="Hora">
        <Input type="time" name="hora" defaultValue="14:30" />
      </Field>
      <Field label="Data e hora">
        <Input type="datetime-local" name="reuniao" defaultValue="2026-03-15T14:30" />
      </Field>
      <Field label="Competência">
        <Input type="month" name="competencia" defaultValue="2026-03" />
      </Field>
    </Grid>
  );
}
