import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installDialogPolyfill } from '../../test-utils/dom-polyfills';
import { ConfirmButton } from './ConfirmButton';
import { DialogProvider } from './Dialog';

let restore: () => void;
beforeEach(() => {
  restore = installDialogPolyfill();
});
afterEach(() => restore());

describe('ConfirmButton', () => {
  it('só age depois do "sim"; Cancelar não chama onClick', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <DialogProvider>
        <ConfirmButton
          confirm="Excluir o pedido?"
          confirmOptions={{ title: 'Excluir pedido' }}
          onClick={onClick}
        >
          Excluir
        </ConfirmButton>
      </DialogProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Excluir' }));
    expect(await screen.findByText('Excluir o pedido?')).toBeInTheDocument();
    expect(onClick).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(document.querySelector('dialog.eds-alert-dialog')).toBeNull());
    expect(onClick).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Excluir' }));
    await user.click(await screen.findByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(onClick).toHaveBeenCalledTimes(1));
  });

  it('botão de envio só envia o formulário depois de confirmar', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    render(
      <DialogProvider>
        <form onSubmit={onSubmit}>
          <ConfirmButton
            type="submit"
            confirm="Enviar?"
            confirmOptions={{ okText: 'Enviar agora' }}
          >
            Salvar
          </ConfirmButton>
        </form>
      </DialogProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(onSubmit).not.toHaveBeenCalled();
    await user.click(await screen.findByRole('button', { name: 'Enviar agora' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  });

  it('com href é link e o onClick só roda depois do "sim"', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    render(
      <DialogProvider>
        <ConfirmButton href="#sair" confirm="Sair?" onClick={onClick}>
          Sair
        </ConfirmButton>
      </DialogProvider>,
    );
    await user.click(screen.getByRole('link', { name: 'Sair' }));
    await user.click(await screen.findByRole('button', { name: 'Cancelar' }));
    expect(onClick).not.toHaveBeenCalled();
    await user.click(screen.getByRole('link', { name: 'Sair' }));
    await user.click(await screen.findByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(onClick).toHaveBeenCalledTimes(1));
  });
});
