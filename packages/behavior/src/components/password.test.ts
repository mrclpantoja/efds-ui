import { fireEvent } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { init } from '../index';
import { initPassword } from './password';

let destroy: (() => void) | undefined;

const markup = (extra = '') => `
<form id="f">
  <div class="eds-field">
    <label class="eds-label" for="s1">Senha</label>
    <div class="eds-input-group">
      <input class="eds-input" id="s1" name="senha" type="password" autocomplete="new-password"
        data-eds-password ${extra} aria-describedby="s1-req s1-str" />
      <button type="button" class="eds-button eds-input-group-button" aria-pressed="false"
        aria-label="Mostrar senha" data-eds-password-toggle>olho</button>
    </div>
    <div class="eds-password-strength" id="s1-str" data-level="0">
      <span class="eds-password-strength-bar"></span>
      <span class="eds-password-strength-text">Força: fraca</span>
    </div>
    <ul class="eds-password-rules" id="s1-req">
      <li data-rule="length">Ao menos 8 caracteres</li>
      <li><span class="eds-visually-hidden">Pendente: </span>Letras maiúsculas e minúsculas</li>
      <li>Um número</li>
    </ul>
  </div>
  <button type="submit">Enviar</button>
</form>`;

const input = () => document.getElementById('s1') as HTMLInputElement;
const toggle = () => document.querySelector<HTMLButtonElement>('[data-eds-password-toggle]')!;
const meter = () => document.getElementById('s1-str') as HTMLElement;
const rules = () => Array.from(document.querySelectorAll<HTMLElement>('#s1-req li'));

function mount(extra = '') {
  document.body.innerHTML = markup(extra);
  destroy = initPassword(document);
}

afterEach(() => {
  destroy?.();
  destroy = undefined;
  document.body.innerHTML = '';
  vi.useRealTimers();
});

describe('senha: mostrar e ocultar', () => {
  it('é ligada pelo init() e o botão alterna o tipo e aria-pressed, com nome fixo', async () => {
    document.body.innerHTML = markup();
    destroy = init(document);
    const user = userEvent.setup();
    expect(input()).toHaveAttribute('type', 'password');
    await user.click(toggle());
    expect(input()).toHaveAttribute('type', 'text');
    expect(toggle()).toHaveAttribute('aria-pressed', 'true');
    expect(toggle()).toHaveAttribute('aria-label', 'Mostrar senha');
    await user.click(toggle());
    expect(input()).toHaveAttribute('type', 'password');
    expect(toggle()).toHaveAttribute('aria-pressed', 'false');
  });

  it('mantém o foco no campo ao clicar com o mouse e preserva a seleção', async () => {
    mount();
    const user = userEvent.setup();
    await user.type(input(), 'abcdef');
    input().setSelectionRange(2, 4);
    // pointerdown cancelável: o foco não sai do campo.
    const down = new MouseEvent('pointerdown', { bubbles: true, cancelable: true });
    toggle().dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);
    toggle().click();
    expect(input().type).toBe('text');
    expect(input().selectionStart).toBe(2);
    expect(input().selectionEnd).toBe(4);
  });

  it('o botão aberto por teclado mantém o foco nele', async () => {
    mount();
    const user = userEvent.setup();
    toggle().focus();
    await user.keyboard('{Enter}');
    expect(document.activeElement).toBe(toggle());
    expect(input().type).toBe('text');
  });

  it('ao enviar o formulário o campo volta a ficar oculto', async () => {
    mount();
    const user = userEvent.setup();
    await user.click(toggle());
    const form = document.getElementById('f') as HTMLFormElement;
    form.addEventListener('submit', (e) => e.preventDefault());
    fireEvent.submit(form);
    expect(input().type).toBe('password');
    expect(toggle()).toHaveAttribute('aria-pressed', 'false');
  });
});

describe('senha: força e regras', () => {
  it('sem data-eds-password-strength, nada é medido', async () => {
    mount();
    await userEvent.type(input(), 'Cavalo-Azul-77!');
    expect(meter()).toHaveAttribute('data-level', '0');
  });

  it('atualiza o nível, o texto visível e as regras ao digitar', async () => {
    mount('data-eds-password-strength');
    const user = userEvent.setup();
    expect(meter()).toHaveAttribute('data-level', '0');
    expect(meter().querySelector('.eds-password-strength-text')).toHaveTextContent(
      'Força: não avaliada',
    );
    await user.type(input(), 'abc');
    expect(meter()).toHaveAttribute('data-level', '1');
    expect(meter().querySelector('.eds-password-strength-text')).toHaveTextContent('Força: fraca');
    expect(rules().map((r) => r.hasAttribute('data-met'))).toEqual([false, false, false]);
    input().value = '';
    await user.type(input(), 'Cavalo-Azul-77!');
    expect(meter()).toHaveAttribute('data-level', '4');
    expect(meter().querySelector('.eds-password-strength-text')).toHaveTextContent('Força: forte');
    // A regra sem data-rule é reconhecida pelo texto.
    expect(rules().map((r) => r.hasAttribute('data-met'))).toEqual([true, true, true]);
    // O estado também vai em texto (cor nunca sozinha).
    expect(rules()[0]).toHaveTextContent('Atendida: Ao menos 8 caracteres');
  });

  it('emite eds:password-strength-change só quando o nível muda', async () => {
    mount('data-eds-password-strength');
    const seen: number[] = [];
    input().addEventListener('eds:password-strength-change', (e) =>
      seen.push((e as CustomEvent<{ level: number }>).detail.level),
    );
    await userEvent.type(input(), 'ab');
    expect(seen).toEqual([1]);
  });

  it('não anuncia por tecla: só ao sair do campo (e uma vez por nível)', async () => {
    mount('data-eds-password-strength');
    const user = userEvent.setup();
    const region = () => document.querySelector<HTMLElement>('#s1-str + [role="status"]')!;
    await user.type(input(), 'Cavalo-Azul-77!');
    expect(region()).toHaveTextContent('');
    await user.tab(); // blur
    expect(region()).toHaveTextContent('Força da senha: forte.');
  });

  it('anuncia depois de uma pausa na digitação', async () => {
    vi.useFakeTimers();
    mount('data-eds-password-strength');
    input().focus();
    input().value = 'Cavalo-Azul-77!';
    fireEvent.input(input());
    const region = document.querySelector<HTMLElement>('#s1-str + [role="status"]')!;
    expect(region.textContent).toBe('');
    vi.advanceTimersByTime(1300);
    expect(region).toHaveTextContent('Força da senha: forte.');
  });

  it('destroy remove a região oculta e o texto extra das regras', () => {
    mount('data-eds-password-strength');
    expect(document.querySelector('#s1-str + [role="status"]')).not.toBeNull();
    destroy?.();
    destroy = undefined;
    expect(document.querySelector('#s1-str + [role="status"]')).toBeNull();
    expect(rules()[0]?.textContent).toBe('Ao menos 8 caracteres');
  });
});
