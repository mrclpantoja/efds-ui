import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from './Table';
import { sortTableData, filterTableData } from './data';
import type { TableSortState } from './tableContext';

function Demo({ mode = true, max }: { mode?: true | 'add'; max?: number }) {
  const [sort, setSort] = useState<TableSortState[]>([]);
  return (
    <>
      <p data-testid="sort">{JSON.stringify(sort)}</p>
      <Table caption="Pedidos" multiSort={mode} sortMax={max} sort={sort} onSortChange={setSort}>
        <TableHead>
          <TableRow>
            <TableHeaderCell sortKey="cliente">Cliente</TableHeaderCell>
            <TableHeaderCell sortKey="total" numeric>
              Total
            </TableHeaderCell>
            <TableHeaderCell sortKey="data">Data</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>Ana</TableCell>
            <TableCell numeric>1</TableCell>
            <TableCell>x</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </>
  );
}

const sorted = () => JSON.parse(screen.getByTestId('sort').textContent ?? '[]') as TableSortState[];
const th = (name: string) => screen.getByRole('columnheader', { name: new RegExp(name) });

describe('ordenação múltipla', () => {
  it('clique substitui; Shift+clique acrescenta; ordem e aria-sort só no primário', async () => {
    const user = userEvent.setup();
    render(<Demo />);
    await user.click(screen.getByRole('button', { name: /^Cliente/ }));
    expect(sorted()).toEqual([{ column: 'cliente', direction: 'ascending' }]);
    await user.keyboard('{Shift>}');
    await user.click(screen.getByRole('button', { name: /^Total/ }));
    await user.keyboard('{/Shift}');
    expect(sorted().map((c) => c.column)).toEqual(['cliente', 'total']);
    expect(th('Cliente')).toHaveAttribute('aria-sort', 'ascending');
    expect(th('Total')).not.toHaveAttribute('aria-sort');
    expect(th('Total')).toHaveAttribute('data-eds-sort-order', '2');
    expect(th('Total').querySelector('.eds-table-sort-order')).toHaveTextContent('2');
    expect(th('Total')).toHaveTextContent(', critério 2, crescente');
    expect(th('Data')).toHaveAttribute('aria-sort', 'none');
    // Clique simples substitui tudo.
    await user.click(screen.getByRole('button', { name: /^Data/ }));
    expect(sorted()).toEqual([{ column: 'data', direction: 'ascending' }]);
  });

  it('Shift+Enter e Shift+Espaço acrescentam; alterna e depois remove', async () => {
    const user = userEvent.setup();
    render(<Demo />);
    await user.click(screen.getByRole('button', { name: /^Cliente/ }));
    screen.getByRole('button', { name: /^Total/ }).focus();
    await user.keyboard('{Shift>}{Enter}{/Shift}');
    expect(sorted().map((c) => c.column)).toEqual(['cliente', 'total']);
    await user.keyboard('{Shift>}{Enter}{/Shift}');
    expect(sorted()[1]).toEqual({ column: 'total', direction: 'descending' });
    await user.keyboard('{Shift>} {/Shift}');
    expect(sorted().map((c) => c.column)).toEqual(['cliente']);
    expect(screen.getByRole('status')).toHaveTextContent('Ordenação por Total removida.');
  });

  it('anuncia a ordenação completa e respeita o máximo', async () => {
    const user = userEvent.setup();
    render(<Demo max={2} />);
    await user.click(screen.getByRole('button', { name: /^Cliente/ }));
    await user.keyboard('{Shift>}');
    await user.click(screen.getByRole('button', { name: /^Total/ }));
    expect(
      await screen.findByText('Ordenado por Cliente, crescente, depois Total, crescente.'),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: /^Data/ }));
    await user.keyboard('{/Shift}');
    expect(sorted()).toHaveLength(2);
    expect(await screen.findByText('Máximo de 2 colunas na ordenação.')).toBeVisible();
  });

  it('modo add: todo clique acrescenta; os botões trazem a dica de Shift só no modo shift', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Demo mode="add" />);
    await user.click(screen.getByRole('button', { name: /^Cliente/ }));
    await user.click(screen.getByRole('button', { name: /^Total/ }));
    expect(sorted().map((c) => c.column)).toEqual(['cliente', 'total']);
    expect(screen.getByRole('button', { name: /^Cliente/ })).not.toHaveAttribute(
      'aria-describedby',
    );
    unmount();
    render(<Demo />);
    const button = screen.getByRole('button', { name: /^Cliente/ });
    expect(button).toHaveAccessibleDescription('Shift mais Enter acrescenta a coluna à ordenação.');
  });
});

describe('sortTableData e filterTableData avançados', () => {
  const rows = [
    { cliente: 'Bia', total: 10, situacao: 'Pago' },
    { cliente: 'Ana', total: 20, situacao: 'Pendente' },
    { cliente: 'Ana', total: 5, situacao: 'Pago' },
  ];
  it('ordena por lista de critérios', () => {
    const out = sortTableData(rows, [
      { column: 'cliente', direction: 'ascending' },
      { column: 'total', direction: 'descending' },
    ]);
    expect(out.map((r) => r.total)).toEqual([20, 5, 10]);
  });
  it('filtra por colunas em E com a busca', () => {
    expect(
      filterTableData(rows, 'ana', { filters: { situacao: ['Pago'] } }).map((r) => r.total),
    ).toEqual([5]);
    expect(filterTableData(rows, '', { filters: { total: { gte: '10' } } })).toHaveLength(2);
    expect(
      filterTableData(rows, '', {
        filters: { alvo: 'ana' },
        getValue: (row, key) => (key === 'alvo' ? row.cliente : ''),
      }),
    ).toHaveLength(2);
  });
});
