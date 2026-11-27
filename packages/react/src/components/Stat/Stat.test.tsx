import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Stat, StatGrid } from './Stat';

describe('Stat', () => {
  it('emite o markup do core com direção em texto oculto', () => {
    const { container } = render(
      <Stat
        label="Pedidos no mês"
        value="1.284"
        delta="12,4%"
        trend="up"
        tone="success"
        meta="vs. mês anterior"
      />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveClass('eds-card', 'eds-stat');
    expect(root.querySelector('.eds-stat-label')).toHaveTextContent('Pedidos no mês');
    expect(root.querySelector('.eds-stat-value')).toHaveTextContent('1.284');
    const delta = root.querySelector('.eds-stat-delta') as HTMLElement;
    expect(delta).toHaveAttribute('data-trend', 'up');
    expect(delta).toHaveClass('eds-stat-delta-success');
    expect(delta.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(delta.querySelector('.eds-visually-hidden')).toHaveTextContent('Aumento de');
    expect(delta).toHaveTextContent('12,4% vs. mês anterior');
    expect(delta.querySelector('.eds-stat-meta')).toHaveTextContent('vs. mês anterior');
  });

  it('queda e sem variação usam o texto da direção; sem delta não há linha', () => {
    const { rerender, container } = render(
      <Stat label="L" value="1" delta="3%" trend="down" tone="danger" />,
    );
    expect(container.querySelector('.eds-visually-hidden')).toHaveTextContent('Queda de');
    rerender(<Stat label="L" value="1" delta="0%" />);
    expect(container.querySelector('.eds-visually-hidden')).toHaveTextContent('Sem variação,');
    rerender(<Stat label="L" value="1" />);
    expect(container.querySelector('.eds-stat-delta')).toBeNull();
  });

  it('carregando: aria-busy, anúncio e Skeleton no lugar do conteúdo', () => {
    const { container } = render(<Stat label="L" value="1" delta="3%" loading />);
    expect(container.firstElementChild).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Carregando indicador');
    expect(container.querySelectorAll('.eds-skeleton')).toHaveLength(3);
    expect(container.textContent).not.toContain('3%');
  });

  it('na grade, um único status anuncia o carregamento dos cards', () => {
    const { rerender } = render(
      <StatGrid>
        <Stat label="A" value="1" loading />
        <Stat label="B" value="2" loading />
        <Stat label="C" value="3" loading />
        <Stat label="D" value="4" loading />
      </StatGrid>,
    );
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getByRole('status')).toHaveTextContent('Carregando indicadores');
    rerender(
      <StatGrid>
        <Stat label="A" value="1" />
        <Stat label="B" value="2" />
        <Stat label="C" value="3" />
        <Stat label="D" value="4" />
      </StatGrid>,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Indicadores carregados');
  });

  it('StatGrid', () => {
    const { container } = render(<StatGrid className="x" />);
    expect(container.firstElementChild).toHaveClass('eds-stat-grid', 'x');
  });
});
