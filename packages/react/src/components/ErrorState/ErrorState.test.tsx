import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ErrorState } from './ErrorState';

describe('ErrorState', () => {
  it('monta as partes do estado vazio de erro e não anuncia por padrão', () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <ErrorState
        ref={ref}
        title="Não foi possível carregar"
        description="Verifique a conexão."
        detail="Código: ERR-0042"
        onRetry={() => undefined}
      />,
    );
    const root = container.firstElementChild!;
    expect(root).toBe(ref.current);
    expect(root).toHaveClass('eds-empty', 'eds-empty-error');
    expect(root).not.toHaveAttribute('role');
    expect(
      screen.getByRole('heading', { level: 3, name: 'Não foi possível carregar' }),
    ).toHaveClass('eds-empty-title');
    expect(screen.getByText('Código: ERR-0042')).toHaveClass('eds-empty-detail');
    expect(container.querySelector('.eds-empty-icon')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('button', { name: 'Tentar de novo' }).parentElement).toHaveClass(
      'eds-empty-actions',
    );
  });

  it('announce usa role="alert"', () => {
    render(<ErrorState title="Falha ao salvar" announce />);
    expect(screen.getByRole('alert')).toHaveTextContent('Falha ao salvar');
  });

  it('Tentar de novo chama onRetry; retrying fica aria-busy e ignora cliques', async () => {
    const onRetry = vi.fn();
    const { rerender } = render(<ErrorState title="Erro" onRetry={onRetry} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    rerender(<ErrorState title="Erro" onRetry={onRetry} retrying />);
    const busy = screen.getByRole('button', { name: 'Tentar de novo' });
    expect(busy).toHaveAttribute('aria-busy', 'true');
    await user.click(busy);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('sem onRetry não há botão; texts troca o rótulo', () => {
    const { rerender } = render(<ErrorState title="Erro" />);
    expect(screen.queryByRole('button')).toBeNull();
    rerender(<ErrorState title="Erro" onRetry={() => undefined} texts={{ retry: 'Retry' }} />);
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
