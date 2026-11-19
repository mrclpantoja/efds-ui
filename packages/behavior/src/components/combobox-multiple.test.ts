import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flush, installDomPolyfills } from '../test-utils/dom-polyfills';
import { initCombobox } from './combobox';

const markup = (attrs = '', inputAttrs = '', initial = true) => `
<form id="form">
<div class="eds-field">
  <label class="eds-label" for="cidades">Cidades atendidas</label>
  <div class="eds-combobox eds-combobox-multiple" data-eds-multiple ${attrs}>
    <div class="eds-combobox-control">
      <ul class="eds-combobox-tags" aria-label="Cidades selecionadas"></ul>
      <input id="cidades" class="eds-combobox-input" type="text" role="combobox"
        aria-autocomplete="list" aria-expanded="false" aria-controls="lista" autocomplete="off" ${inputAttrs} />
    </div>
    <input type="hidden" name="cidades[]" value="${initial ? 'poa' : ''}" />
    <div class="eds-combobox-popup" popover="manual" id="popup">
      <ul id="lista" class="eds-combobox-listbox" role="listbox" aria-label="Cidades">
        <li id="o1" class="eds-combobox-option" role="option" data-value="poa">Porto Alegre</li>
        <li id="o2" class="eds-combobox-option" role="option" data-value="pel">Pelotas</li>
        <li id="o3" class="eds-combobox-option" role="option" data-value="cax">Caxias do Sul</li>
        <li id="o4" class="eds-combobox-option" role="option" data-value="sm" aria-disabled="true">Santa Maria</li>
      </ul>
      <p class="eds-combobox-empty" hidden>Nenhum resultado</p>
      <p class="eds-combobox-loading" hidden>Carregando…</p>
    </div>
    <span class="eds-visually-hidden" role="status"></span>
  </div>
</div>
<button type="submit" id="enviar">Enviar</button>
</form>`;

const input = () => document.getElementById('cidades') as HTMLInputElement;
const status = () => document.querySelector('[role="status"]') as HTMLElement;
const root = () => document.querySelector('.eds-combobox') as HTMLElement;
const hiddenValues = () =>
  Array.from(document.querySelectorAll<HTMLInputElement>('input[type="hidden"]')).map(
    (h) => `${h.name}=${h.value}`,
  );
const tags = () =>
  Array.from(document.querySelectorAll('.eds-combobox-tag > span')).map((s) => s.textContent);
const opt = (id: string) => document.getElementById(id) as HTMLElement;

