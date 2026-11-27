import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, afterEach, describe, expect, it, vi } from 'vitest';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from './Table';
import { TableColumnsMenu } from './TableColumnsMenu';
import { useTableColumns, type TableColumnDef } from './useTableColumns';

const defs: TableColumnDef[] = [
  { id: 'sel', label: 'Seleção', locked: true },
  { id: 'cliente', label: 'Cliente', pin: 'start' },
  { id: 'total', label: 'Total', defaultWidth: 120 },
  { id: 'data', label: 'Data' },
  { id: 'obs', label: 'Observação', defaultHidden: true },
  { id: 'acoes', label: 'Ações', locked: true },
];

afterEach(() => window.localStorage.clear());

// jsdom esconde [popover] fechado: os testes exercitam o conteúdo do painel como se estivesse aberto.
beforeAll(() => {
  const style = document.createElement('style');
  style.textContent = '[popover] { display: block !important; }';
  document.head.append(style);
});

describe('useTableColumns', () => {
  it('estado inicial, mover (não sai do grupo nem move locked), ocultar e redimensionar', () => {
    const { result } = renderHook(() => useTableColumns(defs));
    expect(result.current.columns.map((c) => c.id)).toEqual([
      'sel',
      'cliente',
      'total',
      'data',
      'acoes',
    ]);
    expect(result.current.state.widths).toEqual({ total: 120 });
    act(() => result.current.move('data', 2));
    expect(result.current.state.order.slice(0, 5)).toEqual([
      'sel',
      'cliente',
      'data',
      'total',
      'obs',
    ]);
    // Coluna fixa não sai do grupo: sozinha no grupo, não se move.
    act(() => result.current.move('cliente', 3));
    expect(result.current.state.order.indexOf('cliente')).toBe(1);
    act(() => result.current.move('sel', 3));
    expect(result.current.state.order[0]).toBe('sel');
    act(() => result.current.resize('total', 9999));
    expect(result.current.state.widths.total).toBe(640);
    act(() => result.current.resize('total', 10));
    expect(result.current.state.widths.total).toBe(64);
    act(() => result.current.toggle('obs', true));
    expect(result.current.columns.map((c) => c.id)).toContain('obs');
    act(() => result.current.toggle('acoes', false));
    expect(result.current.columns.map((c) => c.id)).toContain('acoes');
  });

  it('a última coluna visível não se oculta', () => {
    const { result } = renderHook(() =>
      useTableColumns([
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
      ]),
    );
    act(() => result.current.toggle('a', false));
    expect(result.current.canHide('b')).toBe(false);
    act(() => result.current.toggle('b', false));
    expect(result.current.columns.map((c) => c.id)).toEqual(['b']);
  });

  it('preferências: salva com atraso, lê ignorando ids desconhecidos, reset apaga', () => {
    vi.useFakeTimers();
    window.localStorage.setItem(
      'eds:table:t1',
      JSON.stringify({
        v: 1,
        order: ['data', 'x', 'total'],
        hidden: ['cliente', 'zzz'],
        widths: { total: 200 },
      }),
    );
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useTableColumns(defs, { prefsKey: 't1', onStateChange: onChange }),
    );
    expect(result.current.state.order.slice(0, 3)).toEqual(['data', 'total', 'sel']);
    expect(result.current.state.hidden).toEqual(['cliente']);
    expect(onChange).toHaveBeenCalledWith(expect.anything(), 'prefs');
    act(() => result.current.resize('total', 300));
    expect(window.localStorage.getItem('eds:table:t1')).toContain('200');
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(JSON.parse(window.localStorage.getItem('eds:table:t1') ?? '{}').widths.total).toBe(300);
    act(() => result.current.reset());
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(window.localStorage.getItem('eds:table:t1')).toBeNull();
    expect(result.current.state.widths).toEqual({ total: 120 });
    vi.useRealTimers();
  });

  it('versão diferente ou JSON inválido: padrões, sem erro', () => {
    window.localStorage.setItem('eds:table:a', JSON.stringify({ v: 9, order: ['data'] }));
    window.localStorage.setItem('eds:table:b', '{quebrado');
    for (const key of ['a', 'b']) {
      const { result } = renderHook(() => useTableColumns(defs, { prefsKey: key }));
      expect(result.current.state.order[0]).toBe('sel');
    }
  });
});

