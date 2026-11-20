import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SecretField } from '../SecretField';
import { CopyButton } from './CopyButton';

let written: string[];
/** O user-event troca o clipboard ao criar a sessão: o stub do teste vem depois. */
function setup() {
  const user = userEvent.setup();
  written = [];
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText: (text: string) => {
        written.push(text);
        return Promise.resolve();
      },
    },
  });
  return user;
}
afterEach(() => vi.useRealTimers());

describe('CopyButton', () => {
  it('copia, troca o rótulo por 2 s e anuncia', async () => {
    const onCopy = vi.fn();
    const user = setup();
    render(<CopyButton text="CHAVE-EXEMPLO-0001" onCopy={onCopy} />);
    const button = screen.getByRole('button', { name: 'Copiar' });
    expect(button).toHaveClass('eds-copy', 'eds-button');
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await user.click(button);
    expect(written).toEqual(['CHAVE-EXEMPLO-0001']);
    expect(onCopy).toHaveBeenCalledWith('CHAVE-EXEMPLO-0001');
    expect(await screen.findByRole('button', { name: 'Copiado' })).toHaveAttribute(
      'data-copied',
      'true',
    );
    expect(screen.getByRole('status')).toHaveTextContent('Copiado para a área de transferência.');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2100);
    });
    const back = screen.getByRole('button', { name: 'Copiar' });
    expect(back).not.toHaveAttribute('data-copied');
  });

  it('aceita função como texto e rótulo próprio', async () => {
    const user = setup();
    render(<CopyButton text={() => 'lido no clique'}>Copiar link</CopyButton>);
    await user.click(screen.getByRole('button', { name: 'Copiar link' }));
    expect(written).toEqual(['lido no clique']);
  });

  it('só ícone: o nome acessível vira "Copiado"', async () => {
    const user = setup();
    render(<CopyButton iconOnly aria-label="Copiar chave" text="abc" />);
    await user.click(screen.getByRole('button', { name: 'Copiar chave' }));
    expect(await screen.findByRole('button', { name: 'Copiado' })).toBeInTheDocument();
  });

  it('falha de cópia anuncia o erro e chama onCopyError', async () => {
    const user = setup();
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
    Object.defineProperty(document, 'execCommand', { configurable: true, value: () => false });
    const onCopyError = vi.fn();
    render(<CopyButton text="x" onCopyError={onCopyError} />);
    await user.click(screen.getByRole('button', { name: 'Copiar' }));
    expect(onCopyError).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('status')).toHaveTextContent('Não foi possível copiar');
  });
});

describe('SecretField', () => {
  it('nasce mascarado; Mostrar valor alterna com aria-pressed; copia o valor', async () => {
    const user = setup();
    const { container } = render(
      <SecretField label="Token de acesso" value="TOKEN-EXEMPLO-0000" />,
    );
    const input = screen.getByLabelText('Token de acesso') as HTMLInputElement;
    expect(input).toHaveAttribute('type', 'password');
    expect(input).toHaveAttribute('readonly');
    expect(input).toHaveClass('eds-input', 'eds-secret-value');
    expect(container.firstElementChild).toHaveClass('eds-secret');
    expect(input).toHaveAccessibleDescription(/não será mostrado de novo/);
    const toggle = screen.getByRole('button', { name: 'Mostrar valor' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await user.click(toggle);
    expect(input).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Mostrar valor' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await user.click(screen.getByRole('button', { name: 'Copiar valor' }));
    expect(written).toEqual(['TOKEN-EXEMPLO-0000']);
  });

  it('copyable=false esconde o Copiar; warning e texts são trocáveis', () => {
    render(
      <SecretField
        label="Chave"
        value="x"
        copyable={false}
        warning="Guarde agora."
        texts={{ toggle: 'Reveal' }}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Copiar valor' })).toBeNull();
    expect(screen.getByText('Guarde agora.')).toHaveClass('eds-secret-warning');
    expect(screen.getByRole('button', { name: 'Reveal' })).toBeInTheDocument();
  });
});
