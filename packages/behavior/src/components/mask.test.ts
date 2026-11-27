import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { init } from '../index';
import { initMask } from './mask';

let destroy: (() => void) | undefined;

function stop() {
  destroy?.();
  destroy = undefined;
}

function mount(html: string) {
  document.body.innerHTML = html;
  destroy = initMask(document);
}

const field = (attrs: string, extra = '') =>
  `<form id="f"><label for="c">Campo</label><input id="c" class="eds-input" name="campo" ${attrs} />${extra}</form>`;
const input = () => document.getElementById('c') as HTMLInputElement;
const hidden = () => document.querySelector<HTMLInputElement>('input[data-mask-raw]');

afterEach(() => {
  stop();
  document.body.innerHTML = '';
});

describe('máscara (behavior)', () => {
  it('é ligada pelo init() e define inputmode, autocomplete e maxlength', () => {
    document.body.innerHTML = field('data-eds-mask="telefone"');
    const stop = init(document);
    expect(input()).toHaveAttribute('inputmode', 'tel');
    expect(input()).toHaveAttribute('autocomplete', 'tel');
    expect(input()).toHaveAttribute('maxlength', '15');
    stop();
  });

  it('nunca sobrescreve atributos do autor e desfaz os que pôs ao destruir', () => {
    mount(field('data-eds-mask="cep" inputmode="text" autocomplete="off" maxlength="20"'));
    expect(input()).toHaveAttribute('inputmode', 'text');
    expect(input()).toHaveAttribute('autocomplete', 'off');
    expect(input()).toHaveAttribute('maxlength', '20');
    stop();
    mount(field('data-eds-mask="cep"'));
    expect(input()).toHaveAttribute('autocomplete', 'postal-code');
    stop();
    expect(input()).not.toHaveAttribute('autocomplete');
    expect(input()).not.toHaveAttribute('maxlength');
  });

  it('moeda não recebe maxlength nem autocomplete', () => {
    mount(field('data-eds-mask="moeda"'));
    expect(input()).toHaveAttribute('inputmode', 'decimal');
    expect(input()).not.toHaveAttribute('maxlength');
    expect(input()).not.toHaveAttribute('autocomplete');
  });

  it('digitando, aplica a máscara de telefone', async () => {
    mount(field('data-eds-mask="telefone"'));
    await userEvent.type(input(), '11987654321');
    expect(input()).toHaveValue('(11) 98765-4321');
  });

  it('o valor enviado é o mascarado por padrão', async () => {
    mount(field('data-eds-mask="cpf"'));
    await userEvent.type(input(), '12345678900');
    expect(new FormData(document.getElementById('f') as HTMLFormElement).get('campo')).toBe(
      '123.456.789-00',
    );
    expect(hidden()).toBeNull();
  });

  it('digitar no meio preserva o cursor', async () => {
    mount(field('data-eds-mask="cpf"', ''));
    input().value = '123.456.789';
    await userEvent.click(input());
    input().setSelectionRange(2, 2);
    await userEvent.keyboard('9');
    expect(input()).toHaveValue('129.345.678-9');
    expect(input().selectionStart).toBe(3);
    await userEvent.keyboard('{Backspace}');
    expect(input().selectionStart).toBe(2);
  });

  it('Backspace sobre o literal apaga o dígito anterior', async () => {
    mount(field('data-eds-mask="cpf" value="123.456.789-00"'));
    await userEvent.click(input());
    input().setSelectionRange(4, 4);
    await userEvent.keyboard('{Backspace}');
    expect(input()).toHaveValue('124.567.890-0');
    expect(input().selectionStart).toBe(2);
  });

  it('colar com e sem máscara, sem cortar pelo maxlength', async () => {
    mount(field('data-eds-mask="telefone"'));
    await userEvent.click(input());
    await userEvent.paste('+55 (11) 98765-4321');
    expect(input()).toHaveValue('(11) 98765-4321');
    await userEvent.clear(input());
    await userEvent.paste('11987654321');
    expect(input()).toHaveValue('(11) 98765-4321');
  });

  it('colar dispara input para quem escuta e o evento eds:mask-change', async () => {
    mount(field('data-eds-mask="cep"'));
    const onInput = vi.fn();
    const onChange = vi.fn();
    input().addEventListener('input', onInput);
    document.addEventListener('eds:mask-change', (e) => onChange((e as CustomEvent).detail));
    await userEvent.click(input());
    await userEvent.paste('96010000');
    expect(onInput).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith({ value: '96010-000', raw: '96010000' });
  });

  it('moeda: centavos primeiro e valor limpo com unmask', async () => {
    mount(field('data-eds-mask="moeda" data-eds-mask-unmask'));
    expect(input()).not.toHaveAttribute('name');
    expect(hidden()).toHaveAttribute('name', 'campo');
    await userEvent.type(input(), '123456');
    expect(input()).toHaveValue('R$ 1.234,56');
    expect(hidden()).toHaveValue('1234.56');
    expect(new FormData(document.getElementById('f') as HTMLFormElement).get('campo')).toBe(
      '1234.56',
    );
  });

  it('unmask: cpf envia só os dígitos', async () => {
    mount(field('data-eds-mask="cpf" data-eds-mask-unmask'));
    await userEvent.type(input(), '12345678900');
    expect(hidden()).toHaveValue('12345678900');
    expect(input()).toHaveValue('123.456.789-00');
  });

  it('unmask sem name não cria hidden', () => {
    mount('<input id="c" data-eds-mask="cpf" data-eds-mask-unmask />');
    expect(hidden()).toBeNull();
  });

  it('unmask: o hidden acompanha disabled e é removido (com o name devolvido) ao destruir', async () => {
    mount(field('data-eds-mask="cpf" data-eds-mask-unmask'));
    input().disabled = true;
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));
    expect(hidden()?.disabled).toBe(true);
    stop();
    expect(hidden()).toBeNull();
    expect(input()).toHaveAttribute('name', 'campo');
  });

  it('opções da moeda: casas, símbolo e negativo', async () => {
    mount(
      field(
        'data-eds-mask="moeda" data-eds-mask-decimals="0" data-eds-mask-prefix="US$ " data-eds-mask-negative',
      ),
    );
    expect(input()).toHaveAttribute('inputmode', 'text');
    await userEvent.type(input(), '-1500');
    expect(input()).toHaveValue('-US$ 1.500');
  });

  it('prefixo vazio é respeitado', async () => {
    mount(field('data-eds-mask="moeda" data-eds-mask-prefix=""'));
    await userEvent.type(input(), '150');
    expect(input()).toHaveValue('1,50');
  });

  it('padrão personalizado', async () => {
    mount(field('data-eds-mask="00.000-AAA"'));
    await userEvent.type(input(), '12345abc');
    expect(input()).toHaveValue('12.345-ABC');
  });

  it('valor inicial vindo do servidor sem máscara é formatado', () => {
    mount(field('data-eds-mask="moeda" data-eds-mask-unmask value="1234.5"'));
    expect(input()).toHaveValue('R$ 1.234,50');
    expect(hidden()).toHaveValue('1234.50');
    stop();
    mount(field('data-eds-mask="cnpj" value="12abc345000102"'));
    expect(input()).toHaveValue('12.ABC.345/0001-02');
  });

  it('valor posto por script é refeito ao sair do campo e ao enviar', async () => {
    mount(
      field('data-eds-mask="cpf" data-eds-mask-unmask') + '<button id="b" type="button">x</button>',
    );
    input().value = '12345678900';
    input().dispatchEvent(new Event('change', { bubbles: true }));
    expect(input()).toHaveValue('123.456.789-00');
    expect(hidden()).toHaveValue('12345678900');
    input().value = '98765432100';
    (document.getElementById('f') as HTMLFormElement).dispatchEvent(
      new Event('submit', { cancelable: true }),
    );
    expect(hidden()).toHaveValue('98765432100');
  });

  it('reset do formulário refaz o valor inicial', async () => {
    mount(field('data-eds-mask="cpf" data-eds-mask-unmask value="12345678900"'));
    await userEvent.clear(input());
    await userEvent.type(input(), '111');
    (document.getElementById('f') as HTMLFormElement).reset();
    await new Promise((r) => setTimeout(r, 5));
    expect(input()).toHaveValue('123.456.789-00');
    expect(hidden()).toHaveValue('12345678900');
  });

  it('liga campos que entram depois (parciais do servidor)', async () => {
    mount('<div id="area"></div>');
    document.getElementById('area')!.innerHTML = field('data-eds-mask="cep"');
    await new Promise((r) => setTimeout(r, 0));
    await userEvent.type(input(), '96010000');
    expect(input()).toHaveValue('96010-000');
  });

  it('máscara em branco não liga nada', async () => {
    mount(field('data-eds-mask=""'));
    await userEvent.type(input(), 'abc');
    expect(input()).toHaveValue('abc');
  });

  it('não liga duas vezes o mesmo campo', async () => {
    mount(field('data-eds-mask="cpf"'));
    const second = initMask(document);
    await userEvent.type(input(), '12345678900');
    expect(input()).toHaveValue('123.456.789-00');
    second();
  });
});
