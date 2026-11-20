import { fireEvent } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { init } from '../index';
import { initNumber } from './number';

let destroy: (() => void) | undefined;

const markup = (attrs = '', value = '5') => `
<form id="f">
  <label for="n">Quantidade</label>
  <div class="eds-number" data-eds-number>
    <button type="button" class="eds-number-button" aria-label="Diminuir" tabindex="-1">-</button>
    <input class="eds-input eds-number-input" id="n" name="qtd" type="text" inputmode="decimal"
      value="${value}" ${attrs} />
    <button type="button" class="eds-number-button" aria-label="Aumentar" tabindex="-1">+</button>
  </div>
</form>`;

const input = () => document.getElementById('n') as HTMLInputElement;
const [dec, inc] = [
  () => document.querySelectorAll<HTMLButtonElement>('.eds-number-button')[0]!,
  () => document.querySelectorAll<HTMLButtonElement>('.eds-number-button')[1]!,
];
const status = () => document.querySelector<HTMLElement>('.eds-number + [role="status"]')!;

function mount(attrs = '', value = '5') {
  document.body.innerHTML = markup(attrs, value);
  destroy = initNumber(document);
}

afterEach(() => {
  destroy?.();
  destroy = undefined;
  document.body.innerHTML = '';
  vi.useRealTimers();
});

describe('NumberInput', () => {
  it('é ligado pelo init() e expõe o padrão spinbutton', () => {
    document.body.innerHTML = markup('min="0" max="10" step="1"');
    destroy = init(document);
    expect(input()).toHaveAttribute('role', 'spinbutton');
    expect(input()).toHaveAttribute('aria-valuemin', '0');
    expect(input()).toHaveAttribute('aria-valuemax', '10');
    expect(input()).toHaveAttribute('aria-valuenow', '5');
  });

  it('↑/↓ somam um passo; PageUp/PageDown dez; Home/End vão ao mínimo e ao máximo', async () => {
    mount('min="0" max="100" step="1"');
    const user = userEvent.setup();
    await user.click(input());
    await user.keyboard('{ArrowUp}');
    expect(input()).toHaveValue('6');
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(input()).toHaveValue('4');
    await user.keyboard('{PageUp}');
    expect(input()).toHaveValue('14');
    await user.keyboard('{PageDown}{PageDown}');
    expect(input()).toHaveValue('0');
    await user.keyboard('{End}');
    expect(input()).toHaveValue('100');
    await user.keyboard('{Home}');
    expect(input()).toHaveValue('0');
  });

  it('respeita o passo e as casas decimais do passo', async () => {
    mount('min="0" max="1" step="0.25" data-eds-number-decimals="2"', '0');
    const user = userEvent.setup();
    await user.click(input());
    await user.keyboard('{ArrowUp}{ArrowUp}{ArrowUp}');
    expect(input()).toHaveValue('0,75');
    expect(input()).toHaveAttribute('aria-valuenow', '0.75');
  });

  it('os botões somam e subtraem, ficam fora do Tab e se desabilitam nos limites', async () => {
    mount('min="4" max="6" step="1"');
    const user = userEvent.setup();
    expect(inc()).toHaveAttribute('tabindex', '-1');
    await user.click(inc());
    expect(input()).toHaveValue('6');
    expect(inc()).toBeDisabled();
    await user.click(dec());
    await user.click(dec());
    expect(input()).toHaveValue('4');
    expect(dec()).toBeDisabled();
  });

  it('o botão que se desabilita com o foco nele (limite) devolve o foco ao campo', async () => {
    mount('min="0" max="6" step="1"');
    inc().focus();
    expect(document.activeElement).toBe(inc());
    inc().click();
    expect(input()).toHaveValue('6');
    expect(inc()).toBeDisabled();
    expect(document.activeElement).toBe(input());
  });

  it('ativar o botão pelo teclado soma um passo (e o clique do mouse, só um)', async () => {
    mount('max="10"');
    const user = userEvent.setup();
    await user.click(inc());
    expect(input()).toHaveValue('6');
    inc().focus();
    await user.keyboard('{Enter}');
    expect(input()).toHaveValue('7');
  });

  it('segurar o botão repete', () => {
    vi.useFakeTimers();
    mount('max="100"');
    fireEvent.pointerDown(inc(), { button: 0 });
    expect(input()).toHaveValue('6');
    vi.advanceTimersByTime(400 + 70 * 3);
    expect(Number(input().value)).toBeGreaterThanOrEqual(9);
    fireEvent.pointerUp(inc());
    const stopped = input().value;
    vi.advanceTimersByTime(500);
    expect(input().value).toBe(stopped);
  });

  it('digitado fora da faixa é ajustado ao sair e anunciado', async () => {
    mount('min="0" max="10"');
    const user = userEvent.setup();
    await user.clear(input());
    await user.type(input(), '99');
    await user.tab();
    expect(input()).toHaveValue('10');
    expect(status()).toHaveTextContent('Valor ajustado para 10.');
  });

  it('só aceita dígitos e o sinal "-" quando o mínimo permite negativos', async () => {
    mount('', '');
    const user = userEvent.setup();
    await user.type(input(), '1a2-3');
    expect(input()).toHaveValue('123');
    await user.clear(input());
    mount('min="-5" max="5"', '');
    await user.type(input(), '-3');
    expect(input()).toHaveValue('-3');
  });

  it('com casas decimais usa a máscara numero e emite eds:number-change', async () => {
    mount('min="0" max="9999" step="0.5" data-eds-number-decimals="2"', '1.5');
    expect(input()).toHaveValue('1,50');
    const seen: (number | null)[] = [];
    document
      .querySelector('[data-eds-number]')!
      .addEventListener('eds:number-change', (e) =>
        seen.push((e as CustomEvent<{ value: number | null }>).detail.value),
      );
    const user = userEvent.setup();
    await user.click(input());
    await user.keyboard('{ArrowUp}');
    expect(input()).toHaveValue('2,00');
    expect(seen).toEqual([2]);
  });

  it('data-eds-number-unmask manda o valor limpo no hidden', async () => {
    document.body.innerHTML = markup('data-eds-number-decimals="2"', '1234.5').replace(
      'data-eds-number>',
      'data-eds-number data-eds-number-unmask>',
    );
    destroy = initNumber(document);
    expect(input()).toHaveValue('1.234,50');
    expect(new FormData(document.getElementById('f') as HTMLFormElement).get('qtd')).toBe(
      '1234.50',
    );
  });

  it('campo vazio: ↑ parte do mínimo; apagar tudo emite null', async () => {
    mount('min="3"', '');
    const user = userEvent.setup();
    await user.click(input());
    await user.keyboard('{ArrowUp}');
    expect(input()).toHaveValue('3');
    await user.clear(input());
    await user.tab();
    expect(input()).toHaveValue('');
    expect(input()).not.toHaveAttribute('aria-valuenow');
  });

  it('readonly não muda com teclado nem com botões', async () => {
    mount('readonly');
    const user = userEvent.setup();
    await user.click(input());
    await user.keyboard('{ArrowUp}');
    await user.click(inc());
    expect(input()).toHaveValue('5');
  });

  it('com data-eds-mask do autor, a máscara edita e o número só lê', async () => {
    mount('data-eds-mask="numero" data-eds-mask-decimals="2" min="0"', '3');
    // O init completo liga a máscara; aqui só o número: o valor continua legível.
    expect(input()).toHaveValue('3,00');
  });
});
