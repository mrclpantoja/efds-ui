import { Field, Grid, NumberInput } from '@efds-ui/react';

export default function Estados() {
  return (
    <Grid auto>
      <Field label="Pequeno">
        <NumberInput size="sm" defaultValue={3} />
      </Field>
      <Field label="Grande">
        <NumberInput size="lg" defaultValue={3} />
      </Field>
      <Field label="Com casas decimais (passo 0,5)">
        <NumberInput defaultValue={1.5} step={0.5} min={0} max={20} decimals={2} />
      </Field>
      <Field label="Com erro (no máximo)" error="O máximo é 99.">
        <NumberInput defaultValue={99} max={99} />
      </Field>
      <Field label="Desabilitado">
        <NumberInput defaultValue={0} disabled />
      </Field>
    </Grid>
  );
}