function Demo({ resizable = true }: { resizable?: boolean }) {
  const controller = useTableColumns(defs);
  return (
    <>
      <TableColumnsMenu controller={controller} resizable={resizable} />
      <Table caption="Pedidos" columnsController={controller} reorderable resizable={resizable}>
        <TableHead>
          <TableRow>
            {controller.columns.map((c) => (
              <TableHeaderCell key={c.id} columnId={c.id}>
                {c.label}
              </TableHeaderCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            {controller.columns.map((c) => (
              <TableCell key={c.id} columnId={c.id}>
                {c.id}
              </TableCell>
            ))}
          </TableRow>
        </TableBody>
      </Table>
    </>
  );
}

const headers = () =>
  screen.getAllByRole('columnheader').map((th) => th.getAttribute('data-eds-col'));

describe('Table com colunas (alça, painel e fixação)', () => {
  it('renderiza colgroup, larguras, fixação e remove a coluna oculta', () => {
    const { container } = render(<Demo />);
    expect(container.querySelector('table')).toHaveClass('eds-table-fixed');
    expect(container.querySelector('col[data-eds-col="total"]')).toHaveStyle({ width: '120px' });
    const cliente = screen.getByRole('columnheader', { name: /Cliente/ });
    expect(cliente).toHaveClass('eds-table-pin-start', 'eds-table-pin-edge');
    expect(headers()).not.toContain('obs');
  });

  it('alça: Espaço pega, setas movem, Home/End, Esc cancela; foco permanece', async () => {
    const user = userEvent.setup();
    render(<Demo />);
    const handle = screen.getByRole('button', { name: 'Ajustar coluna Total' });
    expect(handle).toHaveAttribute('aria-pressed', 'false');
    expect(handle).toHaveAccessibleDescription(/Espaço pega a coluna/);
    handle.focus();
    await user.keyboard(' ');
    expect(handle).toHaveAttribute('aria-pressed', 'true');
    await user.keyboard('{ArrowRight}');
    expect(headers()).toEqual(['sel', 'cliente', 'data', 'total', 'acoes']);
    expect(screen.getByRole('button', { name: 'Ajustar coluna Total' })).toHaveFocus();
    expect(await screen.findByText('Total: posição 3 de 3.')).toBeInTheDocument();
    await user.keyboard('{Home}');
    expect(headers().slice(0, 4)).toEqual(['sel', 'cliente', 'total', 'data']);
    // Esc volta ao estado de antes de pegar.
    await user.keyboard('{Escape}');
    expect(headers()).toEqual(['sel', 'cliente', 'total', 'data', 'acoes']);
    expect(screen.getByRole('button', { name: 'Ajustar coluna Total' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('alça: Shift+setas redimensionam em 16 px (Ctrl: 64) e Espaço solta', async () => {
    const user = userEvent.setup();
    const { container } = render(<Demo />);
    screen.getByRole('button', { name: 'Ajustar coluna Total' }).focus();
    await user.keyboard(' {Shift>}{ArrowRight}{/Shift}');
    expect(container.querySelector('col[data-eds-col="total"]')).toHaveStyle({ width: '136px' });
    await user.keyboard('{Control>}{Shift>}{ArrowLeft}{/Shift}{/Control}');
    expect(container.querySelector('col[data-eds-col="total"]')).toHaveStyle({ width: '72px' });
    await user.keyboard(' ');
    expect(screen.getByRole('button', { name: 'Ajustar coluna Total' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('alça: Tab cancela e o foco segue', async () => {
    const user = userEvent.setup();
    render(<Demo />);
    screen.getByRole('button', { name: 'Ajustar coluna Total' }).focus();
    await user.keyboard(' {ArrowRight}{Tab}');
    expect(headers()).toEqual(['sel', 'cliente', 'total', 'data', 'acoes']);
  });

  it('painel: oculta e exibe, última visível, mover por botão e restaurar', async () => {
    const user = userEvent.setup();
    render(<Demo />);
    const data = screen.getByRole('checkbox', { name: 'Data' });
    await user.click(data);
    expect(headers()).not.toContain('data');
    expect(
      await screen.findByText('Coluna Data oculta. 2 de 4 colunas visíveis.'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'Observação' }));
    expect(headers()).toContain('obs');
    await user.click(screen.getByRole('button', { name: 'Mover Total para depois' }));
    await user.click(screen.getByRole('button', { name: 'Mover Total para depois' }));
    expect(headers().indexOf('total')).toBeGreaterThan(headers().indexOf('obs'));
    expect(screen.getByRole('button', { name: 'Mover Total para depois' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Alargar Total' }));
    await user.click(screen.getByRole('button', { name: 'Restaurar padrão' }));
    expect(headers()).toEqual(['sel', 'cliente', 'total', 'data', 'acoes']);
    expect(await screen.findByText('Colunas restauradas.')).toBeInTheDocument();
  });
});
