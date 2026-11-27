import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '../Button';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from './Table';
import { TableBulkBar } from './TableBulkBar';

function Demo({ onAll }: { onAll?: () => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [scope, setScope] = useState<'page' | 'all'>('page');
  const ids = ['a', 'b', 'c'];
  return (
    <>
      <div>
        <Table caption="Itens">
          <TableHead>
            <TableRow>
              <TableHeaderCell column="check">
                <input
                  type="checkbox"
                  aria-label="Selecionar todos"
                  checked={selected.length === ids.length}
                  onChange={(e) => setSelected(e.target.checked ? ids : [])}
                />
              </TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ids.map((id) => (
              <TableRow key={id}>
                <TableCell column="check">
                  <input
                    type="checkbox"
                    aria-label={`Selecionar ${id}`}
                    checked={selected.includes(id)}
                    onChange={(e) => {
                      setScope('page');
                      setSelected(
                        e.target.checked ? [...selected, id] : selected.filter((s) => s !== id),
                      );
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <TableBulkBar
        count={selected.length}
        total={248}
        scope={scope}
        onClear={() => setSelected([])}
        onSelectAllResults={() => {
          setScope('all');
          onAll?.();
        }}
      >
        <Button size="sm" variant="secondary">
          Arquivar
        </Button>
      </TableBulkBar>
    </>
  );
}

describe('TableBulkBar', () => {
  it('fica escondida sem seleção e mostra a contagem em texto comum', async () => {
    const user = userEvent.setup();
    render(<Demo />);
    const group = document.querySelector('.eds-table-bulk') as HTMLElement;
    expect(group).toHaveAttribute('hidden');
    await user.click(screen.getByRole('checkbox', { name: 'Selecionar a' }));
    expect(screen.getByRole('group', { name: 'Ações em lote' })).not.toHaveAttribute('hidden');
    expect(within(group).getByText('1 selecionado')).toBeInTheDocument();
    expect(within(group).getByText('1 selecionado')).not.toHaveAttribute('aria-live');
    await user.click(screen.getByRole('checkbox', { name: 'Selecionar b' }));
    expect(within(group).getByText('2 selecionados')).toBeInTheDocument();
    expect(await screen.findByRole('status')).toHaveTextContent('2 selecionados');
  });

  it('"Selecionar todos os N" vira "Todos os N selecionados." e volta à página ao mudar uma linha', async () => {
    const user = userEvent.setup();
    const onAll = vi.fn();
    render(<Demo onAll={onAll} />);
    await user.click(screen.getByRole('checkbox', { name: 'Selecionar todos' }));
    await user.click(screen.getByRole('button', { name: 'Selecionar todos os 248' }));
    expect(onAll).toHaveBeenCalled();
    const bar = screen.getByRole('group', { name: 'Ações em lote' });
    expect(within(bar).getByText('Todos os 248 selecionados.')).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'Selecionar a' }));
    expect(within(bar).getByText('2 selecionados')).toBeInTheDocument();
  });

  it('limpar a seleção devolve o foco ao "selecionar todos"', async () => {
    const user = userEvent.setup();
    render(<Demo />);
    await user.click(screen.getByRole('checkbox', { name: 'Selecionar a' }));
    await user.click(screen.getByRole('button', { name: 'Limpar seleção' }));
    expect(screen.getByRole('checkbox', { name: 'Selecionar todos' })).toHaveFocus();
  });
});
