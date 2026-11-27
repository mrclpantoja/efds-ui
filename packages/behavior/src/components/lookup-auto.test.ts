import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installDomPolyfills } from '../test-utils/dom-polyfills';
import { initLookup, lookupController } from './lookup';

const items = JSON.stringify([
  { code: '10', description: 'Aurora Comércio Ltda.' },
  { code: '11', description: 'Boreal Serviços' },
  { code: '12', description: 'Cedro Alimentos' },
  { code: '20', description: 'Aurora Norte' },
]);

const markup = (attrs: string) => `
<form id="f">
  <label for="c">Cliente</label>
  <div class="eds-lookup" data-eds-lookup ${attrs}>
    <input class="eds-input eds-lookup-code" id="c" name="cliente" autocomplete="off" aria-describedby="c-err" />
    <button type="button" class="eds-button" aria-label="Buscar cliente">lupa</button>
    <output class="eds-lookup-description" aria-live="polite" data-empty>—</output>
  </div>
  <p class="eds-error" id="c-err" hidden></p>
</form>`;

const input = () => document.getElementById('c') as HTMLInputElement;
const root = () => document.querySelector<HTMLElement>('[data-eds-lookup]')!;
const popup = () => document.querySelector<HTMLElement>('.eds-combobox-popup')!;
const options = () => Array.from(popup().querySelectorAll<HTMLElement>('[role="option"]'));
const description = () => document.querySelector<HTMLElement>('.eds-lookup-description')!;

let restore: () => void;
let destroy: (() => void) | undefined;

function mount(attrs: string) {
  // A lista local vem num <script type="application/json" data-eds-lookup-items> dentro do .eds-lookup.
  const local = /data-eds-lookup-items='([^']*)'/.exec(attrs);
  const rest = attrs.replace(/data-eds-lookup-items='[^']*'/, '');
  document.body.innerHTML = markup(rest);
  if (local) {
    const script = document.createElement('script');
    script.type = 'application/json';
    script.setAttribute('data-eds-lookup-items', '');
    script.textContent = local[1] ?? '';
    document.querySelector('[data-eds-lookup]')?.prepend(script);
  }
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

describe('Lookup: autocompletar por código ou nome', () => {
  beforeEach(() => mount(`data-eds-lookup-items='${items}'`));

  it('liga o padrão combobox no campo e filtra por nome e por código', async () => {
    const user = userEvent.setup();
    expect(input()).toHaveAttribute('role', 'combobox');
    expect(input()).toHaveAttribute('aria-autocomplete', 'list');
    expect(input()).toHaveAttribute('aria-expanded', 'false');
    await user.type(input(), 'auro');
    await vi.waitFor(() => expect(options()).toHaveLength(2));
    expect(input()).toHaveAttribute('aria-expanded', 'true');
    expect(options()[0]!.querySelector('.eds-combobox-option-code')).toHaveTextContent('10');
    await user.clear(input());
    await user.type(input(), '12');
    await vi.waitFor(() => expect(options()).toHaveLength(1));
    expect(options()[0]).toHaveTextContent('Cedro Alimentos');
  });

  it('setas e Enter escolhem: código no campo, descrição e evento', async () => {
    const user = userEvent.setup();
    const seen: string[] = [];
    root().addEventListener('eds:lookup-change', (e) =>
      seen.push((e as CustomEvent<{ code: string }>).detail.code),
    );
    await user.type(input(), 'aurora');
    await vi.waitFor(() => expect(options()).toHaveLength(2));
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(input().getAttribute('aria-activedescendant')).toBe(options()[1]!.id);
    await user.keyboard('{Enter}');
    expect(input().value).toBe('20');
    expect(description()).toHaveTextContent('Aurora Norte');
    expect(input()).toHaveAttribute('aria-expanded', 'false');
    expect(seen).toEqual(['20']);
  });

  it('Esc fecha a lista sem limpar; clique numa opção escolhe', async () => {
    const user = userEvent.setup();
    await user.type(input(), 'bor');
    await vi.waitFor(() => expect(options()).toHaveLength(1));
    await user.keyboard('{Escape}');
    expect(input()).toHaveAttribute('aria-expanded', 'false');
    expect(input().value).toBe('bor');
    await user.type(input(), 'e');
    await vi.waitFor(() => expect(options()).toHaveLength(1));
    await user.click(options()[0]!);
    expect(input().value).toBe('11');
    expect(description()).toHaveTextContent('Boreal Serviços');
  });

  it('anuncia a quantidade de resultados', async () => {
    const user = userEvent.setup();
    await user.type(input(), 'aurora');
    const status = root().querySelector(':scope > [role="status"]')!;
    await vi.waitFor(() => expect(status).toHaveTextContent('2 resultados disponíveis.'));
  });

  it('data-eds-lookup-autocomplete="false" desliga a lista', () => {
    destroy?.();
    mount(`data-eds-lookup-items='${items}' data-eds-lookup-autocomplete="false"`);
    expect(input()).not.toHaveAttribute('role');
    expect(document.querySelector('.eds-combobox-popup')).toBeNull();
  });

  it('o código digitado e confirmado com Tab continua resolvendo', async () => {
    const user = userEvent.setup();
    await user.type(input(), '11');
    await user.tab();
    await vi.waitFor(() => expect(description()).toHaveTextContent('Boreal Serviços'));
  });
});

