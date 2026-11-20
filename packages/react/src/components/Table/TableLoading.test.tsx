import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Table, TableBody, TableHead, TableHeaderCell, TableLoadingRows, TableRow } from './Table';

function Demo({ loading, overlay }: { loading?: boolean; overlay?: boolean }) {
  return (
    <Table caption="Pedidos" loading={loading} loadingOverlay={overlay}>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Código</TableHeaderCell>
          <TableHeaderCell numeric>Total</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {loading ? <TableLoadingRows columns={2} rows={2} numeric={[1]} /> : null}
      </TableBody>
    </Table>
  );
}

describe('Table carregando', () => {
  it('loading marca aria-busy e anuncia numa região que já existia', () => {
    const { rerender } = render(<Demo loading={false} />);
    const table = document.querySelector('table') as HTMLElement;
    expect(table).not.toHaveAttribute('aria-busy');
    const region = screen.getByRole('status');
    expect(region).toBeEmptyDOMElement();
    rerender(<Demo loading />);
    expect(table).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status')).toBe(region);
    expect(region).toHaveTextContent('Carregando');
  });

  it('sem a prop loading não há região de status', () => {
    render(<Demo />);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('TableLoadingRows emite linhas Skeleton alinhadas às colunas', () => {
    render(<Demo loading />);
    const rows = document.querySelectorAll('tr.eds-table-loading');
    expect(rows).toHaveLength(2);
    expect(rows[0]?.querySelectorAll('td .eds-skeleton')).toHaveLength(2);
    expect(rows[0]?.children[1]).toHaveClass('eds-table-num');
  });

  it('loadingOverlay acrescenta o Spinner decorativo só enquanto carrega', () => {
    const { rerender } = render(<Demo loading overlay />);
    expect(
      document.querySelector('.eds-table-wrap > .eds-table-overlay .eds-spinner'),
    ).not.toBeNull();
    rerender(<Demo loading={false} overlay />);
    expect(document.querySelector('.eds-table-overlay')).toBeNull();
  });

  it('com a sobreposição, a tabela fica inert e o foco volta ao sair', async () => {
    const { rerender } = render(
      <div>
        <Table caption="Pedidos" loading={false} loadingOverlay>
          <TableBody>
            <TableRow>
              <td>
                <button type="button">Abrir</button>
              </td>
            </TableRow>
          </TableBody>
        </Table>
      </div>,
    );
    const button = screen.getByRole('button', { name: 'Abrir' });
    button.focus();
    expect(button).toHaveFocus();
    const again = (loading: boolean) =>
      rerender(
        <div>
          <Table caption="Pedidos" loading={loading} loadingOverlay>
            <TableBody>
              <TableRow>
                <td>
                  <button type="button">Abrir</button>
                </td>
              </TableRow>
            </TableBody>
          </Table>
        </div>,
      );
    again(true);
    const table = document.querySelector('table');
    expect(table).toHaveAttribute('inert');
    // jsdom não implementa inert: simula a perda de foco que o navegador faz.
    button.blur();
    again(false);
    expect(table).not.toHaveAttribute('inert');
    expect(button).toHaveFocus();
  });

  it('texts.loading troca o anúncio', () => {
    render(
      <Table caption="Orders" loading texts={{ loading: 'Loading orders' }}>
        <TableBody>{null}</TableBody>
      </Table>,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Loading orders');
  });
});
