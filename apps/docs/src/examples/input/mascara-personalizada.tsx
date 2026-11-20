import { Field, Grid, Input } from '@eds-ui/react';

export default function MascaraPersonalizada() {
  return (
    <Grid auto>
      <Field
        label="Placa do veículo"
        helper="3 letras, 1 número, 1 letra ou número e 2 números. Ex.: ABC-1D23"
      >
        <Input name="placa" mask="AAA-0*00" />
      </Field>
      <Field label="Número do processo" helper="Só números. Ex.: 0001234-56.2026">
        <Input name="processo" mask="0000000-00.0000" />
      </Field>
    </Grid>
  );
}
