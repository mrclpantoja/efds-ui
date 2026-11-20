import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FilterBar } from './FilterBar';

function Harness({ onSubmit }: { onSubmit?: () => void }) {
  const [q, setQ] = useState('caderno');
  const [sit, setSit] = useState('ativo');
  const active = [
    ...(q ? [{ key: 'q', label: `Busca: ${q}`, onRemove: () => setQ('') }] : []),
    ...(sit ? [{ key: 'sit', label: `Situação: ${sit}`, onRemove: () => setSit('') }] : []),
  ];
  return (
    <FilterBar
      aria-label="Filtrar pedidos"
      active={active}
      onSubmit={onSubmit}
      onClear={() => {
        setQ('');
        setSit('');
      }}
      more={<input aria-label="Canal" />}
      moreCount={2}
    >
      <label htmlFor="q">Busca</label>
      <input id="q" value={q} onChange={(e) => setQ(e.target.value)} />
    </FilterBar>
  );
}

describe('FilterBar', () => {
  it('emite o markup do core: busca, campos, ações, mais filtros e chips', () => {
    render(<Harness />);
    const form = screen.getByRole('search', { name: 'Filtrar pedidos' });
    expect(form).toHaveClass('eds-filter-bar');
    expect(form.querySelector('.eds-filter-bar-fields input')).toBeInTheDocument();
    expect(form.querySelector('.eds-filter-bar-actions')).toHaveTextContent('FiltrarLimpar');
    expect(form.querySelector('details.eds-filter-bar-more summary')).toHaveTextContent(
      'Mais filtros (2)',
    );
    expect(form.querySelector('.eds-filter-bar-count')).toHaveTextContent('(2)');
    const list = screen.getByRole('list', { name: 'Filtros ativos' });
    expect(list).toHaveClass('eds-filter-chips');
    const chip = screen.getByRole('button', { name: /Busca: caderno/ });
    expect(chip).toHaveClass('eds-chip');
    expect(chip.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(chip.querySelector('.eds-visually-hidden')).toHaveTextContent('— remover');
  });

  it('envia sem navegar e chama onSubmit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: 'Filtrar' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('remover um chip chama onRemove e o foco vai ao próximo chip', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: /Busca: caderno/ }));
    expect(screen.queryByRole('button', { name: /Busca: caderno/ })).toBeNull();
    expect(screen.getByRole('button', { name: /Situação: ativo/ })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: /Situação: ativo/ }));
    expect(screen.getByLabelText('Busca')).toHaveFocus();
  });

  it('Limpar chama onClear', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Limpar' }));
    expect(screen.queryAllByRole('button', { name: /remover/ })).toHaveLength(0);
  });

  it('textos substituíveis e sem more não há details', () => {
    render(
      <FilterBar aria-label="Filter" texts={{ filter: 'Apply', clear: 'Clear', chips: 'Active' }}>
        x
      </FilterBar>,
    );
    expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument();
    expect(document.querySelector('details')).toBeNull();
  });
});
