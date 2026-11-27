import { useEffect } from 'react';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { installDialogPolyfill } from '../../test-utils/dom-polyfills';
import { DialogProvider, useDialog, type DialogApi } from './Dialog';

let restore: () => void;
beforeEach(() => {
  restore = installDialogPolyfill();
});
afterEach(() => restore());

let api!: DialogApi;
function Grab() {
  const value = useDialog();
  useEffect(() => {
    api = value;
  }, [value]);
  return null;
}
const setup = () =>
  render(
    <DialogProvider>
      <Grab />
    </DialogProvider>,
  );
const dialog = () => document.querySelector<HTMLDialogElement>('dialog.eds-alert-dialog');

describe('useDialog: forma (texto, opções)', () => {
  it('alert aceita title e tone nas opções', async () => {
    const user = userEvent.setup();
    setup();
    const done = api.alert('Pedido salvo.', { title: 'Pronto', tone: 'success' });
    await waitFor(() => expect(dialog()).toHaveAttribute('open'));
    expect(dialog()).toHaveClass('eds-alert-dialog-success');
    expect(dialog()?.querySelector('.eds-alert-dialog-title')).toHaveTextContent('Pronto');
    await user.click(dialog()!.querySelector('button')!);
    await done;
  });

  it('confirm aceita title e tone nas opções; o argumento posicional continua valendo', async () => {
    const user = userEvent.setup();
    setup();
    const done = api.confirm('Excluir?', { title: 'Excluir', tone: 'danger', okText: 'Excluir' });
    await waitFor(() => expect(dialog()).toHaveAttribute('open'));
    expect(dialog()).toHaveClass('eds-alert-dialog-danger');
    await user.click(dialog()!.querySelector<HTMLButtonElement>('button.eds-button-danger')!);
    await expect(done).resolves.toBe(true);

    const second = api.confirm('Continuar?', 'Título posicional', 'warning', { title: 'ignorado' });
    await waitFor(() => expect(dialog()).toHaveAttribute('open'));
    expect(dialog()).toHaveClass('eds-alert-dialog-warning');
    expect(dialog()?.querySelector('.eds-alert-dialog-title')).toHaveTextContent(
      'Título posicional',
    );
    await user.click(dialog()!.querySelectorAll('button')[0]!);
    await expect(second).resolves.toBe(false);
  });

  it('prompt aceita defaultValue e title nas opções', async () => {
    const user = userEvent.setup();
    setup();
    const done = api.prompt('Nome do arquivo', { defaultValue: 'relatorio', title: 'Salvar' });
    await waitFor(() => expect(dialog()).toHaveAttribute('open'));
    expect(dialog()?.querySelector('input')).toHaveValue('relatorio');
    expect(dialog()?.querySelector('.eds-alert-dialog-title')).toHaveTextContent('Salvar');
    await user.click(dialog()!.querySelector<HTMLButtonElement>('button.eds-button-primary')!);
    await expect(done).resolves.toBe('relatorio');
  });
});
