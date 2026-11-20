import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetMessages, setMessages } from '../core/config';
import { flush, installDomPolyfills } from '../test-utils/dom-polyfills';
import { initCommand, matchesShortcut } from './command';

const items = JSON.stringify([
  { value: 'inicio', label: 'Ir para o início', group: 'Navegação', href: '#/inicio' },
  { value: 'pedidos', label: 'Pedidos', description: 'Lista de pedidos', group: 'Navegação' },
  {
    value: 'novo',
    label: 'Novo cadastro',
    group: 'Ações',
    shortcut: 'N',
    keywords: 'criar incluir',
  },
  { value: 'sair', label: 'Sair', group: 'Ações', disabled: true },
]);

const html = (attrs = '') => `
<button id="gatilho" type="button" data-eds-open="cmd">Buscar</button>
<dialog id="cmd" class="eds-modal eds-command" data-eds-command ${attrs}>
  <script type="application/json" data-eds-command-items>${items}</script>
</dialog>`;

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector(sel) as T;
const dialog = () => $<HTMLDialogElement>('#cmd');
const input = () => $<HTMLInputElement>('#cmd input');
const labels = () =>
  Array.from(document.querySelectorAll('#cmd [role="option"] .eds-command-label')).map(
    (el) => el.textContent,
  );
const key = (init: KeyboardEventInit) =>
  document.dispatchEvent(
    new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }),
  );
const activeLabel = () => $('#cmd [aria-selected="true"] .eds-command-label').textContent;

let restore: () => void;
let destroy: () => void;

beforeEach(() => {
  restore = installDomPolyfills();
  localStorage.clear();
});
afterEach(() => {
  destroy?.();
  restore();
  resetMessages();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  vi.useRealTimers();
});

const setup = (attrs = '') => {
  document.body.innerHTML = html(attrs);
  destroy = initCommand(document);
};

