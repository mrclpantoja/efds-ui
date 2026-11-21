import { Field, Grid, Input } from '@efds-ui/react';

export default function MascaraDocumentos() {
  return (
    <Grid auto>
      <Field label="Telefone" helper="Com DDD. Ex.: (11) 98765-4321">
        <Input type="tel" name="telefone" mask="telefone" />
      </Field>
      <Field label="CPF" helper="Só números. Ex.: 123.456.789-00">
        <Input name="cpf" mask="cpf" />
      </Field>
      <Field label="CNPJ" helper="Aceita letras nas 12 primeiras posições. Ex.: 12.ABC.345/01DE-35">
        <Input name="cnpj" mask="cnpj" />
      </Field>
      <Field label="CPF ou CNPJ" helper="O formato muda sozinho a partir do 12º caractere.">
        <Input name="documento" mask="cpf-cnpj" />
      </Field>
      <Field label="CEP" helper="Ex.: 90000-000">
        <Input name="cep" mask="cep" />
      </Field>
    </Grid>
  );
}
