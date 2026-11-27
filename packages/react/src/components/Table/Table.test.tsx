import { createRef, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableFooter,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableToolbar,
  type TableAriaSort,
} from './Table';

function Demo({ onSort }: { onSort?: (key: string) => void }) {
  return (
    <>
      <TableToolbar data-testid="toolbar">Busca</TableToolbar>
      <Table caption="Pedidos recentes" sticky>
        <TableHead>
          <TableRow>
            <TableHeaderCell column="check">
              <input type="checkbox" aria-label="Selecionar todos" />
            </TableHeaderCell>
            <TableHeaderCell sort="ascending" onSort={() => onSort?.('code')}>
              Código
            </TableHeaderCell>
            <TableHeaderCell sort="none" onSort={() => onSort?.('client')}>
              Cliente
            </TableHeaderCell>
            <TableHeaderCell>Situação</TableHeaderCell>
            <TableHeaderCell numeric>Total</TableHeaderCell>
            <TableHeaderCell column="actions">
              <span className="eds-visually-hidden">Ações</span>
            </TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell column="check">
              <input type="checkbox" aria-label="Selecionar PED-0001" />
            </TableCell>
            <TableCell>PED-0001</TableCell>
            <TableCell>Atelier Exemplo</TableCell>
            <TableCell>Pago</TableCell>
            <TableCell numeric>R$ 10,00</TableCell>
            <TableCell column="actions">
              <button type="button">Editar</button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <TableFooter data-testid="footer">1–1 de 1</TableFooter>
    </>
  );
}

