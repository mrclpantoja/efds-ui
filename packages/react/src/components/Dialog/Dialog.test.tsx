import { StrictMode, useEffect } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installDialogPolyfill } from '../../test-utils/dom-polyfills';
import { Modal } from '../Modal';
import { DialogProvider, useDialog, type DialogApi, type DialogProviderProps } from './Dialog';

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
  return <button type="button">Abrir</button>;
}
const setup = (props?: Omit<DialogProviderProps, 'children'>) =>
  render(
    <DialogProvider {...props}>
      <Grab />
    </DialogProvider>,
  );
const dialog = () => document.querySelector<HTMLDialogElement>('dialog.eds-alert-dialog');

describe('DialogProvider / useDialog', () => {
  it('useDialog fora do provider falha com mensagem clara', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Grab />)).toThrow(/DialogProvider/);
    spy.mockRestore();
  });

  it('alert: markup do core, foco no OK, resolve undefined', async () => {
    const user = userEvent.setup();
    setup();
    screen.getByRole('button', { name: 'Abrir' }).focus();
    const done = vi.fn();
    void api.alert('Pedido salvo.', 'Pedido', 'success').then(done);
    await waitFor(() => expect(dialog()).toBeTruthy());
    const d = dialog()!;
    expect(d).toHaveClass('eds-modal', 'eds-alert-dialog');
    expect(d).toHaveAttribute('data-variant', 'success');
    expect(d).not.toHaveAttribute('role');
    expect(d.querySelector('.eds-alert-dialog-icon')).toHaveAttribute('aria-hidden', 'true');
    const title = d.querySelector('.eds-alert-dialog-title')!;
    expect(title.tagName).toBe('H2');
    expect(title).toHaveTextContent('Sucesso: Pedido');
    expect(d).toHaveAttribute('aria-labelledby', title.id);
    expect(d).toHaveAttribute('aria-describedby', d.querySelector('.eds-alert-dialog-text')!.id);
    await waitFor(() => expect(screen.getByRole('button', { name: 'OK' })).toHaveFocus());
    expect(screen.queryByRole('button', { name: 'Cancelar' })).toBeNull();
    await user.keyboard('{Enter}');
    await waitFor(() => expect(done).toHaveBeenCalledWith(undefined));
    expect(dialog()).toBeNull();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Abrir' })).toHaveFocus());
  });

  it('sem título o texto nomeia o diálogo e não há aria-describedby', async () => {
    setup();
    void api.alert('Algo aconteceu.');
    await waitFor(() => expect(dialog()).toBeTruthy());
    const d = dialog()!;
    const text = d.querySelector('.eds-alert-dialog-text')!;
    expect(d).toHaveAttribute('aria-labelledby', text.id);
    expect(d).not.toHaveAttribute('aria-describedby');
    expect(d.querySelector('.eds-alert-dialog-title')).toBeNull();
    expect(text).toHaveTextContent('Informação: Algo aconteceu.');
  });

  it('confirm: foco no OK, Enter confirma; Cancelar/Esc devolvem false', async () => {
    const user = userEvent.setup();
    setup();
    let p = api.confirm('Salvar?', 'Salvar');
    await waitFor(() => expect(dialog()).toBeTruthy());
    expect(dialog()).toHaveAttribute('data-variant', 'question');
    expect(dialog()).not.toHaveAttribute('role');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Confirmar' })).toHaveFocus());
    await user.keyboard('{Enter}');
    await expect(p).resolves.toBe(true);

    p = api.confirm('Salvar?');
    await waitFor(() => expect(dialog()).toBeTruthy());
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    await expect(p).resolves.toBe(false);

    p = api.confirm('Salvar?');
    await waitFor(() => expect(dialog()).toBeTruthy());
    await user.keyboard('{Escape}');
    await expect(p).resolves.toBe(false);
    expect(dialog()).toBeNull();
  });

  it('confirm danger: alertdialog, foco no Cancelar, OK em danger, fundo não fecha', async () => {
    const user = userEvent.setup();
    setup();
    const p = api.confirm('Excluir o pedido PED-0001?', 'Excluir', 'danger', { okText: 'Excluir' });
    await waitFor(() => expect(dialog()).toBeTruthy());
    const d = dialog()!;
    expect(d).toHaveAttribute('role', 'alertdialog');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus());
    expect(screen.getByRole('button', { name: 'Excluir' })).toHaveClass('eds-button-danger');
    await user.pointer([{ keys: '[MouseLeft>]', target: d }, { keys: '[/MouseLeft]' }]);
    expect(dialog()).not.toBeNull();
    await user.click(screen.getByRole('button', { name: 'Excluir' }));
    await expect(p).resolves.toBe(true);
  });

  it('confirm warning é alertdialog; fundo fecha nos demais tipos', async () => {
    const user = userEvent.setup();
    setup();
    let p = api.confirm('Continuar?', 'Atenção', 'warning');
    await waitFor(() => expect(dialog()).toBeTruthy());
    expect(dialog()).toHaveAttribute('role', 'alertdialog');
    // O foco inicial vem de um efeito: espera por ele em vez de supor que já aconteceu.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Confirmar' })).toHaveFocus());
    await user.keyboard('{Escape}');
    await expect(p).resolves.toBe(false);
    // A Promise resolve antes de o diálogo sair do DOM: sem esperar, o segundo teste de fundo
    // poderia clicar no diálogo antigo (já encerrado) em vez do novo.
    await waitFor(() => expect(dialog()).toBeNull());

    p = api.confirm('Salvar?');
    await waitFor(() => expect(dialog()).toBeTruthy());
    await waitFor(() => expect(screen.getByRole('button', { name: 'Confirmar' })).toHaveFocus());
    await user.pointer([{ keys: '[MouseLeft>]', target: dialog()! }, { keys: '[/MouseLeft]' }]);
    await expect(p).resolves.toBe(false);
  });

  it('prompt: foco e seleção no campo, valor padrão, Enter devolve o texto', async () => {
    const user = userEvent.setup();
    setup();
    const p = api.prompt('Nome do arquivo', 'relatorio', 'Salvar como');
    await waitFor(() => expect(dialog()).toBeTruthy());
    const input = screen.getByRole('textbox', { name: 'Salvar como' }) as HTMLInputElement;
    await waitFor(() => expect(input).toHaveFocus());
    expect(input.value).toBe('relatorio');
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(9);
    await user.keyboard('anual{Enter}');
    await expect(p).resolves.toBe('anual');
  });

  it('prompt: Esc e Cancelar devolvem null; sem título o rótulo é o texto', async () => {
    const user = userEvent.setup();
    setup();
    let p = api.prompt('Seu apelido');
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Seu apelido' })).toBeTruthy());
    await user.keyboard('{Escape}');
    await expect(p).resolves.toBeNull();
    p = api.prompt('Seu apelido');
    await waitFor(() => expect(dialog()).toBeTruthy());
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    await expect(p).resolves.toBeNull();
  });

  it('prompt required: erro visível, aria-invalid, não fecha; corrigir limpa o erro', async () => {
    const user = userEvent.setup();
    setup();
    const p = api.prompt('Nome', '', 'Nome', { required: true });
    await waitFor(() => expect(dialog()).toBeTruthy());
    const input = screen.getByRole('textbox');
    await user.click(screen.getByRole('button', { name: 'OK' }));
    expect(dialog()).not.toBeNull();
    const error = dialog()!.querySelector<HTMLElement>('.eds-error')!;
    expect(error).toBeVisible();
    expect(error).toHaveTextContent('Preencha este campo.');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', error.id);
    await waitFor(() => expect(input).toHaveFocus());
    expect(error).toHaveAttribute('role', 'alert');
    expect(dialog()!.querySelector('[role="status"]')).toBeNull();
    expect(dialog()!.querySelectorAll('[role="alert"]')).toHaveLength(1);
    await user.keyboard('Ana');
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(error).not.toBeVisible();
    await user.keyboard('{Enter}');
    await expect(p).resolves.toBe('Ana');
  });

  it('prompt validate: mensagem do consumidor; só fecha com valor válido', async () => {
    const user = userEvent.setup();
    setup();
    const p = api.prompt('E-mail', 'x', 'E-mail', {
      inputType: 'email',
      validate: (v) => (v.includes('@') ? '' : 'Informe um e-mail válido.'),
    });
    await waitFor(() => expect(dialog()).toBeTruthy());
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('type', 'email');
    await user.keyboard('{Enter}');
    expect(dialog()!.querySelector('.eds-error')).toHaveTextContent('Informe um e-mail válido.');
    await user.clear(input);
    await user.type(input, 'a@b.c{Enter}');
    await expect(p).resolves.toBe('a@b.c');
  });

  it('prompt textarea: Enter quebra linha; Ctrl+Enter confirma', async () => {
    const user = userEvent.setup();
    setup();
    const p = api.prompt('Motivo', '', 'Motivo', { inputType: 'textarea' });
    await waitFor(() => expect(dialog()).toBeTruthy());
    await user.keyboard('a{Enter}b');
    expect(dialog()).not.toBeNull();
    await user.keyboard('{Control>}{Enter}{/Control}');
    await expect(p).resolves.toBe('a\nb');
  });

  it('textos configuráveis no provider e nas opções', async () => {
    setup({
      texts: { ok: 'Entendi', cancel: 'Voltar', confirm: 'Sim', severity: { danger: 'Error:' } },
    });
    void api.alert('x', 'T', 'danger');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Entendi' })).toBeTruthy());
    expect(dialog()!.querySelector('.eds-alert-dialog-title')).toHaveTextContent('Error: T');
    screen.getByRole('button', { name: 'Entendi' }).click();
    void api.confirm('y');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Sim' })).toBeTruthy());
    expect(screen.getByRole('button', { name: 'Voltar' })).toBeInTheDocument();
    screen.getByRole('button', { name: 'Voltar' }).click();
    void api.confirm('z', undefined, undefined, { okText: 'Fazer', cancelText: 'Não' });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Fazer' })).toBeTruthy());
    expect(screen.getByRole('button', { name: 'Não' })).toBeInTheDocument();
  });

  it('fila: chamadas simultâneas aparecem uma por vez, em ordem', async () => {
    const user = userEvent.setup();
    setup();
    screen.getByRole('button', { name: 'Abrir' }).focus();
    const order: string[] = [];
    void api.alert('Primeiro').then(() => order.push('a'));
    void api.confirm('Segundo').then((v) => order.push(`b:${v}`));
    void api.prompt('Terceiro', 'v').then((v) => order.push(`c:${v}`));
    await waitFor(() => expect(dialog()).toBeTruthy());
    expect(document.querySelectorAll('dialog')).toHaveLength(1);
    expect(dialog()).toHaveTextContent('Primeiro');
    await user.click(screen.getByRole('button', { name: 'OK' }));
    await waitFor(() => expect(dialog()).toHaveTextContent('Segundo'));
    expect(document.querySelectorAll('dialog')).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(dialog()).toHaveTextContent('Terceiro'));
    await user.keyboard('{Enter}');
    await waitFor(() => expect(order).toEqual(['a', 'b:true', 'c:v']));
    // O foco volta ao elemento de antes da primeira chamada.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Abrir' })).toHaveFocus());
  });

  it('Esc num diálogo rápido sobre um Modal não fecha o Modal', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <DialogProvider>
        <Modal open onClose={onClose} title="Editar">
          <Grab />
        </Modal>
      </DialogProvider>,
    );
    const p = api.confirm('Descartar?');
    await waitFor(() => expect(dialog()).toBeTruthy());
    await user.keyboard('{Escape}');
    await expect(p).resolves.toBe(false);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('desmontar o provider resolve as pendentes como canceladas', async () => {
    const { unmount } = setup();
    const a = api.confirm('A');
    const b = api.prompt('B');
    const c = api.alert('C');
    await waitFor(() => expect(dialog()).toBeTruthy());
    unmount();
    await expect(a).resolves.toBe(false);
    await expect(b).resolves.toBeNull();
    await expect(c).resolves.toBeUndefined();
  });

  it('fechamento nativo sem pedido do código (2º Esc do Chrome) cancela', async () => {
    setup();
    const p = api.confirm('Ok?');
    await waitFor(() => expect(dialog()).toBeTruthy());
    dialog()!.close();
    await expect(p).resolves.toBe(false);
    await waitFor(() => expect(dialog()).toBeNull());
  });

  it('funciona em StrictMode', async () => {
    const user = userEvent.setup();
    render(
      <StrictMode>
        <DialogProvider>
          <Grab />
        </DialogProvider>
      </StrictMode>,
    );
    const p = api.confirm('Ok?');
    await waitFor(() => expect(dialog()).toBeTruthy());
    await waitFor(() => expect(screen.getByRole('button', { name: 'Confirmar' })).toHaveFocus());
    await user.keyboard('{Enter}');
    await expect(p).resolves.toBe(true);
  });
});

