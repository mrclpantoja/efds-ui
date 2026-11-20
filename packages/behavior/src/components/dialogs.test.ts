import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { init, resetMessages, configure } from '../index';
import { flush, installDomPolyfills } from '../test-utils/dom-polyfills';
import { alert, confirm, prompt } from './dialogs';

const dlg = () => document.querySelector<HTMLDialogElement>('dialog.eds-alert-dialog');
const dialogs = () => Array.from(document.querySelectorAll('dialog.eds-alert-dialog'));
const btn = (label: string) =>
  Array.from(dlg()!.querySelectorAll('button')).find((b) => b.textContent === label)!;
const field = () =>
  dlg()!.querySelector<HTMLInputElement | HTMLTextAreaElement>('input, textarea')!;
const cancelEsc = () => dlg()!.dispatchEvent(new Event('cancel', { cancelable: true }));
const backdropClick = () => {
  const d = dlg()!;
  d.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
  d.dispatchEvent(new MouseEvent('click', { bubbles: true }));
};

describe('diálogos rápidos', () => {
  let restore: () => void;
  beforeEach(() => {
    restore = installDomPolyfills();
    document.body.innerHTML = '<main><button id="origem" type="button">Abrir</button></main>';
    document.getElementById('origem')!.focus();
  });
  afterEach(async () => {
    while (dlg()) {
      cancelEsc();
      await flush();
    }
    resetMessages();
    restore();
    document.body.innerHTML = '';
  });

  describe('markup', () => {
    it('monta as classes do contrato, o nome e a descrição', async () => {
      const done = alert('Pedido salvo com sucesso.', 'Pedido', 'success');
      const d = dlg()!;
      expect(d.classList.contains('eds-modal')).toBe(true);
      expect(d.getAttribute('data-variant')).toBe('success');
      expect(d.open).toBe(true);
      expect(d.querySelector('.eds-alert-dialog-icon svg')).not.toBeNull();
      expect(d.querySelector('.eds-alert-dialog-icon')!.getAttribute('aria-hidden')).toBe('true');
      const title = d.querySelector('h2.eds-alert-dialog-title')!;
      const text = d.querySelector('p.eds-alert-dialog-text')!;
      expect(d.getAttribute('aria-labelledby')).toBe(title.id);
      expect(d.getAttribute('aria-describedby')).toBe(text.id);
      // prefixo oculto de severidade antes do título
      expect(title.querySelector('.eds-visually-hidden')!.textContent).toBe('Sucesso: ');
      expect(text.textContent).toBe('Pedido salvo com sucesso.');
      expect(d.querySelector('.eds-alert-dialog-actions button.eds-button-primary')).not.toBeNull();
      btn('OK').click();
      await done;
    });

    it('sem título o texto vira o nome e não há aria-describedby', async () => {
      const done = alert('Algo aconteceu.');
      const d = dlg()!;
      expect(d.querySelector('.eds-alert-dialog-title')).toBeNull();
      expect(d.getAttribute('aria-labelledby')).toBe(d.querySelector('.eds-alert-dialog-text')!.id);
      expect(d.hasAttribute('aria-describedby')).toBe(false);
      expect(d.getAttribute('data-variant')).toBe('info');
      btn('OK').click();
      await done;
    });

    it('danger usa botão danger; question não tem prefixo oculto', async () => {
      const a = confirm('Excluir o pedido PED-0001?', 'Excluir', 'danger');
      expect(btn('Confirmar').classList.contains('eds-button-danger')).toBe(true);
      btn('Cancelar').click();
      expect(await a).toBe(false);
      await flush();
      const b = confirm('Continuar?', 'Pergunta');
      expect(dlg()!.getAttribute('data-variant')).toBe('question');
      expect(dlg()!.querySelector('.eds-visually-hidden')).toBeNull();
      btn('Confirmar').click();
      await b;
    });

    it('role=alertdialog só em confirm/prompt de danger e warning', async () => {
      const a = confirm('x', 't', 'danger');
      expect(dlg()!.getAttribute('role')).toBe('alertdialog');
      btn('Cancelar').click();
      await a;
      await flush();
      const b = prompt('Nome', '', 't', { variant: 'warning' });
      expect(dlg()!.getAttribute('role')).toBe('alertdialog');
      btn('Cancelar').click();
      await b;
      await flush();
      const c = confirm('x', 't', 'info');
      expect(dlg()!.hasAttribute('role')).toBe(false);
      btn('Cancelar').click();
      await c;
      await flush();
      const d = alert('x', 't', 'danger');
      expect(dlg()!.hasAttribute('role')).toBe(false);
      btn('OK').click();
      await d;
    });

    it('textos e opções: okText, cancelText e textos do configure', async () => {
      const a = confirm('Excluir?', 'Excluir', 'danger', {
        okText: 'Excluir',
        cancelText: 'Voltar',
      });
      expect(btn('Excluir')).toBeTruthy();
      expect(btn('Voltar')).toBeTruthy();
      btn('Voltar').click();
      await a;
      await flush();
      configure({ messages: { dialogOk: 'Aceptar' } });
      const b = alert('Hola');
      expect(btn('Aceptar')).toBeTruthy();
      btn('Aceptar').click();
      await b;
    });

    it('insere o texto como texto, nunca como HTML', async () => {
      const done = alert('<img src=x onerror=alert(1)>', '<b>t</b>');
      expect(dlg()!.querySelector('img')).toBeNull();
      expect(dlg()!.querySelector('b')).toBeNull();
      btn('OK').click();
      await done;
    });
  });

  describe('retornos', () => {
    it('alert resolve undefined e confirm resolve true/false', async () => {
      const a = alert('ok');
      btn('OK').click();
      expect(await a).toBeUndefined();
      await flush();
      const b = confirm('ok?');
      btn('Confirmar').click();
      expect(await b).toBe(true);
      await flush();
      const c = confirm('ok?');
      btn('Cancelar').click();
      expect(await c).toBe(false);
    });

    it('prompt resolve o texto digitado ou null', async () => {
      const user = userEvent.setup();
      const a = prompt('Nome do arquivo', 'relatorio', 'Salvar como');
      await user.clear(field());
      await user.type(field(), 'vendas');
      btn('OK').click();
      expect(await a).toBe('vendas');
      await flush();
      const b = prompt('Nome do arquivo', 'relatorio');
      btn('Cancelar').click();
      expect(await b).toBeNull();
    });

    it('prompt: valor padrão, placeholder, tipo e rótulo oculto ligado ao campo', async () => {
      const a = prompt('Seu e-mail', 'a@b.test', 'E-mail', {
        inputType: 'email',
        placeholder: 'nome@exemplo.test',
      });
      const input = field() as HTMLInputElement;
      expect(input.type).toBe('email');
      expect(input.value).toBe('a@b.test');
      expect(input.placeholder).toBe('nome@exemplo.test');
      expect(input.classList.contains('eds-input')).toBe(true);
      const label = dlg()!.querySelector<HTMLLabelElement>('label.eds-visually-hidden')!;
      expect(label.htmlFor).toBe(input.id);
      expect(label.textContent).toBe('E-mail');
      btn('OK').click();
      expect(await a).toBe('a@b.test');
    });

    it('prompt sem título: o rótulo oculto é o texto; com aria-required (sem required nativo)', async () => {
      const a = prompt('Nome do arquivo', '', undefined, { required: true });
      const input = field() as HTMLInputElement;
      const label = dlg()!.querySelector<HTMLLabelElement>('label.eds-visually-hidden')!;
      expect(label.textContent).toBe('Nome do arquivo');
      expect(input).toHaveAttribute('aria-required', 'true');
      expect(input).not.toHaveAttribute('required');
      btn('Cancelar').click();
      await a;
    });

    it('confirm/prompt danger falam "Atenção:"; "Erro:" só no alert danger', async () => {
      const a = confirm('Excluir?', 'Excluir pedido', 'danger');
      expect(dlg()!.querySelector('h2 .eds-visually-hidden')).toHaveTextContent('Atenção:');
      btn('Cancelar').click();
      await a;
      await flush();
      const b = alert('Falhou.', 'Falha', 'danger');
      expect(dlg()!.querySelector('h2 .eds-visually-hidden')).toHaveTextContent('Erro:');
      btn('OK').click();
      await b;
    });

    it('prompt textarea: Enter quebra a linha, Ctrl+Enter confirma', async () => {
      const user = userEvent.setup();
      const a = prompt('Observação', '', undefined, { inputType: 'textarea' });
      expect(field().tagName).toBe('TEXTAREA');
      await user.type(field(), 'um{Enter}dois');
      expect(dlg()).not.toBeNull();
      await user.keyboard('{Control>}{Enter}{/Control}');
      expect(await a).toBe('um\ndois');
    });
  });

  describe('foco', () => {
    it('alert: no OK', async () => {
      const done = alert('x');
      expect(document.activeElement).toBe(btn('OK'));
      btn('OK').click();
      await done;
    });

    it('confirm: no Cancelar quando danger, no botão principal nos demais', async () => {
      const a = confirm('x', 't', 'danger');
      expect(document.activeElement).toBe(btn('Cancelar'));
      btn('Cancelar').click();
      await a;
      await flush();
      const b = confirm('x', 't');
      expect(document.activeElement).toBe(btn('Confirmar'));
      btn('Cancelar').click();
      await b;
    });

    it('prompt: no campo, com o texto selecionado', async () => {
      const a = prompt('Nome', 'relatorio');
      const input = field() as HTMLInputElement;
      expect(document.activeElement).toBe(input);
      expect(input.selectionStart).toBe(0);
      expect(input.selectionEnd).toBe('relatorio'.length);
      btn('Cancelar').click();
      await a;
    });

    it('devolve o foco a quem estava focado e remove o diálogo', async () => {
      const done = confirm('x');
      expect(document.activeElement).not.toBe(document.getElementById('origem'));
      btn('Cancelar').click();
      await done;
      expect(document.activeElement).toBe(document.getElementById('origem'));
      expect(dlg()).toBeNull();
    });
  });

  describe('Enter, Esc e fundo', () => {
    it('Enter no botão focado confirma', async () => {
      const user = userEvent.setup();
      const a = confirm('x', 't');
      await user.keyboard('{Enter}');
      expect(await a).toBe(true);
    });

    it('Enter no campo do prompt confirma', async () => {
      const user = userEvent.setup();
      const a = prompt('Nome', 'abc');
      await user.keyboard('{Enter}');
      expect(await a).toBe('abc');
    });

    it('Esc cancela: undefined, false e null', async () => {
      const a = alert('x');
      cancelEsc();
      expect(await a).toBeUndefined();
      await flush();
      const b = confirm('x');
      cancelEsc();
      expect(await b).toBe(false);
      await flush();
      const c = prompt('x');
      cancelEsc();
      expect(await c).toBeNull();
    });

    it('Esc não chega a quem está por trás (keydown com stopPropagation)', async () => {
      const seen: string[] = [];
      const spy = (e: KeyboardEvent) => seen.push(e.key);
      document.addEventListener('keydown', spy);
      const done = alert('x');
      dlg()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(seen).toEqual([]);
      cancelEsc();
      await done;
      document.removeEventListener('keydown', spy);
    });

    it('fechamento externo (2º Esc do Chrome, close sem resultado) resolve como cancelamento', async () => {
      const a = confirm('x');
      dlg()!.close();
      expect(await a).toBe(false);
      await flush();
      const b = prompt('x', 'y');
      dlg()!.close();
      expect(await b).toBeNull();
      await flush();
      const c = alert('x');
      dlg()!.close();
      expect(await c).toBeUndefined();
      await flush();
      expect(dlg()).toBeNull();
    });

    it('clique no fundo cancela', async () => {
      const a = confirm('x', 't', 'info');
      backdropClick();
      expect(await a).toBe(false);
      await flush();
      const b = alert('x');
      backdropClick();
      expect(await b).toBeUndefined();
    });

    it('danger não fecha no fundo', async () => {
      const a = confirm('x', 't', 'danger');
      backdropClick();
      await flush();
      expect(dlg()).not.toBeNull();
      expect(dlg()!.open).toBe(true);
      btn('Cancelar').click();
      expect(await a).toBe(false);
    });

    it('clique dentro da caixa (não no fundo) não fecha', async () => {
      const a = confirm('x', 't');
      dlg()!
        .querySelector('.eds-alert-dialog-text')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flush();
      expect(dlg()).not.toBeNull();
      btn('Cancelar').click();
      await a;
    });

    it('o clique de fora só conta se o pressionar também foi no fundo', async () => {
      const a = confirm('x', 't');
      dlg()!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flush();
      expect(dlg()).not.toBeNull();
      btn('Cancelar').click();
      await a;
    });
  });

  describe('prompt com validação', () => {
    it('required: erro visível, aria-invalid, sem fechar; limpa ao digitar', async () => {
      const user = userEvent.setup();
      const a = prompt('Nome', '', 'Nome', { required: true });
      btn('OK').click();
      const error = dlg()!.querySelector<HTMLElement>('p.eds-error')!;
      expect(error.hidden).toBe(false);
      expect(error.textContent).toBe('Preencha este campo.');
      expect(field().getAttribute('aria-invalid')).toBe('true');
      expect(field().getAttribute('aria-describedby')).toContain(error.id);
      expect(document.activeElement).toBe(field());
      expect(dlg()).not.toBeNull();
      await user.type(field(), 'x');
      expect(error.hidden).toBe(true);
      expect(field().hasAttribute('aria-invalid')).toBe(false);
      expect(field().hasAttribute('aria-describedby')).toBe(false);
      btn('OK').click();
      expect(await a).toBe('x');
    });

    it('required não aceita só espaços', async () => {
      const user = userEvent.setup();
      const a = prompt('Nome', '   ', undefined, { required: true });
      btn('OK').click();
      expect(dlg()).not.toBeNull();
      expect(field().getAttribute('aria-invalid')).toBe('true');
      await user.clear(field());
      await user.type(field(), 'ok');
      btn('OK').click();
      expect(await a).toBe('ok');
    });

    it('validate: mostra a mensagem devolvida e só fecha quando vem vazia', async () => {
      const user = userEvent.setup();
      const a = prompt('Código', 'abc', 'Código', {
        validate: (v) => (/^\d+$/.test(v) ? '' : 'Use só números.'),
      });
      btn('OK').click();
      expect(dlg()!.querySelector('p.eds-error')!.textContent).toBe('Use só números.');
      expect(dlg()).not.toBeNull();
      await user.clear(field());
      await user.type(field(), '123');
      btn('OK').click();
      expect(await a).toBe('123');
    });

    it('Esc ainda cancela com erro visível', async () => {
      const a = prompt('Nome', '', undefined, { required: true });
      btn('OK').click();
      cancelEsc();
      expect(await a).toBeNull();
    });
  });

  describe('fila', () => {
    it('mostra um por vez, na ordem', async () => {
      const order: string[] = [];
      const a = alert('primeiro').then(() => order.push('a'));
      const b = confirm('segundo').then((v) => order.push(`b:${v}`));
      const c = prompt('terceiro', 'z').then((v) => order.push(`c:${v}`));
      expect(dialogs()).toHaveLength(1);
      expect(dlg()!.querySelector('.eds-alert-dialog-text')!.textContent).toContain('primeiro');
      btn('OK').click();
      await a;
      await flush();
      expect(dialogs()).toHaveLength(1);
      expect(dlg()!.querySelector('.eds-alert-dialog-text')!.textContent).toContain('segundo');
      btn('Confirmar').click();
      await b;
      await flush();
      expect(dialogs()).toHaveLength(1);
      expect(dlg()!.querySelector('.eds-alert-dialog-text')!.textContent).toContain('terceiro');
      btn('OK').click();
      await c;
      expect(order).toEqual(['a', 'b:true', 'c:z']);
      await flush();
      expect(dlg()).toBeNull();
    });

    it('o foco volta ao elemento original só depois do último da fila', async () => {
      const a = alert('um');
      const b = alert('dois');
      btn('OK').click();
      await a;
      await flush();
      expect(document.activeElement).toBe(btn('OK'));
      btn('OK').click();
      await b;
      expect(document.activeElement).toBe(document.getElementById('origem'));
    });
  });

  describe('window.alert (opt-in)', () => {
    it('não troca nada por padrão', () => {
      const original = window.alert;
      const stop = init(document);
      expect(window.alert).toBe(original);
      stop();
    });

    it('nativeAlert: window.alert vira EDS.alert, não bloqueia e o destroy restaura', async () => {
      const original = window.alert;
      const originalConfirm = window.confirm;
      const originalPrompt = window.prompt;
      const stop = init(document, { nativeAlert: true });
      expect(window.alert).not.toBe(original);
      expect(window.confirm).toBe(originalConfirm);
      expect(window.prompt).toBe(originalPrompt);
      const result = (window.alert as (m?: unknown) => unknown)('Pedido salvo.');
      expect(result).toBeUndefined();
      expect(dlg()!.querySelector('.eds-alert-dialog-text')!.textContent).toContain(
        'Pedido salvo.',
      );
      btn('OK').click();
      await flush();
      (window.alert as (m?: unknown) => unknown)(42);
      expect(dlg()!.querySelector('.eds-alert-dialog-text')!.textContent).toContain('42');
      stop();
      expect(window.alert).toBe(original);
    });

    it('com dois init, só restaura quando o último sai', () => {
      const original = window.alert;
      const a = init(document, { nativeAlert: true });
      const b = init(document, { nativeAlert: true });
      a();
      expect(window.alert).not.toBe(original);
      b();
      expect(window.alert).toBe(original);
    });

    it('destroy é idempotente', () => {
      const original = window.alert;
      const stop = init(document, { nativeAlert: true });
      stop();
      stop();
      expect(window.alert).toBe(original);
    });
  });
});