describe('combobox múltiplo (local)', () => {
  let restore: () => void;
  let destroy: () => void;
  beforeEach(() => {
    restore = installDomPolyfills();
    document.body.innerHTML = markup();
    destroy = initCombobox(document);
  });
  afterEach(() => {
    destroy();
    restore();
    document.body.innerHTML = '';
  });

  it('estado inicial: etiquetas, hidden por valor e aria-selected = escolhida', () => {
    expect(document.getElementById('lista')).toHaveAttribute('aria-multiselectable', 'true');
    expect(tags()).toEqual(['Porto Alegre']);
    expect(hiddenValues()).toEqual(['cidades[]=poa']);
    expect(opt('o1')).toHaveAttribute('aria-selected', 'true');
    expect(opt('o2')).toHaveAttribute('aria-selected', 'false');
    expect(document.querySelector('.eds-combobox-tag-remove')).toHaveAttribute(
      'aria-label',
      'Remover Porto Alegre',
    );
  });

  it('Enter alterna a opção destacada e a lista continua aberta; destaque em data-active', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    root().addEventListener('eds:combobox-change', onChange);
    input().focus();
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(opt('o2')).toHaveAttribute('data-active');
    expect(input()).toHaveAttribute('aria-activedescendant', 'o2');
    expect(opt('o2')).toHaveAttribute('aria-selected', 'false');
    await user.keyboard('{Enter}');
    expect(input()).toHaveAttribute('aria-expanded', 'true');
    expect(opt('o2')).toHaveAttribute('aria-selected', 'true');
    expect(tags()).toEqual(['Porto Alegre', 'Pelotas']);
    expect(hiddenValues()).toEqual(['cidades[]=poa', 'cidades[]=pel']);
    expect(status()).toHaveTextContent('Pelotas: selecionado. 2 itens selecionados.');
    expect((onChange.mock.calls[0]?.[0] as CustomEvent).detail).toEqual({
      values: ['poa', 'pel'],
      labels: ['Porto Alegre', 'Pelotas'],
    });
    // Alterna de novo: remove.
    await user.keyboard('{Enter}');
    expect(tags()).toEqual(['Porto Alegre']);
    expect(status()).toHaveTextContent('Pelotas: removido. 1 item selecionado.');
  });

  it('clique alterna sem tirar o foco e limpa o texto digitado', async () => {
    const user = userEvent.setup();
    await user.type(input(), 'cax');
    await user.click(opt('o3'));
    expect(tags()).toEqual(['Porto Alegre', 'Caxias do Sul']);
    expect(input()).toHaveValue('');
    expect(document.activeElement).toBe(input());
    expect(input()).toHaveAttribute('aria-expanded', 'true');
    // O filtro volta a mostrar tudo.
    expect(opt('o2').hidden).toBe(false);
  });

  it('o texto digitado não vira valor nem invalida o campo', async () => {
    const user = userEvent.setup();
    await user.type(input(), 'xyz');
    expect(input().validationMessage).toBe('');
    expect(hiddenValues()).toEqual(['cidades[]=poa']);
  });

  it('Backspace com texto vazio remove a última etiqueta; com texto só apaga', async () => {
    const user = userEvent.setup();
    input().focus();
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(tags()).toEqual(['Porto Alegre', 'Pelotas']);
    await user.type(input(), 'ab{Backspace}');
    expect(tags()).toHaveLength(2);
    await user.keyboard('{Backspace}');
    expect(input()).toHaveValue('');
    await user.keyboard('{Backspace}');
    expect(tags()).toEqual(['Porto Alegre']);
    expect(hiddenValues()).toEqual(['cidades[]=poa']);
  });

  it('Esc fecha; fechado, limpa só o texto e nunca remove etiquetas', async () => {
    const user = userEvent.setup();
    await user.type(input(), 'por');
    await user.keyboard('{Escape}');
    expect(input()).toHaveAttribute('aria-expanded', 'false');
    expect(input()).toHaveValue('por');
    await user.keyboard('{Escape}');
    expect(input()).toHaveValue('');
    expect(tags()).toEqual(['Porto Alegre']);
    await user.keyboard('{Escape}');
    expect(tags()).toEqual(['Porto Alegre']);
  });

  it('botão Remover da etiqueta: foco no próximo remover, senão no input', async () => {
    const user = userEvent.setup();
    input().focus();
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}{ArrowDown}{Enter}');
    expect(tags()).toEqual(['Porto Alegre', 'Pelotas', 'Caxias do Sul']);
    await user.click(
      document.querySelector('button[aria-label="Remover Porto Alegre"]') as HTMLElement,
    );
    expect(tags()).toEqual(['Pelotas', 'Caxias do Sul']);
    expect(document.activeElement).toBe(
      document.querySelector('button[aria-label="Remover Pelotas"]'),
    );
    await user.click(document.querySelector('button[aria-label="Remover Pelotas"]') as HTMLElement);
    expect(document.activeElement).toBe(
      document.querySelector('button[aria-label="Remover Caxias do Sul"]'),
    );
    await user.click(
      document.querySelector('button[aria-label="Remover Caxias do Sul"]') as HTMLElement,
    );
    expect(document.activeElement).toBe(input());
    expect(hiddenValues()).toEqual([]);
    expect(status()).toHaveTextContent('Caxias do Sul: removido. Nenhum item selecionado.');
  });

  it('os botões Remover vêm antes do input na ordem de Tab', async () => {
    const user = userEvent.setup();
    await user.click(input());
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(document.querySelector('.eds-combobox-tag-remove'));
    await user.tab();
    expect(document.activeElement).toBe(input());
  });

  it('opção desabilitada não alterna', async () => {
    const user = userEvent.setup();
    await user.click(input());
    await user.click(opt('o4'));
    expect(tags()).toEqual(['Porto Alegre']);
  });

  it('o name vem de data-eds-name e ganha [] quando falta', () => {
    destroy();
    document.body.innerHTML = markup('data-eds-name="regioes"', '', false);
    destroy = initCombobox(document);
    expect(hiddenValues()).toEqual([]);
    opt('o2').click();
    expect(hiddenValues()).toEqual(['regioes[]=pel']);
  });

  it('item inicial sem etiqueta no markup usa o rótulo da opção', () => {
    destroy();
    document.body.innerHTML = markup();
    document.querySelector<HTMLInputElement>('input[type="hidden"]')?.setAttribute('value', 'pel');
    (document.querySelector('input[type="hidden"]') as HTMLInputElement).value = 'pel';
    destroy = initCombobox(document);
    expect(tags()).toEqual(['Pelotas']);
    expect(opt('o2')).toHaveAttribute('aria-selected', 'true');
  });

  it('obrigatório: setCustomValidity enquanto não houver escolha', async () => {
    destroy();
    document.body.innerHTML = markup('', 'aria-required="true"', false);
    destroy = initCombobox(document);
    expect(input().validationMessage).toBe('Escolha ao menos uma opção.');
    opt('o1').click();
    expect(input().validationMessage).toBe('');
    document.querySelector<HTMLElement>('.eds-combobox-tag-remove')?.click();
    expect(input().validationMessage).toBe('Escolha ao menos uma opção.');
  });

  it('max-selected: as demais ficam aria-disabled e o status avisa', async () => {
    destroy();
    document.body.innerHTML = markup('data-eds-max-selected="2"', '', true);
    destroy = initCombobox(document);
    opt('o2').click();
    expect(tags()).toHaveLength(2);
    expect(status()).toHaveTextContent(
      'Pelotas: selecionado. 2 itens selecionados. Limite de 2 itens atingido.',
    );
    await flush();
    expect(opt('o3')).toHaveAttribute('aria-disabled', 'true');
    opt('o3').click();
    expect(tags()).toHaveLength(2);
    expect(status()).toHaveTextContent('Limite de 2 itens atingido.');
    // Remover libera as demais, mas a desabilitada de origem continua.
    opt('o2').click();
    expect(opt('o3')).not.toHaveAttribute('aria-disabled');
    expect(opt('o4')).toHaveAttribute('aria-disabled', 'true');
  });

  it('disabled do input chega aos botões das etiquetas', async () => {
    const button = () => document.querySelector<HTMLButtonElement>('.eds-combobox-tag-remove');
    expect(button()?.disabled).toBe(false);
    input().disabled = true;
    await flush();
    expect(button()?.disabled).toBe(true);
  });

  it('max-selected=1 usa o singular', () => {
    destroy();
    document.body.innerHTML = markup('data-eds-max-selected="1"', '', false);
    destroy = initCombobox(document);
    opt('o1').click();
    expect(status()).toHaveTextContent('Limite de 1 item atingido.');
  });

  it('eds:combobox-change ao remover pela etiqueta', async () => {
    const onChange = vi.fn();
    root().addEventListener('eds:combobox-change', onChange);
    document.querySelector<HTMLElement>('.eds-combobox-tag-remove')?.click();
    expect((onChange.mock.calls[0]?.[0] as CustomEvent).detail).toEqual({
      values: [],
      labels: [],
    });
  });
});