describe('paleta de comandos', () => {
  it('monta o combobox (APG) e nomeia o diálogo', () => {
    setup();
    expect(input()).toHaveAttribute('role', 'combobox');
    expect(input()).toHaveAttribute('aria-expanded', 'false');
    expect(input()).toHaveAttribute('aria-autocomplete', 'list');
    expect(dialog()).toHaveAttribute('aria-label', 'Paleta de comandos');
    expect(input().getAttribute('aria-controls')).toBe($('#cmd [role="listbox"]').id);
  });

  it('Ctrl+K abre com o foco no campo, grupos e primeiro item ativo', () => {
    setup();
    key({ key: 'k', ctrlKey: true });
    expect(dialog().open).toBe(true);
    expect(document.activeElement).toBe(input());
    expect(input()).toHaveAttribute('aria-expanded', 'true');
    expect(labels()).toEqual(['Ir para o início', 'Pedidos', 'Novo cadastro', 'Sair']);
    const groups = document.querySelectorAll('#cmd [role="group"]');
    expect(groups).toHaveLength(2);
    expect(groups[0]).toHaveAccessibleName('Navegação');
    const first = $('#cmd [role="option"]');
    expect(first).toHaveAttribute('aria-selected', 'true');
    expect(input().getAttribute('aria-activedescendant')).toBe(first.id);
  });

  it('Cmd+K abre, Ctrl+K de novo fecha e Esc fecha', async () => {
    setup();
    key({ key: 'k', metaKey: true });
    expect(dialog().open).toBe(true);
    key({ key: 'k', ctrlKey: true });
    expect(dialog().open).toBe(false);
    key({ key: 'k', ctrlKey: true });
    key({ key: 'Escape' });
    expect(dialog().open).toBe(false);
    await flush();
    expect(input()).toHaveAttribute('aria-expanded', 'false');
  });

  it('atalho configurável e "off" desliga', () => {
    setup('data-eds-command-shortcut="ctrl+shift+p"');
    key({ key: 'k', ctrlKey: true });
    expect(dialog().open).toBe(false);
    key({ key: 'p', ctrlKey: true, shiftKey: true });
    expect(dialog().open).toBe(true);
    destroy();
    setup('data-eds-command-shortcut="off"');
    key({ key: 'k', ctrlKey: true });
    expect(dialog().open).toBe(false);
  });

  it('showModal feito por fora (gatilho) também prepara a lista', async () => {
    setup();
    dialog().showModal();
    await flush();
    expect(input()).toHaveAttribute('aria-expanded', 'true');
    expect($('#cmd [role="option"]')).toBeTruthy();
    expect(document.activeElement).toBe(input());
  });

  it('setas movem (com volta) e pulam o desabilitado; Enter escolhe e emite', async () => {
    setup();
    key({ key: 'k', ctrlKey: true });
    const onSelect = vi.fn();
    dialog().addEventListener('eds:command-select', onSelect);
    const user = userEvent.setup();
    await user.keyboard('{ArrowDown}');
    expect(activeLabel()).toBe('Pedidos');
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(activeLabel()).toBe('Ir para o início');
    await user.keyboard('{ArrowUp}');
    expect(activeLabel()).toBe('Novo cadastro');
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect((onSelect.mock.calls[0]?.[0] as CustomEvent).detail).toMatchObject({
      value: 'novo',
      label: 'Novo cadastro',
      href: null,
    });
    expect(dialog().open).toBe(false);
  });

  it('filtra sem acento e caixa, por descrição e palavras-chave; mostra vazio e anuncia', async () => {
    vi.useFakeTimers();
    setup();
    key({ key: 'k', ctrlKey: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.type(input(), 'INICIO');
    expect(labels()).toEqual(['Ir para o início']);
    await user.clear(input());
    await user.type(input(), 'criar');
    expect(labels()).toEqual(['Novo cadastro']);
    await user.clear(input());
    await user.type(input(), 'lista ped');
    expect(labels()).toEqual(['Pedidos']);
    await vi.advanceTimersByTimeAsync(500);
    expect($('#cmd [role="status"]').textContent).toBe('1 resultado disponível.');
    await user.clear(input());
    await user.type(input(), 'zzz');
    expect(labels()).toEqual([]);
    expect($('.eds-command-empty').hidden).toBe(false);
    expect($('.eds-command-empty').textContent).toBe('Nenhum resultado para "zzz".');
    expect(input()).not.toHaveAttribute('aria-activedescendant');
  });

  it('clique escolhe sem tirar o foco do campo; href navega se ninguém cancela', () => {
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign });
    setup();
    key({ key: 'k', ctrlKey: true });
    const opt = document.querySelector<HTMLElement>('#cmd [data-value="inicio"]') as HTMLElement;
    const down = new MouseEvent('pointerdown', { bubbles: true, cancelable: true });
    opt.dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);
    opt.click();
    expect(assign).toHaveBeenCalledWith('#/inicio');
    vi.unstubAllGlobals();
  });

  it('preventDefault no evento impede a navegação', () => {
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign });
    setup();
    key({ key: 'k', ctrlKey: true });
    dialog().addEventListener('eds:command-select', (e) => e.preventDefault());
    (document.querySelector('#cmd [data-value="inicio"]') as HTMLElement).click();
    expect(assign).not.toHaveBeenCalled();
    expect(dialog().open).toBe(false);
    vi.unstubAllGlobals();
  });

  it('item desabilitado não é escolhido', () => {
    setup();
    key({ key: 'k', ctrlKey: true });
    const onSelect = vi.fn();
    dialog().addEventListener('eds:command-select', onSelect);
    (document.querySelector('#cmd [data-value="sair"]') as HTMLElement).click();
    expect(onSelect).not.toHaveBeenCalled();
    expect(dialog().open).toBe(true);
  });

  it('Recentes: só ids em localStorage, no topo com o campo vazio; desligado por padrão', () => {
    setup();
    key({ key: 'k', ctrlKey: true });
    (document.querySelector('#cmd [data-value="novo"]') as HTMLElement).click();
    expect(localStorage.length).toBe(0);
    destroy();

    setup('data-eds-command-recent="3"');
    key({ key: 'k', ctrlKey: true });
    (document.querySelector('#cmd [data-value="novo"]') as HTMLElement).click();
    key({ key: 'k', ctrlKey: true });
    (document.querySelector('#cmd [data-value="pedidos"]') as HTMLElement).click();
    expect(JSON.parse(localStorage.getItem('eds:command-recent') ?? '[]')).toEqual([
      'pedidos',
      'novo',
    ]);
    key({ key: 'k', ctrlKey: true });
    const groups = document.querySelectorAll('#cmd [role="group"]');
    expect(groups[0]).toHaveAccessibleName('Recentes');
    expect(
      Array.from(groups[0]?.querySelectorAll('.eds-command-label') ?? []).map((e) => e.textContent),
    ).toEqual(['Pedidos', 'Novo cadastro']);
    // Ids únicos mesmo com o item repetido nos Recentes.
    const ids = Array.from(document.querySelectorAll('#cmd [id]')).map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    // Com busca, os Recentes somem.
    input().value = 'ped';
    input().dispatchEvent(new Event('input', { bubbles: true }));
    expect(document.querySelectorAll('#cmd [role="group"]')).toHaveLength(1);
  });

  it('Recentes desligável por atributo; armazenamento indisponível não quebra', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('cheio');
    });
    setup('data-eds-command-recent="5"');
    key({ key: 'k', ctrlKey: true });
    expect(() =>
      (document.querySelector('#cmd [data-value="novo"]') as HTMLElement).click(),
    ).not.toThrow();
    destroy();
    spy.mockRestore();
    setup('data-eds-command-recent="off"');
    key({ key: 'k', ctrlKey: true });
    (document.querySelector('#cmd [data-value="novo"]') as HTMLElement).click();
    expect(localStorage.length).toBe(0);
  });

  it('usa os itens da marcação (ícone preservado) e filtra', () => {
    document.body.innerHTML = `
<dialog id="cmd" class="eds-modal eds-command" data-eds-command>
  <div class="eds-command-list" role="listbox" aria-label="Comandos">
    <div role="group" aria-labelledby="g1"><div id="g1" class="eds-command-group-label">Ir para</div>
      <div role="option" class="eds-command-item" data-value="a"><svg class="eds-command-icon"></svg><span class="eds-command-label">Alfa</span></div>
      <div role="option" class="eds-command-item" data-value="b"><span class="eds-command-label">Beta</span><kbd class="eds-command-shortcut">B</kbd></div>
    </div>
  </div>
</dialog>`;
    destroy = initCommand(document);
    key({ key: 'k', ctrlKey: true });
    expect(labels()).toEqual(['Alfa', 'Beta']);
    expect(document.querySelector('#cmd svg.eds-command-icon')).toBeTruthy();
    expect(document.querySelector('#cmd [role="group"]')).toHaveAccessibleName('Ir para');
    input().value = 'bet';
    input().dispatchEvent(new Event('input', { bubbles: true }));
    expect(labels()).toEqual(['Beta']);
  });

  it('com fonte remota, abaixo do mínimo valem os itens locais do JSON', () => {
    document.body.innerHTML = `<dialog id="cmd" class="eds-modal eds-command" data-eds-command data-eds-source="/b?q=" data-eds-min-chars="2"><script type="application/json" data-eds-command-items>${items}</script></dialog>`;
    destroy = initCommand(document);
    key({ key: 'k', ctrlKey: true });
    expect(labels()).toHaveLength(4);
  });

  it('destroy devolve a marcação do autor e um novo init a lê de novo', () => {
    document.body.innerHTML = `<dialog id="cmd" class="eds-modal eds-command" data-eds-command>
      <div class="eds-command-list" role="listbox" aria-label="C"><div role="option" class="eds-command-item" data-value="a"><span class="eds-command-label">Alfa</span></div></div></dialog>`;
    destroy = initCommand(document);
    destroy();
    expect(document.querySelectorAll('#cmd [role="option"]')).toHaveLength(1);
    destroy = initCommand(document);
    key({ key: 'k', ctrlKey: true });
    expect(labels()).toEqual(['Alfa']);
  });

  it('fonte remota: debounce, sem PageLoader e mostra o erro', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(async (...[url]: [string, RequestInit?]) =>
      url.endsWith('ped')
        ? new Response(JSON.stringify([{ value: 'p1', label: 'Pedido 0001', group: 'Pedidos' }]))
        : new Response('x', { status: 500 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    document.body.innerHTML =
      '<dialog id="cmd" class="eds-modal eds-command" data-eds-command data-eds-source="/busca?q=" data-eds-min-chars="2"></dialog>';
    destroy = initCommand(document);
    key({ key: 'k', ctrlKey: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.type(input(), 'p');
    await vi.advanceTimersByTimeAsync(400);
    expect(fetchMock).not.toHaveBeenCalled();
    await user.type(input(), 'ed');
    await vi.advanceTimersByTimeAsync(400);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/busca?q=ped');
    expect((fetchMock.mock.calls[0]?.[1] as { edsLoader?: boolean }).edsLoader).toBe(false);
    expect(labels()).toEqual(['Pedido 0001']);
    await user.type(input(), 'x');
    await vi.advanceTimersByTimeAsync(400);
    expect($('.eds-command-empty').textContent).toBe('Não foi possível carregar os comandos.');
    vi.unstubAllGlobals();
  });

  it('fonte remota: anuncia "Carregando" enquanto a busca está pendente', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => undefined)),
    );
    document.body.innerHTML =
      '<dialog id="cmd" class="eds-modal eds-command" data-eds-command data-eds-source="/busca?q="></dialog>';
    destroy = initCommand(document);
    key({ key: 'k', ctrlKey: true });
    await vi.advanceTimersByTimeAsync(300);
    expect(dialog()).toHaveAttribute('aria-busy', 'true');
    expect($('[role="status"]').textContent).toBe('Carregando…');
    vi.unstubAllGlobals();
  });

  it('textos configuráveis', () => {
    setMessages({ commandTitle: 'Command palette' });
    setup();
    expect(dialog()).toHaveAttribute('aria-label', 'Command palette');
  });
});

describe('matchesShortcut', () => {
  const ev = (init: KeyboardEventInit) => new KeyboardEvent('keydown', init);
  it('mod aceita Ctrl ou Cmd e rejeita modificadores extras', () => {
    expect(matchesShortcut(ev({ key: 'K', ctrlKey: true }), 'mod+k')).toBe(true);
    expect(matchesShortcut(ev({ key: 'k', metaKey: true }), 'mod+k')).toBe(true);
    expect(matchesShortcut(ev({ key: 'k', ctrlKey: true, altKey: true }), 'mod+k')).toBe(false);
    expect(matchesShortcut(ev({ key: 'k' }), 'mod+k')).toBe(false);
    expect(matchesShortcut(ev({ key: '/' }), '/')).toBe(true);
    expect(matchesShortcut(ev({ key: '/', ctrlKey: true }), '/')).toBe(false);
  });
});
