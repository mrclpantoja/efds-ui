import { Field, Lookup, type LookupItem } from '@efds-ui/react';

// Dados fictícios. Num sistema real, `search` e `resolve` chamam a sua API.
const clientes: LookupItem[] = [
  { code: '10', description: 'Aurora Comércio Ltda.', cidade: 'Pelotas' },
  { code: '11', description: 'Boreal Serviços', cidade: 'Rio Grande' },
  { code: '12', description: 'Cedro Alimentos', cidade: 'Bagé' },
  { code: '13', description: 'Delta Transportes', cidade: 'Santa Maria' },
];

const norm = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

async function buscar(q: string): Promise<LookupItem[]> {
  await new Promise((r) => setTimeout(r, 150));
  const texto = norm(q.trim());
  return clientes.filter(
    (c) => texto === '' || norm(`${c.code} ${c.description} ${c.cidade}`).includes(texto),
  );
}

export default function Basico() {
  return (
    <Field label="Cliente">
      <Lookup
        name="cliente"
        search={buscar}
        buttonLabel="Buscar cliente"
        columns={[
          { key: 'code', label: 'Código' },
          { key: 'description', label: 'Descrição' },
          { key: 'cidade', label: 'Cidade' },
        ]}
      />
    </Field>
  );
}
