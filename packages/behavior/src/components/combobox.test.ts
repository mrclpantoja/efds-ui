import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installDomPolyfills } from '../test-utils/dom-polyfills';
import { initCombobox } from './combobox';

const markup = (attrs = '', options = true) => `
<form id="form">
<div class="eds-field">
  <label class="eds-label" for="cidade">Cidade</label>
  <div class="eds-combobox" ${attrs}>
    <input id="cidade" class="eds-input" type="text" role="combobox" aria-autocomplete="list"
      aria-expanded="false" aria-controls="cidade-lista" autocomplete="off" />
    <input type="hidden" name="cidade" id="oculto" />
    <div class="eds-combobox-popup" popover="manual" id="popup">
      <ul id="cidade-lista" class="eds-combobox-listbox" role="listbox" aria-label="Cidades">${
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
const visible = () =>
  Array.from(document.querySelectorAll<HTMLElement>('[role="option"]'))
    .filter((o) => !o.hidden)
    .map((o) => o.textContent);

describe('combobox local', () => {
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

  it('digitar filtra sem acento nem caixa e abre', async () => {
    const user = userEvent.setup();
    await user.click(input());
    await user.type(input(), 'SAO');
    expect(visible()).toEqual(['São Paulo', 'São Leopoldo']);
    expect(input()).toHaveAttribute('aria-expanded', 'true');
    expect(popup().matches(':popover-open')).toBe(true);
  });

  it('mostra o texto de vazio quando nada casa', async () => {
    const user = userEvent.setup();
    await user.type(input(), 'zzz');
    expect(document.querySelector('.eds-combobox-empty')).not.toHaveAttribute('hidden');
    await user.clear(input());
    await user.type(input(), 'cur');
    expect(document.querySelector('.eds-combobox-empty')).toHaveAttribute('hidden');
  });

  it('ArrowDown abre e destaca a primeira; setas pulam desabilitadas e não dão a volta', async () => {
    const user = userEvent.setup();
    input().focus();
    await user.keyboard('{ArrowDown}');
    expect(input()).toHaveAttribute('aria-expanded', 'true');
    expect(input()).toHaveAttribute('aria-activedescendant', 'o1');
    expect(document.getElementById('o1')).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{ArrowDown}');
    expect(input()).toHaveAttribute('aria-activedescendant', 'o2');
    await user.keyboard('{ArrowDown}');
    expect(input()).toHaveAttribute('aria-activedescendant', 'o4');
    await user.keyboard('{ArrowDown}');
    expect(input()).toHaveAttribute('aria-activedescendant', 'o4');
    await user.keyboard('{ArrowUp}{ArrowUp}{ArrowUp}');
    expect(input()).toHaveAttribute('aria-activedescendant', 'o1');
    expect(document.getElementById('o4')).not.toHaveAttribute('aria-selected');
  });

  it('Alt+Seta para baixo abre sem mover; Alt+Seta para cima fecha', async () => {
    const user = userEvent.setup();
    input().focus();
    await user.keyboard('{Alt>}{ArrowDown}{/Alt}');
    expect(input()).toHaveAttribute('aria-expanded', 'true');
    expect(input()).not.toHaveAttribute('aria-activedescendant');
    await user.keyboard('{Alt>}{ArrowUp}{/Alt}');
    expect(input()).toHaveAttribute('aria-expanded', 'false');
  });

  it('Enter seleciona a destacada: texto, hidden, data-current e evento', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    document.addEventListener('eds:combobox-change', onChange);
    input().focus();
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(input()).toHaveValue('São Paulo');
    expect(hidden()).toHaveValue('sp');
    expect(hidden()).toHaveAttribute('data-value', 'sp');
    expect(document.getElementById('o2')).toHaveAttribute('data-current');
    expect(input()).toHaveAttribute('aria-expanded', 'false');
    expect((onChange.mock.calls[0]?.[0] as CustomEvent).detail).toEqual({
      value: 'sp',
      label: 'São Paulo',
    });
    document.removeEventListener('eds:combobox-change', onChange);
  });

  it('Enter fechado envia o formulário; aberto sem destaque não envia', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((e: Event) => e.preventDefault());
    document.getElementById('form')?.addEventListener('submit', onSubmit);
    input().focus();
    await user.keyboard('{Enter}');
    expect(onSubmit).toHaveBeenCalledTimes(1);
    await user.type(input(), 'p');
    await user.keyboard('{Enter}');
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('clique na opção seleciona sem tirar o foco do input', async () => {
    const user = userEvent.setup();
    await user.click(input());
    await user.click(document.getElementById('o4') as HTMLElement);
    expect(input()).toHaveValue('Curitiba');
    expect(hidden()).toHaveValue('cur');
    expect(document.activeElement).toBe(input());
  });

  it('opção desabilitada não seleciona', async () => {
    const user = userEvent.setup();
    await user.click(input());
    await user.click(document.getElementById('o3') as HTMLElement);
    expect(hidden()).toHaveValue('');
  });

  it('editar o texto depois de escolher limpa o valor escondido', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    input().focus();
    await user.keyboard('{ArrowDown}{Enter}');
    expect(hidden()).toHaveValue('poa');
    document.addEventListener('eds:combobox-change', onChange);
    await user.keyboard('x');
    expect(hidden()).toHaveValue('');
    expect(document.getElementById('o1')).not.toHaveAttribute('data-current');
    expect((onChange.mock.calls[0]?.[0] as CustomEvent).detail.value).toBe('');
    document.removeEventListener('eds:combobox-change', onChange);
  });

  it('Esc aberto fecha (sem propagar); Esc fechado limpa o texto', async () => {
    const user = userEvent.setup();
    const onKey = vi.fn();
    document.addEventListener('keydown', onKey);
    await user.type(input(), 'por');
    await user.keyboard('{Escape}');
    expect(input()).toHaveAttribute('aria-expanded', 'false');
    expect(input()).toHaveValue('por');
    await user.keyboard('{Escape}');
    expect(input()).toHaveValue('');
    expect(onKey.mock.calls.filter(([e]) => (e as KeyboardEvent).key === 'Escape')).toHaveLength(0);
    document.removeEventListener('keydown', onKey);
  });

  it('Tab fecha sem selecionar; perder o foco também', async () => {
    const user = userEvent.setup();
    input().focus();
    await user.keyboard('{ArrowDown}');
    await user.tab();
    expect(input()).toHaveAttribute('aria-expanded', 'false');
    expect(hidden()).toHaveValue('');
    await user.click(input());
    expect(input()).toHaveAttribute('aria-expanded', 'true');
    (document.getElementById('enviar') as HTMLElement).focus();
    expect(input()).toHaveAttribute('aria-expanded', 'false');
  });

  it('anuncia a contagem depois de uma pausa; nada ao navegar por setas', async () => {
    vi.useFakeTimers();
    try {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      await user.type(input(), 'sao');
      expect(status()).toBeEmptyDOMElement();
      await vi.advanceTimersByTimeAsync(600);
      expect(status()).toHaveTextContent('1 resultado disponível.');
      await user.keyboard('{ArrowDown}');
      expect(status()).toHaveTextContent('1 resultado disponível.');
      await user.clear(input());
      await user.type(input(), 'a');
      await vi.advanceTimersByTimeAsync(600);
      expect(status()).toHaveTextContent('3 resultados disponíveis.');
      await user.type(input(), 'xyz');
      await vi.advanceTimersByTimeAsync(600);
      expect(status()).toHaveTextContent('Nenhum resultado.');
    } finally {
      vi.useRealTimers();
    }
  });

  it('posiciona o popup por --_combobox-* e vira data-placement=top sem espaço embaixo', async () => {
    const user = userEvent.setup();
    const rect = (top: number, height = 40) =>
      ({ left: 20, top, width: 240, height, bottom: top + height, right: 260 }) as DOMRect;
    vi.spyOn(input(), 'getBoundingClientRect').mockReturnValue(rect(100));
    vi.spyOn(popup(), 'getBoundingClientRect').mockReturnValue(rect(0, 200));
    await user.click(input());
    expect(popup().style.getPropertyValue('--_combobox-x')).toBe('20px');
    expect(popup().style.getPropertyValue('--_combobox-width')).toBe('240px');
    expect(popup().style.getPropertyValue('--_combobox-y')).toBe('140px');
    expect(popup()).not.toHaveAttribute('data-placement');
    // Perto do rodapé: não cabe embaixo, cabe em cima.
    (input().getBoundingClientRect as ReturnType<typeof vi.fn>).mockReturnValue(rect(650));
    window.dispatchEvent(new Event('resize'));
    expect(popup()).toHaveAttribute('data-placement', 'top');
    expect(popup().style.getPropertyValue('--_combobox-y')).toBe('650px');
  });

  it('valor inicial do hidden preenche o texto e marca data-current', () => {
    destroy();
    document.body.innerHTML = markup();
    hidden().value = 'cur';
    destroy = initCombobox(document);
    expect(input()).toHaveValue('Curitiba');
    expect(document.getElementById('o4')).toHaveAttribute('data-current');
  });
});

describe('combobox remoto', () => {
  let restore: () => void;
  let destroy: () => void;
  let fetchMock: ReturnType<typeof vi.fn>;
  const reply = (data: unknown, ok = true) =>
    Promise.resolve({ ok, json: () => Promise.resolve(data) } as Response);

  beforeEach(() => {
    vi.useFakeTimers();
    restore = installDomPolyfills();
    fetchMock = vi.fn(() =>
      reply([
        { value: 'a1', label: 'Atelier Exemplo' },
        { value: 'a2', label: 'Armazém Modelo' },
      ]),
    );
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

  it('só busca a partir de 2 caracteres e depois do debounce de 300 ms', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.type(input(), 'a');
    await vi.advanceTimersByTimeAsync(500);
    expect(fetchMock).not.toHaveBeenCalled();
    await user.type(input(), 'r');
    await vi.advanceTimersByTimeAsync(299);
    expect(fetchMock).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit & { edsLoader?: boolean }];
    expect(url).toBe('/clientes/busca?q=ar');
    expect(init.edsLoader).toBe(false);
  });

  it('digitação rápida gera uma só requisição e aborta a anterior', async () => {
    const signals: AbortSignal[] = [];
    fetchMock.mockImplementation((_url: string, init: RequestInit) => {
      signals.push(init.signal as AbortSignal);
      return new Promise(() => undefined);
    });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.type(input(), 'at');
    await vi.advanceTimersByTimeAsync(350);
    await user.type(input(), 'e');
    await vi.advanceTimersByTimeAsync(350);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(signals[0]?.aborted).toBe(true);
    expect(signals[1]?.aborted).toBe(false);
  });

  it('mostra loading + aria-busy e depois renderiza as opções', async () => {
    let resolve!: (r: Response) => void;
    fetchMock.mockImplementation(() => new Promise<Response>((r) => (resolve = r)));
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.type(input(), 'at');
    await vi.advanceTimersByTimeAsync(350);
    expect(popup()).toHaveAttribute('aria-busy', 'true');
    expect(document.querySelector('.eds-combobox-loading')).not.toHaveAttribute('hidden');
    resolve({
      ok: true,
      json: () => Promise.resolve([{ value: 'a1', label: 'Atelier Exemplo' }]),
    } as Response);
    await vi.advanceTimersByTimeAsync(10);
    expect(popup()).not.toHaveAttribute('aria-busy');
    expect(document.querySelector('.eds-combobox-loading')).toHaveAttribute('hidden');
    const options = document.querySelectorAll('[role="option"]');
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent('Atelier Exemplo');
    expect(options[0]).toHaveAttribute('data-value', 'a1');
    expect(options[0]?.id).toBeTruthy();
    await vi.advanceTimersByTimeAsync(600);
    expect(status()).toHaveTextContent('1 resultado disponível.');
  });

  it('seleciona uma opção remota', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.type(input(), 'ar');
    await vi.advanceTimersByTimeAsync(400);
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(input()).toHaveValue('Armazém Modelo');
    expect(hidden()).toHaveValue('a2');
  });

  it('erro mostra a mensagem e anuncia', async () => {
    fetchMock.mockImplementation(() => reply(null, false));
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.type(input(), 'ar');
    await vi.advanceTimersByTimeAsync(400);
    const empty = document.querySelector('.eds-combobox-empty') as HTMLElement;
    expect(empty).not.toHaveAttribute('hidden');
    expect(empty).toHaveTextContent('Não foi possível carregar as opções.');
    expect(status()).toHaveTextContent('Não foi possível carregar as opções.');
  });

  it('data-eds-min-chars muda o mínimo', async () => {
    destroy();
    document.body.innerHTML = markup('data-eds-source="/b?q=" data-eds-min-chars="4"', false);
    destroy = initCombobox(document);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.type(input(), 'ate');
    await vi.advanceTimersByTimeAsync(500);
    expect(fetchMock).not.toHaveBeenCalled();
    await user.type(input(), 'l');
    await vi.advanceTimersByTimeAsync(400);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('destroy aborta a requisição pendente', async () => {
    let signal: AbortSignal | undefined;
    fetchMock.mockImplementation((_u: string, init: RequestInit) => {
      signal = init.signal as AbortSignal;
      return new Promise(() => undefined);
    });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.type(input(), 'ar');
    await vi.advanceTimersByTimeAsync(400);
    destroy();
    expect(signal?.aborted).toBe(true);
  });
});
