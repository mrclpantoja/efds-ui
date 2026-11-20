import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Input } from '../Input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  filterTableData,
  sortTableData,
  useTableFilter,
  type TableSortState,
} from './index';

const pedidos = [
  { code: 'PED-0001', cliente: 'Óleo Modelo', total: 'R$ 1.280,50', data: '15/03/2025' },
  { code: 'PED-0002', cliente: 'Atelier Exemplo', total: 'R$ 459,00', data: '02/01/2025' },
  { code: 'PED-0003', cliente: 'Comércio Teste', total: 'R$ 8.920,90', data: '20/11/2024' },
  { code: 'PED-0004', cliente: 'álamo Ltda', total: '', data: '' },
];

const codes = (rows: typeof pedidos) => rows.map((r) => r.code);

describe('sortTableData / filterTableData', () => {
  it('ordena por número, data e texto como o behavior, com vazios por último', () => {
    expect(codes(sortTableData(pedidos, { column: 'total', direction: 'ascending' }))).toEqual([
      'PED-0002',
      'PED-0001',
      'PED-0003',
      'PED-0004',
    ]);
    expect(codes(sortTableData(pedidos, { column: 'total', direction: 'descending' }))).toEqual([
      'PED-0003',
      'PED-0001',
      'PED-0002',
      'PED-0004',
    ]);
    expect(codes(sortTableData(pedidos, { column: 'data', direction: 'ascending' }))).toEqual([
      'PED-0003',
      'PED-0002',
      'PED-0001',
      'PED-0004',
    ]);
    // Sem diferenciar acento e caixa: "álamo" antes de "Atelier".
    expect(codes(sortTableData(pedidos, { column: 'cliente', direction: 'ascending' }))[0]).toBe(
      'PED-0004',
    );
  });

  it('não altera o original, aceita getValue e ordena por locale', () => {
    const copy = [...pedidos];
    sortTableData(pedidos, { column: 'code', direction: 'descending' });
    expect(pedidos).toEqual(copy);
    expect(sortTableData(pedidos, null)).toEqual(pedidos);
    const rows = [{ v: { n: 10 } }, { v: { n: 2 } }];
    const sorted = sortTableData(
      rows,
      { column: 'v', direction: 'ascending' },
      { getValue: (row) => row.v.n },
    );
    expect(sorted.map((r) => r.v.n)).toEqual([2, 10]);
    const letters = [{ a: 'ä' }, { a: 'z' }];
    expect(
      sortTableData(letters, { column: 'a', direction: 'ascending' }, { locale: 'sv-SE' }).map(
        (r) => r.a,
      ),
    ).toEqual(['z', 'ä']);
  });

  it('filtra sem acento nem caixa, nas colunas pedidas', () => {
    expect(codes(filterTableData(pedidos, 'ALAMO'))).toEqual(['PED-0004']);
    expect(filterTableData(pedidos, 'ped-0002', { columns: ['cliente'] })).toEqual([]);
    expect(filterTableData(pedidos, '  ')).toHaveLength(4);
    expect(filterTableData(pedidos, 'atelier', { getText: (r) => r.cliente })).toHaveLength(1);
  });
});

function Ordenada() {
  const [sort, setSort] = useState<TableSortState | null>(null);
  const rows = sortTableData(pedidos, sort);
  return (
    <Table caption="Pedidos" sort={sort} onSortChange={setSort}>
      <TableHead>
        <TableRow>
          <TableHeaderCell sortKey="code">Código</TableHeaderCell>
          <TableHeaderCell sortKey="cliente">Cliente</TableHeaderCell>
          <TableHeaderCell>Total</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.code}>
            <TableCell>{r.code}</TableCell>
            <TableCell>{r.cliente}</TableCell>
            <TableCell>{r.total}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

describe('Table: ordenação controlada', () => {
  it('sortKey deriva aria-sort, alterna a direção e anuncia', async () => {
    const user = userEvent.setup();
    render(<Ordenada />);
    const code = screen.getByRole('columnheader', { name: 'Código' });
    const cliente = screen.getByRole('columnheader', { name: 'Cliente' });
    expect(code).toHaveAttribute('aria-sort', 'none');
    expect(cliente).toHaveAttribute('aria-sort', 'none');
    expect(screen.getByRole('columnheader', { name: 'Total' })).not.toHaveAttribute('aria-sort');

    await user.click(screen.getByRole('button', { name: 'Cliente' }));
    expect(cliente).toHaveAttribute('aria-sort', 'ascending');
    expect(code).toHaveAttribute('aria-sort', 'none');
    expect(screen.getAllByRole('row')[1]).toHaveTextContent('álamo Ltda');
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Ordenado por Cliente, crescente.'),
    );

    await user.click(screen.getByRole('button', { name: 'Cliente' }));
    expect(cliente).toHaveAttribute('aria-sort', 'descending');
    expect(screen.getAllByRole('row')[1]).toHaveTextContent('Óleo Modelo');
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Ordenado por Cliente, decrescente.'),
    );

    // Outra coluna começa crescente.
    await user.click(screen.getByRole('button', { name: 'Código' }));
    expect(code).toHaveAttribute('aria-sort', 'ascending');
    expect(cliente).toHaveAttribute('aria-sort', 'none');
  });

  it('sem onSortChange, sortKey não faz nada (o modo manual segue valendo)', () => {
    render(
      <Table caption="x">
        <TableHead>
          <TableRow>
            <TableHeaderCell sortKey="a">A</TableHeaderCell>
            <TableHeaderCell sort="descending">B</TableHeaderCell>
          </TableRow>
        </TableHead>
      </Table>,
    );
    expect(screen.getByRole('columnheader', { name: 'A' })).not.toHaveAttribute('aria-sort');
    expect(screen.getByRole('columnheader', { name: 'B' })).toHaveAttribute(
      'aria-sort',
      'descending',
    );
    expect(screen.queryByRole('status')).toBeNull();
  });
});

function Filtrada() {
  const filter = useTableFilter(pedidos, { columns: ['code', 'cliente'] });
  return (
    <>
      <Input aria-label="Buscar pedido" type="search" {...filter.inputProps} />
      <Table caption="Pedidos" status={filter.status}>
        <TableBody>
          {filter.rows.map((r) => (
            <TableRow key={r.code}>
              <TableCell>{r.code}</TableCell>
              <TableCell>{r.cliente}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}

describe('useTableFilter', () => {
  it('filtra depois do atraso, anuncia a contagem e Esc limpa', async () => {
    const user = userEvent.setup();
    render(<Filtrada />);
    expect(screen.getAllByRole('row')).toHaveLength(4);
    await user.type(screen.getByRole('searchbox', { name: 'Buscar pedido' }), 'ATELIER');
    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(1));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('1 resultado.'));

    await user.clear(screen.getByRole('searchbox'));
    await user.type(screen.getByRole('searchbox'), 'zzz');
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Nenhum resultado.'));
    await user.keyboard('{Escape}');
    expect(screen.getByRole('searchbox')).toHaveValue('');
    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(4));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Filtro removido. 4 linhas.'),
    );
  });
});
