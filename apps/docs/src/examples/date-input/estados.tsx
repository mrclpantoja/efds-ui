import { Field, Grid, Input } from '@eds-ui/react';

export default function Estados() {
  return (
    <Grid auto>
      <Field label="Data de admissão" error="A data não pode ser futura.">
        <Input type="date" defaultValue="2030-01-10" />
      </Field>
      <Field label="Data de cadastro">
        <Input type="date" defaultValue="2026-02-03" readOnly />
      </Field>
      <Field label="Data de encerramento">
        <Input type="date" disabled />
      </Field>
    </Grid>
  );
}
