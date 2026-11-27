import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { FilterValue } from '@efds-ui/behavior/export';
import { Table, TableHead, TableHeaderCell, TableRow } from './Table';
import { TableColumnFilter, type TableColumnFilterProps } from './TableColumnFilter';

function Demo(
  props: Partial<TableColumnFilterProps> & { onApply?: (v: FilterValue | null) => void },
) {
  const [value, setValue] = useState<FilterValue | null>(null);
  return (
    <Table caption="Pedidos">
      <TableHead>
        <TableRow>
          <TableHeaderCell
            columnId="total"
            filter={
              <TableColumnFilter
                type="number"
                label="Total"
                value={value}
                onValueChange={(v) => {
                  setValue(v);
                  props.onApply?.(v);
                }}
                {...props}
              />
            }
          >
            Total
          </TableHeaderCell>
        </TableRow>
      </TableHead>
    </Table>
  );
}

// jsdom esconde [popover] fechado: os testes exercitam o conteúdo do painel como se estivesse aberto.
beforeAll(() => {
  const style = document.createElement('style');
  style.textContent = '[popover] { display: block !important; }';
  document.head.append(style);
});

describe('TableColumnFilter', () => {
  it('número: aplica faixa, marca ativo e limpa', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    render(<Demo onApply={onApply} />);
    const button = screen.getByRole('button', { name: 'Filtrar Total' });
    expect(button).toHaveClass('eds-table-filter-btn');
    expect(button).not.toHaveAttribute('data-active');
    await user.type(screen.getByLabelText('Mínimo'), '100');
    await user.type(screen.getByLabelText('Máximo'), '500{Enter}');
    expect(onApply).toHaveBeenLastCalledWith({ gte: '100', lte: '500' });
    expect(screen.getByRole('button', { name: 'Filtrar Total, filtro ativo' })).toHaveAttribute(
      'data-active',
    );
    await user.click(screen.getByRole('button', { name: 'Limpar' }));
    expect(onApply).toHaveBeenLastCalledWith(null);
    expect(screen.getByRole('button', { name: 'Filtrar Total' })).not.toHaveAttribute(
      'data-active',
    );
  });

  it('faixa invertida mostra o erro e não aplica', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    render(<Demo onApply={onApply} />);
    await user.type(screen.getByLabelText('Mínimo'), '500');
    await user.type(screen.getByLabelText('Máximo'), '100{Enter}');
    expect(onApply).not.toHaveBeenCalled();
    expect(screen.getByText('O valor inicial não pode ser maior que o final.')).toHaveClass(
      'eds-error',
    );
    expect(screen.getByLabelText('Máximo')).toHaveAttribute('aria-invalid', 'true');
  });

  it('texto e seleção múltipla; o painel é um popover com nome', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    const { unmount } = render(<Demo type="text" onApply={onApply} />);
    expect(screen.getByRole('dialog', { name: 'Filtrar Total', hidden: true })).toHaveAttribute(
      'popover',
    );
    await user.type(screen.getByRole('searchbox', { name: 'Total' }), 'ana{Enter}');
    expect(onApply).toHaveBeenLastCalledWith('ana');
    unmount();
    render(
      <Demo
        type="select"
        multiple
        options={[
          { value: 'pago', label: 'Pago' },
          { value: 'pendente', label: 'Pendente' },
        ]}
        onApply={onApply}
      />,
    );
    await user.click(screen.getByRole('checkbox', { name: 'Pago' }));
    await user.click(screen.getByRole('checkbox', { name: 'Pendente' }));
    await user.click(screen.getByRole('button', { name: 'Aplicar' }));
    expect(onApply).toHaveBeenLastCalledWith(['pago', 'pendente']);
  });

  it('data e select simples', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    const { unmount } = render(<Demo type="date" onApply={onApply} />);
    await user.type(screen.getByLabelText('De'), '2026-01-01');
    await user.click(screen.getByRole('button', { name: 'Aplicar' }));
    expect(onApply).toHaveBeenLastCalledWith({ gte: '2026-01-01' });
    unmount();
    render(<Demo type="select" options={[{ value: 'a', label: 'A' }]} onApply={onApply} />);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Total' }), 'a');
    await user.click(screen.getByRole('button', { name: 'Aplicar' }));
    expect(onApply).toHaveBeenLastCalledWith(['a']);
  });

  it('voltar ao valor aplicado: o rascunho não aplicado é descartado quando o valor muda', async () => {
    const user = userEvent.setup();
    render(<Demo />);
    await user.type(screen.getByLabelText('Mínimo'), '7{Enter}');
    expect(screen.getByLabelText('Mínimo')).toHaveValue('7');
    await user.clear(screen.getByLabelText('Mínimo'));
    await user.type(screen.getByLabelText('Mínimo'), '9');
    expect(screen.getByLabelText('Mínimo')).toHaveValue('9');
  });
});
