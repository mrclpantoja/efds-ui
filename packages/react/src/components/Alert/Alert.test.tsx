import { createRef, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Alert } from './Alert';

describe('Alert', () => {
  it('info por padrão, sem role e sem botão fechar', () => {
    render(<Alert data-testid="a">Texto</Alert>);
    const alert = screen.getByTestId('a');
    expect(alert).toHaveClass('eds-alert', 'eds-alert-info');
    expect(alert).not.toHaveAttribute('role');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('Texto')).toHaveClass('eds-alert-content');
  });

  it.each(['info', 'success', 'warning', 'danger'] as const)('aplica o tom %s', (v) => {
    render(
      <Alert tone={v} data-testid="a">
        x
      </Alert>,
    );
    expect(screen.getByTestId('a')).toHaveClass(`eds-alert-${v}`);
  });

  it('título e ações', () => {
    render(
      <Alert title="Atenção: faturas" actions={<button type="button">Ver</button>}>
        Há 3 vencidas.
      </Alert>,
    );
    expect(screen.getByText('Atenção: faturas')).toHaveClass('eds-alert-title');
    expect(screen.getByRole('button', { name: 'Ver' }).parentElement).toHaveClass(
      'eds-alert-actions',
    );
  });

  it('mescla className, repassa ref, role e props nativas', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Alert ref={ref} className="extra" role="alert">
        x
      </Alert>,
    );
    const alert = screen.getByRole('alert');
    expect(ref.current).toBe(alert);
    expect(alert).toHaveClass('eds-alert', 'extra');
  });

  it('fechável: botão com nome acessível chama onDismiss', async () => {
    const onDismiss = vi.fn();
    render(<Alert onDismiss={onDismiss}>x</Alert>);
    const close = screen.getByRole('button', { name: 'Fechar aviso' });
    expect(close).toHaveClass('eds-alert-close', 'eds-button-icon');
    await userEvent.click(close);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('texts.close substitui o texto do botão', () => {
    render(
      <Alert onDismiss={() => {}} texts={{ close: 'Dismiss' }}>
        x
      </Alert>,
    );
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument();
  });

  it('o consumidor remove o aviso e devolve o foco', async () => {
    function Demo() {
      const [open, setOpen] = useState(true);
      return open ? (
        <Alert
          onDismiss={() => {
            setOpen(false);
            queueMicrotask(() => document.getElementById('prox')?.focus());
          }}
        >
          x
        </Alert>
      ) : (
        <button id="prox" type="button">
          Reabrir
        </button>
      );
    }
    render(<Demo />);
    await userEvent.click(screen.getByRole('button', { name: 'Fechar aviso' }));
    expect(screen.getByRole('button', { name: 'Reabrir' })).toHaveFocus();
  });

  it('severidade em texto oculto por variante, trocável e desligável', () => {
    const { rerender, container } = render(
      <Alert tone="danger" title="Falha ao salvar">
        corpo
      </Alert>,
    );
    const hidden = () => container.querySelector('.eds-visually-hidden');
    expect(hidden()).toHaveTextContent('Erro:');
    expect(container.querySelector('.eds-alert-title')).toHaveTextContent('Erro: Falha ao salvar');
    rerender(<Alert tone="warning">sem título</Alert>);
    expect(hidden()).toHaveTextContent('Atenção:');
    rerender(
      <Alert tone="success" texts={{ severity: 'Done:' }}>
        x
      </Alert>,
    );
    expect(hidden()).toHaveTextContent('Done:');
    rerender(
      <Alert tone="info" texts={{ severity: false }}>
        x
      </Alert>,
    );
    expect(hidden()).toBeNull();
  });
});
