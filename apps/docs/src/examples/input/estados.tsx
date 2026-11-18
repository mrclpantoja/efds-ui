import { Field, Grid, Input } from '@eds-ui/react';

export default function Estados() {
  return (
    <Grid auto>
      <Field label="Telefone" error="Informe o telefone com DDD.">
        <Input type="tel" autoComplete="tel" defaultValue="1234" />
      </Field>
      <Field label="Código" success="Código disponível.">
        <Input defaultValue="PRJ-0042" />
      </Field>
      <Field label="Matrícula">
        <Input defaultValue="000123" readOnly />
      </Field>
      <Field label="Setor">
        <Input defaultValue="Financeiro" disabled />
      </Field>
    </Grid>
  );
}
