import { useState } from 'react';
import { Alert, Button, Field, Lookup, type LookupItem } from '@efds-ui/react';

// Dados fictícios. Num sistema real, `search` e `resolve` chamam a sua API.
const base: LookupItem[] = [
  { code: '10', description: 'Aurora Comércio Ltda.' },
  { code: '11', description: 'Boreal Serviços' },
];

const norm = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

export default function Cadastrar() {
  const [clientes, setClientes] = useState(base);
  const [codigo, setCodigo] = useState('');
  const [novo, setNovo] = useState<string | null>(null);

  const buscar = async (q: string) => {
    const texto = norm(q.trim());
    return clientes.filter((c) => norm(`${c.code} ${c.description}`).includes(texto));
  };

  return (
    <div className="eds-stack eds-gap-4">
      <Field label="Cliente">
        <Lookup
          search={buscar}
          value={codigo}
          onChange={(code) => setCodigo(code)}
          buttonLabel="Buscar cliente"
          onCreate={(texto) => setNovo(texto)}
        />
      </Field>
      {novo !== null && (
        <Alert variant="info" title="Cadastro de cliente">
          <p>Aqui abriria o seu cadastro, já com o texto digitado.</p>
          <Button
            size="sm"
            onClick={() => {
              const item = { code: String(clientes.length + 10), description: novo };
              setClientes([...clientes, item]);
              setCodigo(item.code);
              setNovo(null);
            }}
          >
            Salvar “{novo}”
          </Button>
        </Alert>
      )}
    </div>
  );
}
