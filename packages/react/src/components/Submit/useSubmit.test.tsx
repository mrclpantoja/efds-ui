import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Button } from '../Button';
import { useSubmit, type UseSubmitOptions } from './useSubmit';

function Demo({
  handler,
  options,
  summary,
}: {
  handler: (data: FormData) => unknown;
  options?: UseSubmitOptions;
  summary?: boolean;
}) {
  const submit = useSubmit(handler, options);
  return (
    <form onSubmit={submit.handleSubmit} aria-label="Cadastro">
      <input name="nome" defaultValue="Ana Exemplo" aria-label="Nome" />
      {summary ? <div data-eds-error-summary>Erros</div> : null}
      <Button type="submit" variant="primary" {...submit.buttonProps}>
        Salvar
      </Button>
      <Button
        type="submit"
        name="acao"
        value="rascunho"
        aria-disabled={submit.loading || undefined}
      >
        Rascunho
      </Button>
      <output data-testid="estado">{submit.state}</output>
    </form>
  );
}

const status = () => document.querySelector('[role="status"]')?.textContent ?? '';
const send = (form: HTMLElement) =>
  form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }));

describe('useSubmit', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('envia o FormData (com o botão que enviou), mostra loading e depois "Salvo"', async () => {
    const user = userEvent.setup();
    let done!: () => void;
    const handler = vi.fn(() => new Promise<void>((r) => (done = r)));
    render(<Demo handler={handler} />);
    await user.click(screen.getByRole('button', { name: 'Rascunho' }));

    const data = (handler.mock.calls[0] as unknown as [FormData])[0];
    expect(data.get('nome')).toBe('Ana Exemplo');
    expect(data.get('acao')).toBe('rascunho');
    expect(screen.getByTestId('estado')).toHaveTextContent('busy');
    expect(screen.getByRole('button', { name: 'Salvar' })).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: 'Rascunho' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );

    await act(async () => done());
    const ok = screen.getByRole('button', { name: 'Salvo' });
    expect(ok).toHaveAttribute('data-state', 'success');
    expect(ok).not.toHaveAttribute('aria-busy');
    expect(status()).toContain('Salvo');
  });

  it('ignora o segundo envio enquanto envia', async () => {
    const user = userEvent.setup();
    const handler = vi.fn(() => new Promise<void>(() => undefined));
    render(<Demo handler={handler} />);
    const botao = screen.getByRole('button', { name: 'Salvar' });
    await user.click(botao);
    await user.click(botao);
    await user.keyboard('{Enter}');
    await user.click(screen.getByRole('button', { name: 'Rascunho' }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('falha: estado error, texto, onError, foco no botão e form editável', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const falha = new Error('boom');
    render(
      <Demo
        handler={() => Promise.reject(falha)}
        options={{ onError, texts: { error: 'Falhou' } }}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    const botao = await screen.findByRole('button', { name: 'Falhou' });
    expect(botao).toHaveAttribute('data-state', 'error');
    expect(botao).toHaveFocus();
    expect(onError).toHaveBeenCalledWith(falha);
    expect(screen.getByRole('textbox', { name: 'Nome' })).toBeEnabled();
    // Tenta de novo logo em seguida.
    await user.click(botao);
    expect(onError).toHaveBeenCalledTimes(2);
  });

  it('com resumo de erros no form, o foco vai para ele', async () => {
    const user = userEvent.setup();
    render(<Demo summary handler={() => Promise.reject(new Error('x'))} />);
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    await screen.findByRole('button', { name: 'Não foi possível salvar' });
    expect(screen.getByText('Erros')).toHaveFocus();
  });

  it('o resultado volta ao normal depois de feedbackMs; 0 mantém até o próximo envio', async () => {
    vi.useFakeTimers();
    const handler = vi.fn(() => Promise.resolve());
    const { rerender } = render(<Demo handler={handler} options={{ feedbackMs: 500 }} />);
    const form = screen.getByRole('form');
    await act(async () => {
      send(form);
    });
    expect(screen.getByTestId('estado')).toHaveTextContent('success');
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByTestId('estado')).toHaveTextContent('idle');
    expect(screen.getByRole('button', { name: 'Salvar' })).not.toHaveAttribute('data-state');
    rerender(<Demo handler={handler} options={{ feedbackMs: 0 }} />);
    await act(async () => {
      send(form);
    });
    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });
    expect(screen.getByTestId('estado')).toHaveTextContent('success');
  });

  it('anuncia "Enviando…" só se demorar', async () => {
    vi.useFakeTimers();
    render(<Demo handler={() => new Promise(() => undefined)} />);
    await act(async () => {
      send(screen.getByRole('form'));
    });
    expect(status()).toBe('');
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(status()).toBe('Enviando…');
  });
});
