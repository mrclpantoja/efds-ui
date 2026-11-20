import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { init } from '../index';
import { initOtp } from './otp';

let destroy: (() => void) | undefined;

const cells = (n: number, extra = '') =>
  Array.from(
    { length: n },
    (_, i) =>
      `<input class="eds-input eds-otp-cell" inputmode="numeric" maxlength="1" ${
        i === 0 ? 'autocomplete="one-time-code"' : ''
      } aria-label="Dígito ${i + 1} de ${n}" ${extra} />`,
  ).join('');

const markup = (n = 6, extra = '') => `
<form id="f">
  <fieldset class="eds-otp" data-eds-otp data-eds-otp-length="${n}" data-eds-otp-name="codigo" ${extra}>
    <legend class="eds-label">Código de verificação</legend>
    <div class="eds-otp-cells">${cells(n)}</div>
    <input type="hidden" name="codigo" />
  </fieldset>
</form>`;

const cellEls = () => Array.from(document.querySelectorAll<HTMLInputElement>('.eds-otp-cell'));
const hidden = () => document.querySelector<HTMLInputElement>('input[type="hidden"]')!;
const root = () => document.querySelector<HTMLElement>('[data-eds-otp]')!;

function mount(html = markup()) {
  document.body.innerHTML = html;
  destroy = initOtp(document);
}

afterEach(() => {
  destroy?.();
  destroy = undefined;
  document.body.innerHTML = '';
});

describe('OTP: células', () => {
  it('é ligado pelo init() e só a primeira célula leva one-time-code', () => {
    document.body.innerHTML = markup();
    destroy = init(document);
    const [first, ...rest] = cellEls();
    expect(first).toHaveAttribute('autocomplete', 'one-time-code');
    for (const cell of rest) expect(cell).not.toHaveAttribute('autocomplete', 'one-time-code');
    expect(first).toHaveAttribute('aria-label', 'Dígito 1 de 6');
  });

  it('digitar avança de célula e grava o código no hidden', async () => {
    mount();
    const user = userEvent.setup();
    await user.click(cellEls()[0]!);
    await user.keyboard('123');
    expect(
      cellEls()
        .map((c) => c.value)
        .join(''),
    ).toBe('123');
    expect(document.activeElement).toBe(cellEls()[3]);
    expect(hidden().value).toBe('123');
  });

  it('só aceita dígitos', async () => {
    mount();
    const user = userEvent.setup();
    await user.click(cellEls()[0]!);
    await user.keyboard('a1b2');
    expect(hidden().value).toBe('12');
  });

  it('Backspace numa célula vazia volta e apaga a anterior', async () => {
    mount();
    const user = userEvent.setup();
    await user.click(cellEls()[0]!);
    await user.keyboard('12');
    expect(document.activeElement).toBe(cellEls()[2]);
    await user.keyboard('{Backspace}');
    expect(document.activeElement).toBe(cellEls()[1]);
    expect(hidden().value).toBe('1');
    expect(cellEls()[1]!.value).toBe('');
  });

  it('setas, Home e End movem o foco', async () => {
    mount();
    const user = userEvent.setup();
    await user.click(cellEls()[2]!);
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(cellEls()[3]);
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(document.activeElement).toBe(cellEls()[1]);
    await user.keyboard('{End}');
    expect(document.activeElement).toBe(cellEls()[5]);
    await user.keyboard('{Home}');
    expect(document.activeElement).toBe(cellEls()[0]);
  });

  it('colar o código inteiro distribui nas células e emite eds:otp-complete', async () => {
    mount();
    const user = userEvent.setup();
    const complete: string[] = [];
    root().addEventListener('eds:otp-complete', (e) =>
      complete.push((e as CustomEvent<{ value: string }>).detail.value),
    );
    await user.click(cellEls()[3]!);
    await user.paste('482 913');
    expect(cellEls().map((c) => c.value)).toEqual(['4', '8', '2', '9', '1', '3']);
    expect(hidden().value).toBe('482913');
    expect(complete).toEqual(['482913']);
    expect(document.activeElement).toBe(cellEls()[5]);
  });

  it('colar um trecho começa na célula atual', async () => {
    mount();
    const user = userEvent.setup();
    await user.click(cellEls()[1]!);
    await user.paste('77');
    expect(hidden().value).toBe('77');
    expect(cellEls().map((c) => c.value)).toEqual(['', '7', '7', '', '', '']);
  });

  it('o preenchimento do SMS (vários caracteres na primeira célula) distribui', () => {
    mount();
    const first = cellEls()[0]!;
    expect(first).not.toHaveAttribute('maxlength');
    first.value = '123456';
    first.dispatchEvent(new Event('input', { bubbles: true }));
    expect(
      cellEls()
        .map((c) => c.value)
        .join(''),
    ).toBe('123456');
  });

  it('eds:otp-change a cada alteração; complete só com todas as células', async () => {
    mount(markup(3));
    const user = userEvent.setup();
    const changes: string[] = [];
    let completes = 0;
    root().addEventListener('eds:otp-change', (e) =>
      changes.push((e as CustomEvent<{ value: string }>).detail.value),
    );
    root().addEventListener('eds:otp-complete', () => (completes += 1));
    await user.click(cellEls()[0]!);
    await user.keyboard('12');
    expect(completes).toBe(0);
    await user.keyboard('3');
    expect(completes).toBe(1);
    expect(changes).toEqual(['1', '12', '123']);
  });

  it('o valor inicial do hidden preenche as células', () => {
    mount(
      markup().replace(
        '<input type="hidden" name="codigo" />',
        '<input type="hidden" name="codigo" value="9081" />',
      ),
    );
    expect(
      cellEls()
        .map((c) => c.value)
        .join(''),
    ).toBe('9081');
    expect(hidden().value).toBe('9081');
  });

  it('alfanumérico aceita letras em maiúscula', async () => {
    mount(markup(4, 'data-eds-otp-type="alphanumeric"'));
    const user = userEvent.setup();
    await user.click(cellEls()[0]!);
    await user.keyboard('a7');
    expect(hidden().value).toBe('A7');
  });
});

describe('OTP: fallback sem JS', () => {
  const single = `
  <form>
    <fieldset class="eds-otp" data-eds-otp data-eds-otp-length="4" data-eds-otp-name="codigo">
      <legend class="eds-label">Código</legend>
      <input class="eds-input eds-otp-single" name="codigo" autocomplete="one-time-code"
        inputmode="numeric" pattern="\\d{4}" />
    </fieldset>
  </form>`;

  it('o campo único vira células e o hidden leva o código', async () => {
    mount(single);
    expect(cellEls()).toHaveLength(4);
    const field = document.querySelector<HTMLInputElement>('.eds-otp-single')!;
    expect(field.hidden).toBe(true);
    expect(field.disabled).toBe(true);
    await userEvent.setup().click(cellEls()[0]!);
    await userEvent.keyboard('4821');
    expect(hidden().name).toBe('codigo');
    expect(hidden().value).toBe('4821');
  });

  it('destroy devolve o campo único', () => {
    mount(single);
    destroy?.();
    destroy = undefined;
    const field = document.querySelector<HTMLInputElement>('.eds-otp-single')!;
    expect(field.hidden).toBe(false);
    expect(field.disabled).toBe(false);
    expect(field.getAttribute('name')).toBe('codigo');
  });
});
