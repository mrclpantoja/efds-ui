import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Table, TableBody, TableHead, TableHeaderCell, TableRow } from './Table';
import { TableEditableCell, type TableEditableCellProps } from './TableEditableCell';

function Demo(props: Partial<TableEditableCellProps>) {
  return (
    <>
      <Table caption="Pedidos" onSortChange={() => undefined}>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Total</TableHeaderCell>
            <TableHeaderCell>Obs</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableEditableCell
              field="total"
              value="1280,50"
              display="R$ 1.280,50"
              columnLabel="Total"
              rowLabel="PED-0001"
              onCommit={() => undefined}
              {...props}
            />
            <td>
              <button type="button">Outro</button>
            </td>
          </TableRow>
        </TableBody>
      </Table>
    </>
  );
}

const open = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('button', { name: /R\$ 1\.280,50/ }));

describe('TableEditableCell', () => {
  it('o botão contém o texto visível no nome e abre o editor com rótulo e dica', async () => {
    const user = userEvent.setup();
    render(<Demo />);
    const button = screen.getByRole('button', { name: 'R$ 1.280,50, editar Total de PED-0001' });
    expect(button).toHaveClass('eds-table-cell-edit');
    await open(user);
    const input = screen.getByRole('textbox', { name: 'Total de PED-0001' });
    expect(input).toHaveFocus();
    expect(input).toHaveValue('1280,50');
    expect(input).toHaveAccessibleDescription('Enter confirma, Esc cancela.');
    expect(input.closest('td')).toHaveAttribute('data-editing');
  });

  it('Enter confirma e o foco volta ao botão; sem mudança não chama onCommit', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<Demo onCommit={onCommit} />);
    await open(user);
    await user.keyboard('{Enter}');
    expect(onCommit).not.toHaveBeenCalled();
    await open(user);
    await user.clear(screen.getByRole('textbox'));
    await user.type(screen.getByRole('textbox'), '1300{Enter}');
    expect(onCommit).toHaveBeenCalledWith('1300', '1280,50');
    expect(screen.getByRole('button', { name: /editar Total/ })).toHaveFocus();
  });

  it('Esc cancela e restaura', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<Demo onCommit={onCommit} />);
    await open(user);
    await user.type(screen.getByRole('textbox'), '9{Escape}');
    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /R\$ 1\.280,50/ })).toHaveFocus();
  });

  it('F2 e Espaço entram em edição pelo teclado', async () => {
    const user = userEvent.setup();
    render(<Demo />);
    screen.getByRole('button', { name: /R\$ 1\.280,50/ }).focus();
    await user.keyboard('{F2}');
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('inválido: mantém a edição com o erro visível, anuncia e Tab não sai; Esc cancela', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(
      <Demo
        onCommit={onCommit}
        required
        validate={(v) => (v.includes('x') ? 'Valor inválido.' : '')}
      />,
    );
    await open(user);
    await user.type(screen.getByRole('textbox'), 'x');
    await user.keyboard('{Tab}');
    expect(onCommit).not.toHaveBeenCalled();
    const input = screen.getByRole('textbox');
    expect(input).toHaveFocus();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Valor inválido.')).toHaveClass('eds-error');
    expect(input).toHaveAccessibleDescription(/Valor inválido\./);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('Tab válido e mudado confirma e o foco segue', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<Demo onCommit={onCommit} />);
    await open(user);
    await user.type(screen.getByRole('textbox'), '0');
    await user.tab();
    expect(onCommit).toHaveBeenCalledWith('1280,500', '1280,50');
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('servidor: aria-busy e readOnly; resolve com texto; rejeita volta à edição com o erro', async () => {
    const user = userEvent.setup();
    let resolve: (v: { text: string }) => void = () => undefined;
    const onCommit = vi.fn(
      () =>
        new Promise<{ text: string }>((r) => {
          resolve = r;
        }),
    );
    render(<Demo onCommit={onCommit} />);
    await open(user);
    await user.type(screen.getByRole('textbox'), '1{Enter}');
    const cell = screen.getByRole('textbox').closest('td') as HTMLElement;
    expect(cell).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('textbox')).toHaveAttribute('readonly');
    resolve({ text: 'R$ 12.805,01' });
    expect(await screen.findByRole('button', { name: /R\$ 12\.805,01/ })).toBeInTheDocument();
    expect(
      await screen.findByText('Total de PED-0001 atualizado para R$ 12.805,01.'),
    ).toBeInTheDocument();
  });

  it('rejeição do servidor mostra o erro e mantém o foco no editor', async () => {
    const user = userEvent.setup();
    render(<Demo onCommit={() => Promise.reject(new Error('Valor acima do limite.'))} />);
    await open(user);
    await user.type(screen.getByRole('textbox'), '1{Enter}');
    expect(await screen.findByText('Valor acima do limite.')).toHaveClass('eds-error');
    expect(screen.getByRole('textbox')).toHaveFocus();
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    expect(await screen.findByText('Erro: Valor acima do limite.')).toBeInTheDocument();
  });
});
