import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from '../Button';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renderiza ícone, título, descrição e ações com as classes do core', () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <EmptyState
        ref={ref}
        className="extra"
        icon={<svg data-testid="icone" />}
        title="Nenhum pedido encontrado"
        description="Ajuste os filtros."
        actions={<Button variant="primary">Novo pedido</Button>}
      />,
    );
    const root = container.firstElementChild;
    expect(root).toHaveClass('eds-empty', 'extra');
    expect(ref.current).toBe(root);
    const icon = screen.getByTestId('icone');
    expect(icon).toHaveClass('eds-empty-icon');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText('Ajuste os filtros.')).toHaveClass('eds-empty-text');
    expect(screen.getByRole('button', { name: 'Novo pedido' }).parentElement).toHaveClass(
      'eds-empty-actions',
    );
  });

  it('título é h3 por padrão e o nível é configurável', () => {
    const { rerender } = render(<EmptyState title="Vazio" />);
    expect(screen.getByRole('heading', { level: 3, name: 'Vazio' })).toHaveClass('eds-empty-title');
    rerender(<EmptyState title="Vazio" headingLevel={2} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Vazio' })).toBeInTheDocument();
  });

  it('omite descrição e ações quando ausentes', () => {
    const { container } = render(<EmptyState title="Vazio" />);
    expect(container.querySelector('.eds-empty-text')).toBeNull();
    expect(container.querySelector('.eds-empty-actions')).toBeNull();
  });

  it('description e actions nulos não renderizam parágrafo nem contêiner vazios', () => {
    const { container } = render(<EmptyState title="Vazio" description={null} actions={null} />);
    expect(container.querySelector('.eds-empty-text')).toBeNull();
    expect(container.querySelector('.eds-empty-actions')).toBeNull();
  });
});
