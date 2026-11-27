import { useMemo, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableColumnFilter,
  TableEmpty,
  TableHead,
  TableHeaderCell,
  TableRow,
  filterTableData,
  sortTableData,
  type TableSortState,
} from '@efds-ui/react';

type Filtro = string | string[] | { gte?: string; lte?: string };

const pedidos = [
  {
    codigo: 'PED-0001',
    cliente: 'Atelier Exemplo',
    situacao: 'Pago',
    total: 1280.5,
    data: '2026-03-15',
  },
  {
    codigo: 'PED-0002',
    cliente: 'Comércio Modelo',
    situacao: 'Pendente',
    total: 459,
    data: '2026-02-02',
  },
  {
    codigo: 'PED-0003',
    cliente: 'Oficina Fictícia',
    situacao: 'Atrasado',
    total: 8920.9,
    data: '2025-11-20',
  },
  {
    codigo: 'PED-0004',
    cliente: 'Mercado Teste',
    situacao: 'Pago',
    total: 312.25,
    data: '2026-01-08',
  },
  {
    codigo: 'PED-0005',
    cliente: 'Studio Amostra',
    situacao: 'Pendente',
    total: 75,
    data: '2026-03-01',
  },
];

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const situacoes = ['Pago', 'Pendente', 'Atrasado'].map((s) => ({ value: s, label: s }));

export default function FiltroColuna() {
  const [filtros, setFiltros] = useState<Record<string, Filtro>>({});
  const [ordem, setOrdem] = useState<TableSortState | null>(null);
  const definir = (chave: string) => (valor: Filtro | null) =>
    setFiltros((atual) => {
      const proximo = { ...atual };
      if (valor === null) delete proximo[chave];
      else proximo[chave] = valor;
      return proximo;
    });
  const linhas = useMemo(
    () => sortTableData(filterTableData(pedidos, '', { filters: filtros }), ordem),
    [filtros, ordem],
  );

  return (
    <Table
      caption="Pedidos com filtro por coluna"
      sort={ordem}
      onSortChange={setOrdem}
      status={`${linhas.length} resultados.`}
    >
      <TableHead>
        <TableRow>
          <TableHeaderCell sortKey="codigo">Código</TableHeaderCell>
          <TableHeaderCell
            sortKey="cliente"
            filter={
              <TableColumnFilter
                type="text"
                label="Cliente"
                value={filtros.cliente}
                onChange={definir('cliente')}
              />
            }
          >
            Cliente
          </TableHeaderCell>
          <TableHeaderCell
            filter={
              <TableColumnFilter
                type="select"
                multiple
                label="Situação"
                options={situacoes}
                value={filtros.situacao}
                onChange={definir('situacao')}
              />
            }
          >
            Situação
          </TableHeaderCell>
          <TableHeaderCell
            numeric
            sortKey="total"
            filter={
              <TableColumnFilter
                type="number"
                label="Total"
                value={filtros.total}
                onChange={definir('total')}
              />
            }
          >
            Total
          </TableHeaderCell>
          <TableHeaderCell
            filter={
              <TableColumnFilter
                type="date"
                label="Data"
                value={filtros.data}
                onChange={definir('data')}
              />
            }
          >
            Data
          </TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {linhas.length === 0 && (
          <TableEmpty colSpan={5}>Nenhum pedido com esses filtros.</TableEmpty>
        )}
        {linhas.map((p) => (
          <TableRow key={p.codigo}>
            <TableCell>{p.codigo}</TableCell>
            <TableCell>{p.cliente}</TableCell>
            <TableCell>{p.situacao}</TableCell>
            <TableCell numeric>{moeda.format(p.total)}</TableCell>
            <TableCell>{p.data.split('-').reverse().join('/')}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
