import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installDomPolyfills } from '../test-utils/dom-polyfills';
import { initCombobox } from './combobox';

const markup = (attrs = '', options = true, listAttrs = 'aria-label="Cidades"') => `
<form id="form">
<div class="eds-field">
  <label class="eds-label" for="cidade">Cidade</label>
  <div class="eds-combobox" ${attrs}>
    <input id="cidade" class="eds-input" type="text" role="combobox" aria-autocomplete="list"
      aria-expanded="false" aria-controls="cidade-lista" autocomplete="off" />
    <input type="hidden" name="cidade" id="oculto" />
    <div class="eds-combobox-popup" popover="manual" id="popup">
      <ul id="cidade-lista" class="eds-combobox-listbox" role="listbox" ${listAttrs}>${
        options
          ? `
        <li id="o1" class="eds-combobox-option" role="option" data-value="poa">Porto Alegre</li>
        <li id="o2" class="eds-combobox-option" role="option" data-value="sp">São Paulo</li>
        <li id="o3" class="eds-combobox-option" role="option" data-value="sl" aria-disabled="true">São Leopoldo</li>
        <li id="o4" class="eds-combobox-option" role="option" data-value="cur">Curitiba</li>`
          : ''
      }
      </ul>
      <p class="eds-combobox-empty" hidden>Nenhum resultado</p>
      <p class="eds-combobox-loading" hidden>Carregando…</p>
    </div>
    <span class="eds-visually-hidden" role="status"></span>
  </div>
</div>
<button type="submit" id="enviar">Enviar</button>
</form>`;

const input = () => document.getElementById('cidade') as HTMLInputElement;
const hidden = () => document.getElementById('oculto') as HTMLInputElement;
const popup = () => document.getElementById('popup') as HTMLElement;
const status = () => document.querySelector('[role="status"]') as HTMLElement;

describe('combobox: ajustes da auditoria de UX (local)', () => {
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

  it('H: Enter com a lista aberta e sem destaque fecha e deixa o formulário seguir', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((e: Event) => e.preventDefault());
    document.getElementById('form')?.addEventListener('submit', onSubmit);
    input().focus();
    await user.keyboard('{Alt>}{ArrowDown}{/Alt}');
    expect(input()).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard('{Enter}');
    expect(input()).toHaveAttribute('aria-expanded', 'false');
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('H: Enter com destaque seleciona e não envia', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((e: Event) => e.preventDefault());
    document.getElementById('form')?.addEventListener('submit', onSubmit);
    input().focus();
    await user.keyboard('{ArrowDown}{Enter}');
    expect(hidden()).toHaveValue('poa');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('I: texto sem escolha fica inválido e a mensagem some ao escolher ou esvaziar', async () => {
    const user = userEvent.setup();
    expect(input().validity.customError).toBe(false);
    await user.type(input(), 'por');
    expect(input().validity.customError).toBe(true);
    expect(input().validationMessage).toBe('Escolha uma das opções da lista.');
    expect(input().form?.checkValidity()).toBe(false);
    await user.keyboard('{ArrowDown}{Enter}');
    expect(input().validity.customError).toBe(false);
    await user.keyboard('x');
    expect(input().validity.customError).toBe(true);
    await user.clear(input());
    expect(input().validity.customError).toBe(false);
  });

  it('I: Esc que limpa o texto limpa a validação', async () => {
    const user = userEvent.setup();
    await user.type(input(), 'por');
    await user.keyboard('{Escape}{Escape}');
    expect(input()).toHaveValue('');
    expect(input().validity.customError).toBe(false);
  });

  it('I: a mensagem é configurável pelas mensagens do pacote', async () => {
    const { configure, resetMessages } = await import('../index');
    configure({ messages: { comboboxInvalid: 'Pick one.' } });
    destroy();
    document.body.innerHTML = markup();
    destroy = initCombobox(document);
    await userEvent.setup().type(input(), 'x');
    expect(input().validationMessage).toBe('Pick one.');
    resetMessages();
  });

  it('I: data-eds-free-text aceita texto livre e o hidden recebe o digitado', async () => {
    destroy();
    document.body.innerHTML = markup('data-eds-free-text');
    destroy = initCombobox(document);
    const user = userEvent.setup();
    await user.type(input(), 'Gramado');
    expect(input().validity.customError).toBe(false);
    expect(hidden()).toHaveValue('Gramado');
    await user.clear(input());
    await user.type(input(), 'port');
    expect(hidden()).toHaveValue('port');
    await user.keyboard('{ArrowDown}{Enter}');
    expect(hidden()).toHaveValue('poa');
  });

  it('J: listbox sem nome usa o label do campo (cria o id do label)', () => {
    destroy();
    document.body.innerHTML = markup('', true, '');
    destroy = initCombobox(document);
    const label = document.querySelector('label') as HTMLElement;
    expect(label.id).toBeTruthy();
    expect(document.getElementById('cidade-lista')).toHaveAttribute('aria-labelledby', label.id);
  });

  it('J: não mexe em listbox que já tem aria-label', () => {
    expect(document.getElementById('cidade-lista')).not.toHaveAttribute('aria-labelledby');
  });

  it('K: ao escolher (teclado ou clique) anuncia "{label} selecionado."', async () => {
    const user = userEvent.setup();
    input().focus();
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(status()).toHaveTextContent('São Paulo selecionado.');
    await user.click(input());
    await user.click(document.getElementById('o4') as HTMLElement);
    expect(status()).toHaveTextContent('Curitiba selecionado.');
  });

  it('L: pointermove destaca a opção habilitada, sem rolar a lista', async () => {
    const scroll = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      value: scroll,
      configurable: true,
    });
    try {
      await userEvent.setup().click(input());
      document.getElementById('o4')?.dispatchEvent(new Event('pointermove', { bubbles: true }));
      expect(document.getElementById('o4')).toHaveAttribute('aria-selected', 'true');
      expect(input()).toHaveAttribute('aria-activedescendant', 'o4');
      document.getElementById('o2')?.dispatchEvent(new Event('pointermove', { bubbles: true }));
      expect(document.getElementById('o4')).not.toHaveAttribute('aria-selected');
      expect(input()).toHaveAttribute('aria-activedescendant', 'o2');
      document.getElementById('o3')?.dispatchEvent(new Event('pointermove', { bubbles: true }));
      expect(input()).toHaveAttribute('aria-activedescendant', 'o2');
      expect(scroll).not.toHaveBeenCalled();
    } finally {
      Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
    }
  });
});

