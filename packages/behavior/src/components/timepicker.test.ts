import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetMessages, setMessages } from '../core/config';
import { flush, installDomPolyfills } from '../test-utils/dom-polyfills';
import { formatTime, initTimepicker, maskTime, parseTime } from './timepicker';

const html = (attrs = '', extra = '') => `
<form>
  <label class="eds-label" for="hora">Horário</label>
  <div class="eds-timepicker" data-eds-timepicker ${attrs}>
    <input id="hora" class="eds-input eds-timepicker-input" type="text" ${extra} />
    <button type="button" class="eds-timepicker-toggle" aria-label="Escolher horário"></button>
    <input type="hidden" name="hora" id="oculto" />
    <div class="eds-timepicker-popup" popover="manual"></div>
    <span class="eds-visually-hidden" role="status"></span>
  </div>
  <button type="button" id="fora">fora</button>
</form>`;

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector(sel) as T;
const input = () => $<HTMLInputElement>('#hora');
const hidden = () => $<HTMLInputElement>('#oculto');
const options = () =>
  Array.from(document.querySelectorAll('.eds-timepicker-popup [role="option"]')).map((o) =>
    o.getAttribute('data-value'),
  );

let restore: () => void;
let destroy: () => void;

beforeEach(() => {
  restore = installDomPolyfills();
});
afterEach(() => {
  destroy?.();
  restore();
  resetMessages();
  document.body.innerHTML = '';
});

const setup = (attrs = '', extra = '') => {
  document.body.innerHTML = html(attrs, extra);
  destroy = initTimepicker(document);
};

describe('funções puras', () => {
  it('parseTime e formatTime', () => {
    expect(parseTime('08:30')).toBe(510);
    expect(parseTime('23:59')).toBe(1439);
    expect(parseTime('24:00')).toBeNull();
    expect(parseTime('12:60')).toBeNull();
    expect(parseTime('8:30')).toBeNull();
    expect(formatTime(510)).toBe('08:30');
  });
  it('maskTime', () => {
    expect(maskTime('1')).toBe('1');
    expect(maskTime('9')).toBe('09');
    expect(maskTime('143')).toBe('14:3');
    expect(maskTime('1430')).toBe('14:30');
    expect(maskTime('14305')).toBe('14:30');
    expect(maskTime('14:')).toBe('14:');
    expect(maskTime('2h30')).toBe('02:30');
    expect(maskTime('abc')).toBe('');
  });
});

