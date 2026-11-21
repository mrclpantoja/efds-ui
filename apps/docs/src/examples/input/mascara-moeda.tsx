import { Field, Grid, Input } from '@efds-ui/react';

export default function MascaraMoeda() {
  return (
    <Grid auto>
      <Field label="Valor" helper="Digite os números: os dois últimos são os centavos.">
        <Input name="valor" mask="moeda" />
      </Field>
      <Field label="Saldo" helper={'Aceita negativo: digite "-" para alternar o sinal.'}>
        <Input name="saldo" mask="moeda" maskOptions={{ negative: true }} />
      </Field>
      <Field label="Quantidade" helper="Número com 3 casas decimais, sem símbolo.">
        <Input name="quantidade" mask="numero" maskOptions={{ decimals: 3 }} />
      </Field>
      <Field label="Meta em dólares">
        <Input name="meta" mask="moeda" maskOptions={{ prefix: 'US$ ', decimals: 0 }} />
      </Field>
    </Grid>
  );
}
