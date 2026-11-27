import { useMemo, useState } from 'react';
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableToolbar,
  sortTableData,
  type TableSortState,
} from '@efds-ui/react';

const pedidos = [
  { codigo: 'PED-0001', cliente: 'Atelier Exemplo', situacao: 'Pago', total: 1280.5 },
  { codigo: 'PED-0002', cliente: 'Comércio Modelo', situacao: 'Pendente', total: 459 },
  { codigo: 'PED-0003', cliente: 'Atelier Exemplo', situacao: 'Pago', total: 8920.9 },
  { codigo: 'PED-0004', cliente: 'Mercado Teste', situacao: 'Pago', total: 312.25 },
  { codigo: 'PED-0005', cliente: 'Comércio Modelo', situacao: 'Pago', total: 2140 },
  { codigo: 'PED-0006', cliente: 'Mercado Teste', situacao: 'Pendente', total: 75 },
];

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export default function MultiOrdenacao() {
  const [ordem, setOrdem] = useState<TableSortState[]>([
    { column: 'cliente', direction: 'ascending' },
    { column: 'total', direction: 'descending' },
  ]);
  const linhas = useMemo(() => sortTableData(pedidos, ordem), [ordem]);

  return (
    <div className="eds-stack eds-gap-3">
      <TableToolbar>
        <span>Pedidos recentes</span>
        <Button variant="ghost" size="sm" onClick={() => setOrdem([])}>
          Remover ordenação
        </Button>
      </TableToolbar>
      <Table
        caption="Pedidos recentes, com ordenação por mais de uma coluna"
        multiSort
        sortMax={3}
        sort={ordem}
        onSortChange={setOrdem}
      >
        <TableHead>
          <TableRow>
            <TableHeaderCell sortKey="codigo">Código</TableHeaderCell>
            <TableHeaderCell sortKey="cliente">Cliente</TableHeaderCell>
            <TableHeaderCell sortKey="situacao">Situação</TableHeaderCell>
            <TableHeaderCell sortKey="total" numeric>
              Total
            </TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {linhas.map((p) => (
            <TableRow key={p.codigo}>
              <TableCell>{p.codigo}</TableCell>
              <TableCell>{p.cliente}</TableCell>
              <TableCell>{p.situacao}</TableCell>
              <TableCell numeric>{moeda.format(p.total)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
