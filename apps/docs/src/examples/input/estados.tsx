import { Field, Grid, Input } from '@eds-ui/react';

export default function Estados() {
  return (
    <Grid auto>
      <Field
        label="Telefone"
        helper="Com DDD. Ex.: (11) 98765-4321"
        error="Informe o telefone com DDD."
      >
        <Input type="tel" mask="telefone" defaultValue="(11) 9876" />
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