describe('combobox múltiplo (fonte remota)', () => {
  let restore: () => void;
  let destroy: () => void;
  beforeEach(() => {
    restore = installDomPolyfills();
    document.body.innerHTML = markup('data-eds-source="/cidades?q=" data-eds-min-chars="1"');
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              { value: 'poa', label: 'Porto Alegre' },
              { value: 'pel', label: 'Pelotas' },
            ]),
        }),
      ),
    );
    destroy = initCombobox(document);
  });
  afterEach(() => {
    destroy();
    restore();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('resultados remotos marcam as já escolhidas e alternam', async () => {
    vi.useFakeTimers();
    try {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      await user.type(input(), 'p');
      await vi.advanceTimersByTimeAsync(400);
      const options = Array.from(document.querySelectorAll<HTMLElement>('[role="option"]'));
      expect(options).toHaveLength(2);
      expect(options[0]).toHaveAttribute('aria-selected', 'true');
      expect(options[1]).toHaveAttribute('aria-selected', 'false');
      await user.click(options[1] as HTMLElement);
      expect(tags()).toEqual(['Porto Alegre', 'Pelotas']);
      expect(hiddenValues()).toEqual(['cidades[]=poa', 'cidades[]=pel']);
      expect(input()).toHaveValue('');
    } finally {
      vi.useRealTimers();
    }
    await flush();
  });
});