describe('TimePicker', () => {
  it('liga o combobox (APG) e nomeia lista e botão', () => {
    setup();
    expect(input()).toHaveAttribute('role', 'combobox');
    expect(input()).toHaveAttribute('aria-haspopup', 'listbox');
    expect(input()).toHaveAttribute('aria-expanded', 'false');
    expect(input()).toHaveAttribute('placeholder', 'hh:mm');
    expect($('[role="listbox"]')).toHaveAccessibleName('Horários');
    expect($('.eds-timepicker-toggle')).toHaveAttribute('tabindex', '-1');
  });

  it('aplica a máscara e grava HH:MM no hidden só quando completo e válido', async () => {
    setup();
    const user = userEvent.setup();
    await user.type(input(), '1430');
    expect(input().value).toBe('14:30');
    expect(hidden().value).toBe('14:30');
    await user.clear(input());
    expect(hidden().value).toBe('');
    await user.type(input(), '143');
    expect(input().value).toBe('14:3');
    expect(hidden().value).toBe('');
  });

  it('hora iniciada em 3 a 9 vira 0h e o cursor continua no fim ("930" vira 09:30)', async () => {
    setup();
    const user = userEvent.setup();
    await user.type(input(), '930');
    expect(input().value).toBe('09:30');
    expect(hidden().value).toBe('09:30');
  });

  it('valida 25:00 ao sair do campo, com erro visível ligado ao campo', async () => {
    setup();
    const user = userEvent.setup();
    await user.type(input(), '2500');
    await user.click($('#fora'));
    expect(input()).toBeInvalid();
    const error = $('.eds-error');
    expect(error.textContent).toBe('Hora inválida. Use hh:mm, de 00:00 a 23:59.');
    expect(input().getAttribute('aria-describedby')).toContain(error.id);
    expect(hidden().value).toBe('');
    await user.clear(input());
    await user.type(input(), '2300');
    expect(document.querySelector('.eds-error')).toBeNull();
    expect(input()).toBeValid();
  });

  it('min e max: lista só dentro da faixa e rejeita o digitado fora dela', async () => {
    setup('data-eds-step="60" data-eds-min="08:00" data-eds-max="12:00"');
    const user = userEvent.setup();
    await user.click(input());
    await user.keyboard('{ArrowDown}');
    expect(options()).toEqual(['08:00', '09:00', '10:00', '11:00', '12:00']);
    await user.keyboard('{Escape}');
    await user.type(input(), '1500');
    await user.click($('#fora'));
    expect($('.eds-error').textContent).toBe('Escolha um horário entre 08:00 e 12:00.');
    expect(hidden().value).toBe('');
  });

  it('passo padrão de 30 min e passo configurável de 15', async () => {
    setup();
    const user = userEvent.setup();
    await user.click(input());
    await user.keyboard('{ArrowDown}');
    expect(options()).toHaveLength(48);
    expect(options().slice(0, 3)).toEqual(['00:00', '00:30', '01:00']);
    destroy();
    setup('data-eds-step="15" data-eds-min="09:00" data-eds-max="10:00"');
    await userEvent.setup().click(input());
    await userEvent.setup().keyboard('{ArrowDown}');
    expect(options()).toEqual(['09:00', '09:15', '09:30', '09:45', '10:00']);
  });

  it('teclado: ArrowDown abre e destaca o próximo horário; Enter escolhe; Esc fecha só a lista', async () => {
    setup('data-eds-step="15"');
    const user = userEvent.setup();
    const onChange = vi.fn();
    $('.eds-timepicker').addEventListener('eds:time-change', onChange);
    await user.type(input(), '0910');
    await user.keyboard('{ArrowDown}');
    expect(input()).toHaveAttribute('aria-expanded', 'true');
    // O primeiro horário da grade depois de 09:10 é 09:15.
    const active = document.getElementById(input().getAttribute('aria-activedescendant') ?? '');
    expect(active?.getAttribute('data-value')).toBe('09:15');
    expect(active).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{ArrowDown}');
    expect(
      document.getElementById(input().getAttribute('aria-activedescendant') ?? '')?.textContent,
    ).toBe('09:30');
    await user.keyboard('{Enter}');
    expect(input().value).toBe('09:30');
    expect(hidden().value).toBe('09:30');
    expect(input()).toHaveAttribute('aria-expanded', 'false');
    expect(document.activeElement).toBe(input());
    expect(onChange).toHaveBeenCalled();
    const last = onChange.mock.calls[onChange.mock.calls.length - 1]?.[0] as CustomEvent;
    expect(last.detail).toEqual({ value: '09:30', minutes: 570 });
    await user.keyboard('{ArrowDown}');
    expect(input()).toHaveAttribute('aria-expanded', 'true');
    const esc = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    input().dispatchEvent(esc);
    expect(input()).toHaveAttribute('aria-expanded', 'false');
    expect(esc.defaultPrevented).toBe(true);
  });

  it('clique na opção escolhe sem tirar o foco; botão abre e fecha a lista', async () => {
    setup('data-eds-step="60"');
    const user = userEvent.setup();
    await user.click($('.eds-timepicker-toggle'));
    expect(input()).toHaveAttribute('aria-expanded', 'true');
    expect($('.eds-timepicker-toggle')).toHaveAttribute('aria-expanded', 'true');
    await user.click($('[data-value="13:00"]'));
    expect(input().value).toBe('13:00');
    expect(document.activeElement).toBe(input());
    expect($('.eds-timepicker-toggle')).toHaveAccessibleName('Escolher horário. Atual: 13:00');
    await user.click($('.eds-timepicker-toggle'));
    await user.click($('.eds-timepicker-toggle'));
    expect(input()).toHaveAttribute('aria-expanded', 'false');
  });

  it('anuncia o horário escolhido e marca o atual na lista', async () => {
    setup('data-eds-step="60"');
    const user = userEvent.setup();
    await user.click($('.eds-timepicker-toggle'));
    await user.click($('[data-value="09:00"]'));
    await flush();
    expect($('[role="status"]').textContent).toBe('Horário selecionado: 09:00.');
    await user.click($('.eds-timepicker-toggle'));
    expect($('[data-value="09:00"]')).toHaveAttribute('data-current');
  });

  it('aceita valor inicial do servidor e o normaliza', () => {
    setup();
    destroy();
    document.body.innerHTML = html();
    $<HTMLInputElement>('#oculto').value = '07:05';
    destroy = initTimepicker(document);
    expect(input().value).toBe('07:05');
    expect($('.eds-timepicker-toggle')).toHaveAccessibleName('Escolher horário. Atual: 07:05');
  });

  it('valor inicial fora da faixa mostra o erro (reaproveitando o p.eds-error do autor)', () => {
    document.body.innerHTML = `<div class="eds-timepicker" data-eds-timepicker data-eds-min="08:00" data-eds-max="18:00">
      <input id="hora" class="eds-input" type="text" value="19:30" />
      <input type="hidden" id="oculto" /><div class="eds-timepicker-popup" popover="manual"></div></div>
      <p class="eds-error" id="erro">Escolha um horário entre 08:00 e 18:00.</p>`;
    destroy = initTimepicker(document);
    expect(input()).toHaveAttribute('aria-invalid', 'true');
    expect(input().getAttribute('aria-describedby')).toBe('erro');
    expect(document.querySelectorAll('.eds-error')).toHaveLength(1);
    expect(hidden().value).toBe('');
  });

  it('colar "14h30" vira 14:30', async () => {
    setup();
    const user = userEvent.setup();
    await user.click(input());
    await user.paste('14h30');
    expect(input().value).toBe('14:30');
    expect(hidden().value).toBe('14:30');
  });

  it('ignora data-eds-mask="hora" no campo (a máscara é do próprio TimePicker)', () => {
    setup('', 'data-eds-mask="hora"');
    expect(input()).not.toHaveAttribute('data-eds-mask');
  });

  it('readonly não abre a lista e textos são configuráveis', async () => {
    setMessages({ timeList: 'Times', maskInvalidTime: 'Bad time' });
    setup('', 'readonly');
    const user = userEvent.setup();
    expect($('[role="listbox"]')).toHaveAccessibleName('Times');
    await user.click(input());
    await user.keyboard('{ArrowDown}');
    expect(input()).toHaveAttribute('aria-expanded', 'false');
  });
});
