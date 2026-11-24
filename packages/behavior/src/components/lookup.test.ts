import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installDomPolyfills } from '../test-utils/dom-polyfills';
import { initLookup } from './lookup';

const items = JSON.stringify([
  { code: '10', description: 'Aurora Comércio Ltda.' },
  { code: '11', description: 'Boreal Serviços' },
  { code: '12', description: 'Cedro Alimentos' },
]);

const markup = (attrs: string) => `
<form id="f">
  <label for="c">Cliente</label>
  <div class="eds-lookup" data-eds-lookup ${attrs}>
    <input class="eds-input eds-lookup-code" id="c" name="cliente" autocomplete="off" aria-describedby="c-err" />
    <button type="button" class="eds-button" aria-label="Buscar cliente">lupa</button>
    <output class="eds-lookup-description" aria-live="polite" data-empty="true">—</output>
  </div>
  <p class="eds-error" id="c-err" hidden></p>
</form>`;

const input = () => document.getElementById('c') as HTMLInputElement;
const description = () => document.querySelector<HTMLElement>('.eds-lookup-description')!;
const error = () => document.getElementById('c-err') as HTMLElement;
const dialog = () => document.querySelector<HTMLDialogElement>('dialog.eds-lookup-dialog')!;
const rows = () => Array.from(dialog().querySelectorAll('tbody tr'));

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

let restore: () => void;
let destroy: (() => void) | undefined;

function mount(attrs: string) {
  document.body.innerHTML = markup(attrs);
  destroy = initLookup(document);
}