describe('prompt com variant', () => {
  it('options.variant define ícone/cor e prefixo; danger vira alertdialog e não fecha pelo fundo', async () => {
    const user = userEvent.setup();
    setup();
    const p = api.prompt('Digite EXCLUIR', '', 'Confirmar exclusão', { variant: 'danger' });
    await waitFor(() => expect(dialog()).toBeTruthy());
    const d = dialog()!;
    expect(d).toHaveAttribute('data-variant', 'danger');
    expect(d).toHaveAttribute('role', 'alertdialog');
    expect(d.querySelector('.eds-alert-dialog-title')).toHaveTextContent(
      'Atenção: Confirmar exclusão',
    );
    await user.pointer([{ keys: '[MouseLeft>]', target: d }, { keys: '[/MouseLeft]' }]);
    expect(dialog()).not.toBeNull();
    await user.keyboard('{Escape}');
    await expect(p).resolves.toBeNull();
  });

  it('prompt required usa aria-required (sem required nativo); rótulo = título', async () => {
    setup();
    void api.prompt('Nome do arquivo', '', 'Salvar como', { required: true });
    await waitFor(() => expect(dialog()).toBeTruthy());
    const input = screen.getByRole('textbox', { name: 'Salvar como' });
    expect(input).toHaveAttribute('aria-required', 'true');
    expect(input).not.toHaveAttribute('required');
  });

  it('"Erro:" só no alert danger; confirm danger fala "Atenção:"', async () => {
    const user = userEvent.setup();
    setup();
    const c = api.confirm('Excluir?', 'Excluir pedido', 'danger');
    await waitFor(() => expect(dialog()).toBeTruthy());
    expect(dialog()!.querySelector('.eds-alert-dialog-title')).toHaveTextContent('Atenção:');
    await user.keyboard('{Escape}');
    await c;
    const a = api.alert('Falhou.', 'Falha', 'danger');
    await waitFor(() => expect(dialog()).toBeTruthy());
    expect(dialog()!.querySelector('.eds-alert-dialog-title')).toHaveTextContent('Erro:');
    await user.keyboard('{Escape}');
    await a;
  });

  it('sem variant o prompt é question', async () => {
    setup();
    void api.prompt('Nome');
    await waitFor(() => expect(dialog()).toBeTruthy());
    expect(dialog()).toHaveAttribute('data-variant', 'question');
  });
});
