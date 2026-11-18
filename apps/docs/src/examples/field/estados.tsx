import { Field, Grid, Input, Select } from '@eds-ui/react';

export default function Estados() {
  return (
    <Grid auto>
      {/* `error` marca o controle com aria-invalid e o liga à mensagem. */}
      <Field label="E-mail" error="Informe um e-mail válido, como nome@exemplo.com.br.">
        <Input type="email" autoComplete="email" inputMode="email" defaultValue="maria.exemplo@" />
      </Field>
      <Field label="Código" success="Código disponível.">
        <Input defaultValue="PRJ-0042" />
      </Field>
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
    </Grid>
  );
}
