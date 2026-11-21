import { Field, Grid, Textarea } from '@efds-ui/react';

export default function Basico() {
  return (
    <Grid auto>
      <Field label="Observações" helper="Máximo de 500 caracteres.">
        <Textarea placeholder="Detalhes adicionais" />
      </Field>
      <Field label="Justificativa" required error="A justificativa é obrigatória.">
        <Textarea />
      </Field>
      <Field label="Texto fixo">
        <Textarea readOnly defaultValue="Conteúdo fixo." />
      </Field>
    </Grid>
  );
}