describe('combobox: ajustes da auditoria de UX (remoto)', () => {
  let restore: () => void;
  let destroy: () => void;
  let fetchMock: ReturnType<typeof vi.fn>;
  const reply = (data: unknown, ok = true) =>
    Promise.resolve({ ok, json: () => Promise.resolve(data) } as Response);

  beforeEach(() => {
    vi.useFakeTimers();
    restore = installDomPolyfills();
    fetchMock = vi.fn(() => reply([{ value: 'a1', label: 'Atelier Exemplo' }]));
    vi.stubGlobal('fetch', fetchMock);
    document.body.innerHTML = markup('data-eds-source="/clientes/busca?q="', false);
    destroy = initCombobox(document);
  });
  afterEach(() => {
    destroy();
    restore();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('K: depois de ~400 ms de carregamento escreve "Carregando…" no status', async () => {
    fetchMock.mockImplementation(() => new Promise(() => undefined));
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.type(input(), 'at');
    await vi.advanceTimersByTimeAsync(300);
    expect(status()).toBeEmptyDOMElement();
    await vi.advanceTimersByTimeAsync(390);
    expect(status()).toBeEmptyDOMElement();
    await vi.advanceTimersByTimeAsync(20);
    expect(status()).toHaveTextContent('Carregando…');
  });

  it('K: resposta rápida não anuncia "Carregando…"', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.type(input(), 'at');
    await vi.advanceTimersByTimeAsync(350);
    await vi.advanceTimersByTimeAsync(1000);
    expect(status()).not.toHaveTextContent('Carregando…');
    expect(status()).toHaveTextContent('1 resultado disponível.');
  });

  it('K: setas e Enter são ignorados enquanto aria-busy=true (e Enter não envia)', async () => {
    fetchMock.mockImplementation(() => new Promise(() => undefined));
    const onSubmit = vi.fn((e: Event) => e.preventDefault());
    document.getElementById('form')?.addEventListener('submit', onSubmit);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    // Texto livre: o submit só seria bloqueado pela validação.
    destroy();
    document.body.innerHTML = markup(
      'data-eds-source="/clientes/busca?q=" data-eds-free-text',
      false,
    );
    document.getElementById('form')?.addEventListener('submit', onSubmit);
    destroy = initCombobox(document);
    await user.type(input(), 'at');
    await vi.advanceTimersByTimeAsync(350);
    expect(popup()).toHaveAttribute('aria-busy', 'true');
    await user.keyboard('{ArrowDown}{Enter}');
    expect(input()).not.toHaveAttribute('aria-activedescendant');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('K: o erro antigo some ao voltar a digitar', async () => {
    fetchMock.mockImplementationOnce(() => reply(null, false));
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.type(input(), 'at');
    await vi.advanceTimersByTimeAsync(400);
    const empty = document.querySelector('.eds-combobox-empty') as HTMLElement;
    expect(empty).toHaveTextContent('Não foi possível carregar as opções.');
    expect(empty).not.toHaveAttribute('hidden');
    fetchMock.mockImplementation(() => new Promise(() => undefined));
    await user.type(input(), 'e');
    expect(empty).toHaveAttribute('hidden');
    expect(empty).toHaveTextContent('Nenhum resultado');
  });
});