beforeEach(() => {
  restore = installDomPolyfills();
});
afterEach(() => {
  destroy?.();
  destroy = undefined;
  document.body.innerHTML = '';
  restore();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('Lookup (lista local)', () => {
  beforeEach(() => mount(`data-eds-lookup-items='${items}'`));

  it('digitar o código e sair do campo mostra a descrição e emite eds:lookup-change', async () => {
    const user = userEvent.setup();
    const seen: { code: string; description: string }[] = [];
    document
      .querySelector('[data-eds-lookup]')!
      .addEventListener('eds:lookup-change', (e) =>
        seen.push((e as CustomEvent<{ code: string; description: string }>).detail),
      );
    await user.type(input(), '11');
    await user.tab();
    await vi.waitFor(() => expect(description()).toHaveTextContent('Boreal Serviços'));
    expect(description()).not.toHaveAttribute('data-empty');
    expect(seen).toEqual([expect.objectContaining({ code: '11', description: 'Boreal Serviços' })]);
    expect(input()).not.toHaveAttribute('aria-invalid');
  });

  it('código inexistente mostra o erro visível, ligado ao campo', async () => {
    const user = userEvent.setup();
    await user.type(input(), '99');
    await user.tab();
    await vi.waitFor(() => expect(error()).toHaveTextContent('Código não encontrado.'));
    expect(error().hidden).toBe(false);
    expect(input()).toHaveAttribute('aria-invalid', 'true');
    expect(input().getAttribute('aria-describedby')).toContain('c-err');
    expect(description()).toHaveAttribute('data-empty', 'true');
    // Corrigir limpa o erro.
    await user.clear(input());
    await user.type(input(), '10');
    await user.tab();
    await vi.waitFor(() => expect(error().hidden).toBe(true));
    expect(input()).not.toHaveAttribute('aria-invalid');
  });

  it('apagar o código volta à descrição vazia', async () => {
    const user = userEvent.setup();
    await user.type(input(), '10');
    await user.tab();
    await vi.waitFor(() => expect(description()).toHaveTextContent('Aurora'));
    await user.clear(input());
    await user.tab();
    await vi.waitFor(() => expect(description()).toHaveTextContent('—'));
    expect(description()).toHaveAttribute('data-empty', 'true');
  });

  it('o botão abre o diálogo com a lista, a busca filtra e escolher devolve o foco ao campo', async () => {
    const user = userEvent.setup();
    await user.click(document.querySelector('button[aria-label="Buscar cliente"]')!);
    expect(dialog().open).toBe(true);
    expect(dialog().classList.contains('eds-modal-lg')).toBe(true);
    await vi.waitFor(() => expect(rows()).toHaveLength(3));
    expect(dialog().querySelector('[role="status"]')).toHaveTextContent(
      '3 resultados disponíveis.',
    );
    await user.type(dialog().querySelector('input[type="search"]')!, 'cedro');
    await vi.waitFor(() => expect(rows()).toHaveLength(1));
    const pick = rows()[0]!.querySelector('button')!;
    expect(pick).toHaveAccessibleName('Selecionar 12, Cedro Alimentos');
    await user.click(pick);
    expect(dialog().open).toBe(false);
    expect(input()).toHaveValue('12');
    expect(description()).toHaveTextContent('Cedro Alimentos');
    expect(document.activeElement).toBe(input());
  });

  it('o diálogo tem nome e botão de fechar', async () => {
    const user = userEvent.setup();
    await user.click(document.querySelector('button[aria-label="Buscar cliente"]')!);
    expect(dialog()).toHaveAttribute('aria-labelledby');
    expect(document.getElementById(dialog().getAttribute('aria-labelledby')!)).toHaveTextContent(
      'Buscar cliente',
    );
    await user.click(dialog().querySelector('[data-eds-close]')!);
    expect(dialog().open).toBe(false);
  });
});

describe('Lookup (fonte remota)', () => {
  it('busca na fonte com ?q= e resolve o código pela mesma lista', async () => {
    const fetchMock = vi.fn((url: string) =>
      url.includes('q=aur')
        ? json([{ code: '10', description: 'Aurora Comércio Ltda.' }])
        : json([
            { code: '10', description: 'Aurora Comércio Ltda.' },
            { code: '11', description: 'Boreal' },
          ]),
    );
    vi.stubGlobal('fetch', fetchMock);
    mount('data-eds-lookup-source="/api/clientes?q="');
    const user = userEvent.setup();
    await user.type(input(), '10');
    await user.tab();
    await vi.waitFor(() => expect(description()).toHaveTextContent('Aurora'));
    expect(fetchMock).toHaveBeenCalledWith('/api/clientes?q=10', expect.anything());
  });

  it('usa data-eds-lookup-resolve quando existe e trata 404 como não encontrado', async () => {
    const fetchMock = vi.fn(() => json(null, 404));
    vi.stubGlobal('fetch', fetchMock);
    mount('data-eds-lookup-resolve="/api/cliente?codigo="');
    const user = userEvent.setup();
    await user.type(input(), '77');
    await user.tab();
    await vi.waitFor(() => expect(error()).toHaveTextContent('Código não encontrado.'));
    expect(fetchMock).toHaveBeenCalledWith('/api/cliente?codigo=77', expect.anything());
  });

  it('falha de rede na resolução mostra erro e a busca do diálogo oferece "Tentar de novo"', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('rede'))),
    );
    mount('data-eds-lookup-source="/api/clientes?q="');
    const user = userEvent.setup();
    await user.type(input(), '10');
    await user.tab();
    await vi.waitFor(() => expect(error()).toHaveTextContent('Não foi possível buscar'));
    await user.click(document.querySelector('button[aria-label="Buscar cliente"]')!);
    const retryBox = dialog().querySelector<HTMLElement>('[data-eds-lookup-error]')!;
    await vi.waitFor(() => expect(retryBox.hidden).toBe(false));
    vi.stubGlobal(
      'fetch',
      vi.fn(() => json([{ code: '10', description: 'Aurora' }])),
    );
    await user.click(retryBox.querySelector('button')!);
    await vi.waitFor(() => expect(rows()).toHaveLength(1));
    expect(retryBox.hidden).toBe(true);
  });

  it('sem fonte nem itens, nada é chamado', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    mount('');
    const user = userEvent.setup();
    await user.type(input(), '10');
    await user.tab();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