describe('Table', () => {
  it('monta wrap, tabela, caption oculto e células com as classes do core', () => {
    const tableRef = createRef<HTMLTableElement>();
    const wrapRef = createRef<HTMLDivElement>();
    render(
      <Table
        ref={tableRef}
        wrapRef={wrapRef}
        wrapClassName="altura"
        className="extra"
        caption="Pedidos"
      >
        <TableBody>
          <TableRow>
            <TableCell>x</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    const table = screen.getByRole('table', { name: 'Pedidos' });
    expect(table).toHaveClass('eds-table', 'extra');
    expect(table).not.toHaveClass('eds-table-sticky');
    expect(tableRef.current).toBe(table);
    expect(wrapRef.current).toHaveClass('eds-table-wrap', 'altura');
    expect(wrapRef.current).toContainElement(table);
    expect(table.querySelector('caption')).toHaveClass('eds-table-caption', 'eds-visually-hidden');
  });

  it('caption visível com captionHidden={false}', () => {
    render(<Table caption="Pedidos" captionHidden={false} />);
    expect(screen.getByText('Pedidos')).not.toHaveClass('eds-visually-hidden');
  });

  it('colunas especiais, numérica, sticky, toolbar e footer', () => {
    render(<Demo />);
    expect(screen.getByRole('table')).toHaveClass('eds-table-sticky');
    expect(screen.getByRole('columnheader', { name: 'Total' })).toHaveClass('eds-table-num');
    expect(screen.getByRole('cell', { name: 'R$ 10,00' })).toHaveClass('eds-table-num');
    expect(screen.getByRole('cell', { name: 'Editar' })).toHaveClass('eds-table-actions');
    expect(screen.getByLabelText('Selecionar PED-0001').closest('td')).toHaveClass(
      'eds-table-check',
    );
    // O checkbox da seleção vai num label que amplia o alvo (o nome continua o aria-label).
    expect(screen.getByLabelText('Selecionar PED-0001').parentElement).toHaveClass('eds-check');
    expect(screen.getByLabelText('Selecionar todos').parentElement?.tagName).toBe('LABEL');
    expect(screen.getByTestId('toolbar')).toHaveClass('eds-table-toolbar');
    expect(screen.getByTestId('footer')).toHaveClass('eds-table-footer');
    expect(screen.getByRole('columnheader', { name: 'Situação' })).toHaveAttribute('scope', 'col');
  });

  it('coluna ordenável: aria-sort no th, botão com ícone e onSort', async () => {
    const user = userEvent.setup();
    const onSort = vi.fn();
    render(<Demo onSort={onSort} />);
    const code = screen.getByRole('columnheader', { name: 'Código' });
    expect(code).toHaveAttribute('aria-sort', 'ascending');
    const button = screen.getByRole('button', { name: 'Código' });
    expect(button).toHaveClass('eds-table-sort');
    expect(button.querySelector('svg.eds-table-sort-icon .eds-table-sort-up')).not.toBeNull();
    expect(button.querySelector('svg .eds-table-sort-down')).not.toBeNull();
    expect(screen.getByRole('columnheader', { name: 'Cliente' })).toHaveAttribute(
      'aria-sort',
      'none',
    );
    expect(screen.getByRole('columnheader', { name: 'Situação' })).not.toHaveAttribute('aria-sort');
    expect(screen.queryByRole('button', { name: 'Situação' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Cliente' }));
    expect(onSort).toHaveBeenCalledWith('client');
    button.focus();
    await user.keyboard('{Enter}');
    expect(onSort).toHaveBeenLastCalledWith('code');
  });

  it('ordenação controlada atualiza aria-sort', async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [sort, setSort] = useState<TableAriaSort>('none');
      return (
        <Table caption="t">
          <TableHead>
            <TableRow>
              <TableHeaderCell
                sort={sort}
                onSort={() => setSort(sort === 'ascending' ? 'descending' : 'ascending')}
              >
                Nome
              </TableHeaderCell>
            </TableRow>
          </TableHead>
        </Table>
      );
    }
    render(<Controlled />);
    const th = screen.getByRole('columnheader', { name: 'Nome' });
    await user.click(screen.getByRole('button', { name: 'Nome' }));
    expect(th).toHaveAttribute('aria-sort', 'ascending');
    await user.click(screen.getByRole('button', { name: 'Nome' }));
    expect(th).toHaveAttribute('aria-sort', 'descending');
  });

  it('TableEmpty ocupa as colunas', () => {
    render(
      <Table caption="Vazia">
        <TableBody>
          <TableEmpty colSpan={4}>Nada aqui</TableEmpty>
        </TableBody>
      </Table>,
    );
    const cell = screen.getByRole('cell', { name: 'Nada aqui' });
    expect(cell).toHaveClass('eds-table-empty');
    expect(cell).toHaveAttribute('colspan', '4');
  });
});

describe('Table: região rolável', () => {
  const original = globalThis.ResizeObserver;
  afterEach(() => {
    globalThis.ResizeObserver = original;
    vi.restoreAllMocks();
  });

  function mockScroll(scrolls: boolean) {
    let callback: () => void = () => {};
    globalThis.ResizeObserver = class {
      constructor(cb: () => void) {
        callback = cb;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(() =>
      scrolls ? 800 : 100,
    );
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => 100);
    return () => callback();
  }

  it('só rola: ganha tabindex, role=region e aria-labelledby do caption', () => {
    mockScroll(true);
    const wrapRef = createRef<HTMLDivElement>();
    render(<Table caption="Pedidos" wrapRef={wrapRef} />);
    const wrap = wrapRef.current as HTMLDivElement;
    expect(wrap).toHaveAttribute('tabindex', '0');
    expect(wrap).toHaveAttribute('role', 'region');
    expect(wrap).toHaveAccessibleName('Pedidos');
  });

  it('sem rolagem: nada é aplicado e é removido se deixar de rolar', () => {
    mockScroll(false);
    const wrapRef = createRef<HTMLDivElement>();
    render(<Table caption="Pedidos" wrapRef={wrapRef} />);
    const wrap = wrapRef.current as HTMLDivElement;
    expect(wrap).not.toHaveAttribute('tabindex');
    expect(wrap).not.toHaveAttribute('role');
    expect(wrap).not.toHaveAttribute('aria-labelledby');
  });
});
