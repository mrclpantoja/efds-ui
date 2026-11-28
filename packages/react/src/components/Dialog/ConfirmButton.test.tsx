import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installDialogPolyfill } from '../../test-utils/dom-polyfills';
import { useFormValidation } from '../FormValidation';
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

  it('com useFormValidation: formulário inválido mostra os erros e não pergunta', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const onInvalid = vi.fn();
    function Form() {
      const { formProps } = useFormValidation({ onSubmit, onInvalid });
      return (
        <form {...formProps}>
          <label htmlFor="nome">Nome</label>
          <input id="nome" name="nome" required />
          <ConfirmButton type="submit" confirm="Salvar?">
            Salvar
          </ConfirmButton>
        </form>
      );
    }
    render(
      <DialogProvider>
        <Form />
      </DialogProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(onInvalid).toHaveBeenCalledTimes(1);
    expect(document.querySelector('dialog.eds-alert-dialog')).toBeNull();
    expect(onSubmit).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('Nome'), 'Ana');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Salvar?')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  });

  it('validação nativa: inválido não pergunta', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    render(
      <DialogProvider>
        <form onSubmit={onSubmit}>
          <label htmlFor="n">Nome</label>
          <input id="n" required />
          <ConfirmButton type="submit" confirm="Enviar?">
            Enviar
          </ConfirmButton>
        </form>
      </DialogProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(document.querySelector('dialog.eds-alert-dialog')).toBeNull();
    expect(onSubmit).not.toHaveBeenCalled();
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