describe('Lookup: Cadastrar novo', () => {
  it('sem resultado mostra a opção final e dispara eds:lookup-create (cancelável)', async () => {
    mount(`data-eds-lookup-items='${items}' data-eds-lookup-create="Cadastrar novo…"`);
    const user = userEvent.setup();
    const texts: string[] = [];
    root().addEventListener('eds:lookup-create', (e) => {
      texts.push((e as CustomEvent<{ text: string }>).detail.text);
      expect(e.cancelable).toBe(true);
    });
    await user.type(input(), 'zzz');
    await vi.waitFor(() => expect(options()).toHaveLength(1));
    expect(options()[0]).toHaveClass('eds-combobox-option-create');
    expect(options()[0]).toHaveTextContent('Cadastrar novo…');
    await user.keyboard('{ArrowDown}{Enter}');
    expect(texts).toEqual(['zzz']);
    expect(input()).toHaveAttribute('aria-expanded', 'false');
  });

  it('com resultados a opção não aparece, salvo data-eds-lookup-create-always', async () => {
    mount(`data-eds-lookup-items='${items}' data-eds-lookup-create`);
    const user = userEvent.setup();
    await user.type(input(), 'aurora');
    await vi.waitFor(() => expect(options()).toHaveLength(2));
    expect(popup().querySelector('.eds-combobox-option-create')).toBeNull();
    destroy?.();
    mount(`data-eds-lookup-items='${items}' data-eds-lookup-create data-eds-lookup-create-always`);
    await user.type(input(), 'aurora');
    await vi.waitFor(() => expect(options()).toHaveLength(3));
    expect(options()[2]).toHaveTextContent('Cadastrar novo…');
  });

  it('EDS.lookup(el).setValue devolve o cadastro ao campo', () => {
    mount(`data-eds-lookup-items='${items}' data-eds-lookup-create`);
    const seen: string[] = [];
    root().addEventListener('eds:lookup-change', (e) =>
      seen.push((e as CustomEvent<{ code: string }>).detail.code),
    );
    lookupController(root())!.setValue({ code: '99', description: 'Novo Cliente' });
    expect(input().value).toBe('99');
    expect(description()).toHaveTextContent('Novo Cliente');
    expect(lookupController(root())!.getValue()).toEqual({
      code: '99',
      description: 'Novo Cliente',
    });
    expect(seen).toEqual(['99']);
    lookupController(root())!.clear();
    expect(input().value).toBe('');
    expect(description()).toHaveAttribute('data-empty');
  });
});

describe('Lookup: fonte remota', () => {
  it('busca na fonte e mostra as opções', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify([{ code: '7', description: 'Remoto Sete' }]), { status: 200 }),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    mount(`data-eds-source="/api/c?q="`);
    const user = userEvent.setup();
    await user.type(input(), 'sete');
    await vi.waitFor(() => expect(options()).toHaveLength(1), { timeout: 2000 });
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toBe('/api/c?q=sete');
  });
});
