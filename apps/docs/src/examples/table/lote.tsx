import { useRef, useState } from 'react';
import {
  Button,
  Checkbox,
  Table,
  TableBody,
  TableBulkBar,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  useDialog,
} from '@efds-ui/react';

const pedidos = [
  { id: 'PED-0001', cliente: 'Atelier Exemplo', total: 'R$ 1.280,50' },
  { id: 'PED-0002', cliente: 'Comércio Modelo', total: 'R$ 459,00' },
  { id: 'PED-0003', cliente: 'Oficina Fictícia', total: 'R$ 8.920,90' },
  { id: 'PED-0004', cliente: 'Mercado Teste', total: 'R$ 312,25' },
];

const TOTAL_NO_SERVIDOR = 248;

export default function Lote() {
  const [linhas, setLinhas] = useState(pedidos);
  const [marcados, setMarcados] = useState<string[]>([]);
  const [escopo, setEscopo] = useState<'page' | 'all'>('page');
  const todos = useRef<HTMLInputElement>(null);
  const { confirm } = useDialog();

  const alternar = (id: string, marcado: boolean) => {
    setEscopo('page');
    setMarcados((atual) => (marcado ? [...atual, id] : atual.filter((m) => m !== id)));
  };

  return (
    <div className="eds-stack eds-gap-3">
      <Table caption="Pedidos com ações em lote">
        <TableHead>
          <TableRow>
            <TableHeaderCell column="check">
              <Checkbox
                ref={todos}
                aria-label="Selecionar todos desta página"
                checked={marcados.length === linhas.length && linhas.length > 0}
                indeterminate={marcados.length > 0 && marcados.length < linhas.length}
                onChange={(e) => {
                  setEscopo('page');
                  setMarcados(e.target.checked ? linhas.map((l) => l.id) : []);
                }}
              />
            </TableHeaderCell>
            <TableHeaderCell>Código</TableHeaderCell>
            <TableHeaderCell>Cliente</TableHeaderCell>
            <TableHeaderCell numeric>Total</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {linhas.map((p) => (
            <TableRow key={p.id}>
              <TableCell column="check">
                <Checkbox
                  aria-label={`Selecionar ${p.id}`}
                  checked={marcados.includes(p.id)}
                  onChange={(e) => alternar(p.id, e.target.checked)}
                />
              </TableCell>
              <TableCell>{p.id}</TableCell>
              <TableCell>{p.cliente}</TableCell>
              <TableCell numeric>{p.total}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <TableBulkBar
        count={marcados.length}
        total={TOTAL_NO_SERVIDOR}
        scope={escopo}
        returnFocusTo={todos}
        onClear={() => {
          setMarcados([]);
          setEscopo('page');
        }}
        onSelectAllResults={() => setEscopo('all')}
      >
        <Button size="sm" variant="secondary" onClick={() => setMarcados([])}>
          Arquivar
        </Button>
        <Button
          size="sm"
          variant="danger"
          onClick={async () => {
            if (await confirm('Excluir os itens selecionados?')) {
              setLinhas((atual) => atual.filter((l) => !marcados.includes(l.id)));
              setMarcados([]);
            }
          }}
        >
          Excluir
        </Button>
      </TableBulkBar>
    </div>
  );
}
