import { Field, Grid, Lookup, type LookupItem } from '@eds-ui/react';

const produtos: LookupItem[] = [{ code: 'P-0042', description: 'Caderno universitário 96 folhas' }];

const buscar = async (q: string) =>
  produtos.filter((p) => p.code.toLowerCase() === q.trim().toLowerCase());

export default function Estados() {
  return (
    <Grid auto>
      <Field label="Produto (resolvido)">
        <Lookup search={buscar} defaultValue="P-0042" buttonLabel="Buscar produto" />
      </Field>
      <Field label="Produto (inexistente)">
        <Lookup search={buscar} defaultValue="P-9999" buttonLabel="Buscar produto" />
      </Field>
    </Grid>
  );
}
