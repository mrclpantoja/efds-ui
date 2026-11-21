import { Field, Grid, Select } from '@efds-ui/react';

export default function Basico() {
  return (
    <Grid auto>
      <Field label="Departamento" required>
        <Select defaultValue="">
          <option value="" disabled>
            Selecione
          </option>
          <option>Compras</option>
          <option>Financeiro</option>
          <option>Tecnologia</option>
        </Select>
      </Field>
      <Field label="Prioridade" error="Escolha uma prioridade.">
        <Select defaultValue="">
          <option value="">Selecione</option>
          <option>Alta</option>
          <option>Baixa</option>
        </Select>
      </Field>
      <Field label="Região">
        <Select disabled>
          <option>Sudeste</option>
        </Select>
      </Field>
    </Grid>
  );
}
