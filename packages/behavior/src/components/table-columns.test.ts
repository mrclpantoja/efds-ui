import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bindAll } from '../core/registry';
import { collectTable } from './table-export';
import { tableBehavior } from './table';
import { columnsPanelBehavior, columnsResetBehavior, tableColumnsBehavior } from './table-columns';

const style = document.createElement('style');
style.textContent = '[popover] { display: block !important; }';
document.head.append(style);

const cell = (tag: 'th' | 'td', id: string, text: string, extra = '') =>
  `<${tag} ${tag === 'th' ? `scope="col" data-eds-col="${id}"` : ''} ${extra}>${text}</${tag}>`;

function build(attrs = 'data-eds-table-reorder data-eds-table-resize'): void {
  document.body.innerHTML = `
  <button type="button" popovertarget="painel" data-eds-columns-for="t" hidden>Colunas</button>
  <div id="painel" popover role="dialog">
    <ul data-eds-columns-list></ul>
    <button type="button" data-eds-columns-reset>Restaurar padrão</button>
  </div>
  <div class="eds-table-wrap">
    <table class="eds-table" id="t" ${attrs}>
      <caption>Pedidos</caption>
      <thead><tr>
        ${cell('th', 'codigo', 'Código', 'data-eds-pin="start"')}
        ${cell('th', 'cliente', 'Cliente')}
        ${cell('th', 'total', 'Total')}
        ${cell('th', 'situacao', 'Situação')}
        <th scope="col" class="eds-table-actions"><span class="eds-visually-hidden">Ações</span></th>
      </tr></thead>
      <tbody>
        <tr>${cell('td', '', 'P1')}${cell('td', '', 'Ana')}${cell('td', '', '10')}${cell('td', '', 'Pago')}<td>x</td></tr>
        <tr>${cell('td', '', 'P2')}${cell('td', '', 'Bia')}${cell('td', '', '20')}${cell('td', '', 'Aberto')}<td>x</td></tr>
        <tr><td colspan="5" class="eds-table-empty">vazio</td></tr>
      </tbody>
    </table>
  </div>`;
}

const T = () => document.getElementById('t') as HTMLTableElement;
const headers = () =>
  Array.from(T().tHead?.rows[0]?.cells ?? []).map((c) => c.getAttribute('data-eds-col') ?? 'acoes');
const firstRow = () => Array.from(T().tBodies[0]?.rows[0]?.cells ?? []).map((c) => c.textContent);
const visibleHeaders = () =>
  Array.from(T().tHead?.rows[0]?.cells ?? [])
    .filter((c) => !c.hidden)
    .map((c) => c.getAttribute('data-eds-col') ?? 'acoes');
const status = () => document.querySelector('[role="status"]')?.textContent ?? '';
const handle = (id: string) =>
  document.querySelector(`th[data-eds-col="${id}"] .eds-table-colhandle`) as HTMLButtonElement;

let stop: () => void;
const start = () => {
  stop = bindAll(document, [
    tableBehavior,
    tableColumnsBehavior,
    columnsPanelBehavior,
    columnsResetBehavior,
  ]);
};

beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  stop?.();
  document.body.innerHTML = '';
  vi.useRealTimers();
});

describe('colunas: alça de teclado', () => {
  beforeEach(() => {
    build();
    start();
  });

  it('cria a alça, o wrapper e a borda; um tab stop por coluna arranjável', () => {
    expect(handle('cliente').getAttribute('aria-label')).toBe('Ajustar coluna Cliente');
    expect(handle('cliente').getAttribute('aria-pressed')).toBe('false');
    expect(handle('cliente').getAttribute('aria-describedby')).toBeTruthy();
    expect(document.querySelectorAll('.eds-table-colhandle')).toHaveLength(4);
    expect(document.querySelectorAll('.eds-table-resize')).toHaveLength(4);
    expect(document.querySelector('.eds-table-actions .eds-table-colhandle')).toBeNull();
  });

  it('Espaço pega, setas movem th e td juntos, Espaço solta e emite uma vez', async () => {
    const user = userEvent.setup();
    const changes = vi.fn();
    T().addEventListener('eds:table-columns-change', (e) => changes((e as CustomEvent).detail));
    handle('total').focus();
    await user.keyboard(' ');
    expect(handle('total').getAttribute('aria-pressed')).toBe('true');
    expect(status()).toBe('Total pega.');
    await user.keyboard('{ArrowRight}');
    // Total é a penúltima arranjável: já não há depois dela além de Situação.
    expect(headers()).toEqual(['codigo', 'cliente', 'situacao', 'total', 'acoes']);
    expect(firstRow()).toEqual(['P1', 'Ana', 'Pago', '10', 'x']);
    expect(status()).toBe('Total: posição 4 de 4.');
    expect(document.activeElement).toBe(handle('total'));
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(headers().slice(0, 4)).toEqual(['codigo', 'total', 'cliente', 'situacao']);
    expect(changes).not.toHaveBeenCalled();
    await user.keyboard(' ');
    expect(handle('total').getAttribute('aria-pressed')).toBe('false');
    expect(changes).toHaveBeenCalledTimes(1);
    expect(changes.mock.calls[0]?.[0]).toMatchObject({ reason: 'move' });
    expect(status()).toBe('Total solta na posição 2 de 4.');
  });

  it('fixa no início não sai do grupo; linha de vazio (colspan) continua', async () => {
    const user = userEvent.setup();
    handle('cliente').focus();
    await user.keyboard(' {ArrowLeft}');
    expect(headers()[0]).toBe('codigo');
    expect(headers()[1]).toBe('cliente');
    expect(T().querySelector('.eds-table-empty')?.tagName).toBe('TD');
  });

  it('Home e End vão às pontas; Esc cancela e restaura', async () => {
    const user = userEvent.setup();
    handle('situacao').focus();
    await user.keyboard(' {Home}');
    expect(headers().slice(0, 4)).toEqual(['codigo', 'situacao', 'cliente', 'total']);
    await user.keyboard('{Escape}');
    expect(headers().slice(0, 4)).toEqual(['codigo', 'cliente', 'total', 'situacao']);
    expect(status()).toBe('Ajuste cancelado.');
    expect(handle('situacao').getAttribute('aria-pressed')).toBe('false');
  });

  it('Shift+setas redimensionam em 16 px (Ctrl 64) e respeitam os limites', async () => {
    const user = userEvent.setup();
    const th = document.querySelector('th[data-eds-col="cliente"]') as HTMLElement;
    th.setAttribute('data-eds-max-width', '200');
    handle('cliente').focus();
    // jsdom não mede: partimos de uma largura conhecida.
    await user.keyboard(' ');
    th.getBoundingClientRect = () => ({ width: 100 }) as DOMRect;
    await user.keyboard('{Shift>}{ArrowRight}{/Shift}');
    const col = T().querySelector('col[data-eds-col="cliente"]') as HTMLElement;
    expect(col.style.width).toBe('116px');
    expect(T().classList.contains('eds-table-fixed')).toBe(true);
    expect(status()).toBe('Largura de Cliente: 116 pixels.');
    await user.keyboard('{Control>}{Shift>}{ArrowRight}{/Shift}{/Control}');
    expect(col.style.width).toBe('180px');
    await user.keyboard('{Control>}{Shift>}{ArrowRight}{/Shift}{/Control}');
    expect(col.style.width).toBe('200px');
    await user.keyboard('{Escape}');
    expect(col.style.width).toBe('');
  });

  it('Tab com a alça pega cancela e segue', async () => {
    const user = userEvent.setup();
    handle('cliente').focus();
    await user.keyboard(' {ArrowRight}');
    expect(headers().slice(0, 4)).toEqual(['codigo', 'total', 'cliente', 'situacao']);
    await user.keyboard('{Tab}');
    expect(headers().slice(0, 4)).toEqual(['codigo', 'cliente', 'total', 'situacao']);
    expect(handle('cliente').getAttribute('aria-pressed')).toBe('false');
  });
});

describe('colunas: painel, visibilidade e preferências', () => {
  beforeEach(() => {
    build('data-eds-table-reorder data-eds-table-prefs="teste"');
    start();
  });
  const items = () =>
    Array.from(document.querySelectorAll<HTMLElement>('[data-eds-columns-list] li'));
  const box = (id: string) =>
    items()
      .find((li) => li.getAttribute('data-eds-col-id') === id)
      ?.querySelector('input') as HTMLInputElement;

  it('revela o botão e lista as colunas arranjáveis (sem ações) com os botões acessíveis', () => {
    expect((document.querySelector('[data-eds-columns-for]') as HTMLElement).hidden).toBe(false);
    expect(items().map((li) => li.getAttribute('data-eds-col-id'))).toEqual([
      'codigo',
      'cliente',
      'total',
      'situacao',
    ]);
    expect(
      items()[1]?.querySelector('button[aria-label="Mover Cliente para antes"]'),
    ).not.toBeNull();
  });

  it('ocultar esconde th e td, ajusta o colspan e anuncia; a última visível não sai', async () => {
    const user = userEvent.setup();
    await user.click(box('cliente'));
    expect(visibleHeaders()).toEqual(['codigo', 'total', 'situacao', 'acoes']);
    expect((T().tBodies[0]?.rows[0]?.cells[1] as HTMLElement).hidden).toBe(true);
    expect((T().querySelector('.eds-table-empty') as HTMLTableCellElement).colSpan).toBe(4);
    expect(status()).toBe('Coluna Cliente oculta. 3 de 4 colunas visíveis.');
    await user.click(box('total'));
    await user.click(box('situacao'));
    expect(box('codigo').disabled).toBe(true);
    await user.click(box('cliente'));
    expect(visibleHeaders()).toEqual(['codigo', 'cliente', 'acoes']);
    expect(status()).toBe('Coluna Cliente exibida. 2 de 4 colunas visíveis.');
  });

  it('mover pelo painel mantém o foco no botão e emite o evento', async () => {
    const user = userEvent.setup();
    const changes = vi.fn();
    T().addEventListener('eds:table-columns-change', (e) =>
      changes((e as CustomEvent).detail.reason),
    );
    const after = () =>
      items()[2]?.querySelector('button[aria-label="Mover Total para depois"]') as HTMLElement;
    await user.click(after());
    expect(visibleHeaders().slice(0, 4)).toEqual(['codigo', 'cliente', 'situacao', 'total']);
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Mover Total para depois');
    expect(changes).toHaveBeenCalledWith('move');
  });

  it('salva em localStorage com debounce, restaura e Restaurar padrão apaga a chave', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(box('cliente'));
    expect(localStorage.getItem('eds:table:teste')).toBeNull();
    vi.advanceTimersByTime(350);
    const saved = JSON.parse(localStorage.getItem('eds:table:teste') ?? '{}');
    expect(saved).toMatchObject({ v: 1, hidden: ['cliente'] });
    expect(saved.order).toEqual(['codigo', 'cliente', 'total', 'situacao']);
    // Nova ligação lê as preferências antes de aplicar.
    stop();
    build('data-eds-table-reorder data-eds-table-prefs="teste"');
    start();
    expect(visibleHeaders()).toEqual(['codigo', 'total', 'situacao', 'acoes']);
    await user.click(document.querySelector('[data-eds-columns-reset]') as HTMLElement);
    expect(visibleHeaders()).toEqual(['codigo', 'cliente', 'total', 'situacao', 'acoes']);
    expect(localStorage.getItem('eds:table:teste')).toBeNull();
    expect(status()).toBe('Colunas restauradas.');
  });

  it('preferências inválidas, de outra versão ou com ids desconhecidos não quebram', () => {
    stop();
    localStorage.setItem('eds:table:teste', '{nao é json');
    build('data-eds-table-reorder data-eds-table-prefs="teste"');
    start();
    expect(visibleHeaders()).toEqual(['codigo', 'cliente', 'total', 'situacao', 'acoes']);
    stop();
    localStorage.setItem(
      'eds:table:teste',
      JSON.stringify({ v: 1, order: ['fantasma', 'situacao', 'cliente'], hidden: ['fantasma'] }),
    );
    build('data-eds-table-reorder data-eds-table-prefs="teste"');
    start();
    // Colunas novas entram no fim; ids desconhecidos são ignorados; a fixa continua primeiro.
    expect(headers()).toEqual(['codigo', 'situacao', 'cliente', 'total', 'acoes']);
    stop();
    localStorage.setItem('eds:table:teste', JSON.stringify({ v: 2, hidden: ['cliente'] }));
    build('data-eds-table-reorder data-eds-table-prefs="teste"');
    start();
    expect(visibleHeaders()).toHaveLength(5);
  });

  it('localStorage indisponível não gera erro', async () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    stop();
    build('data-eds-table-reorder data-eds-table-prefs="teste"');
    expect(() => start()).not.toThrow();
    spy.mockRestore();
  });
});

describe('colunas fixas e exportação', () => {
  it('aplica as classes e o offset às células da coluna fixa', () => {
    build('');
    start();
    const cells = Array.from(T().rows)
      .filter((r) => r.cells.length === 5)
      .map((r) => r.cells[0] as HTMLElement);
    expect(cells.every((c) => c.classList.contains('eds-table-pin-start'))).toBe(true);
    expect(cells.every((c) => c.classList.contains('eds-table-pin-edge'))).toBe(true);
    expect(cells[0]?.style.getPropertyValue('--_pin-inset')).toBe('0px');
  });

  it('a exportação ignora colunas ocultas e segue a ordem visual', async () => {
    build('data-eds-table-reorder');
    start();
    const user = userEvent.setup();
    const box = document.querySelector('[data-eds-col-id="cliente"] input') as HTMLInputElement;
    await user.click(box);
    handle('situacao').focus();
    await user.keyboard(' {ArrowLeft}');
    const { data } = collectTable(T());
    expect(data.columns.map((c) => c.label)).toEqual(['Código', 'Situação', 'Total']);
  });
});

describe('colunas: linhas desenhadas pelo app e fixa fora da ponta', () => {
  const rowHtml = (id: string) =>
    `<tr>${cell('td', '', `${id}-codigo`)}${cell('td', '', `${id}-cliente`)}${cell('td', '', `${id}-total`)}${cell('td', '', `${id}-situacao`)}<td>x</td></tr>`;

  it('linhas novas, escritas na ordem original, são reordenadas e ocultadas pela coluna certa', async () => {
    build('data-eds-table-reorder');
    start();
    const user = userEvent.setup();
    handle('situacao').focus();
    await user.keyboard(' {ArrowLeft} ');
    expect(headers().slice(0, 4)).toEqual(['codigo', 'cliente', 'situacao', 'total']);
    const box = document.querySelector('[data-eds-col-id="cliente"] input') as HTMLInputElement;
    await user.click(box);
    // O app redesenha o corpo na ordem de origem.
    T().tBodies[0]!.innerHTML = rowHtml('A') + rowHtml('B');
    await Promise.resolve();
    await Promise.resolve();
    const row = T().tBodies[0]!.rows[0]!;
    expect(Array.from(row.cells).map((c) => c.textContent)).toEqual([
      'A-codigo',
      'A-cliente',
      'A-situacao',
      'A-total',
      'x',
    ]);
    expect(Array.from(row.cells).map((c) => c.hidden)).toEqual([false, true, false, false, false]);
    // Nova rodada com o corpo já arranjado continua estável.
    T().tBodies[0]!.insertAdjacentHTML('beforeend', rowHtml('C'));
    await Promise.resolve();
    await Promise.resolve();
    expect(Array.from(T().tBodies[0]!.rows[0]!.cells).map((c) => c.textContent)).toEqual([
      'A-codigo',
      'A-cliente',
      'A-situacao',
      'A-total',
      'x',
    ]);
    expect(Array.from(T().tBodies[0]!.rows[2]!.cells).map((c) => c.textContent)).toEqual([
      'C-codigo',
      'C-cliente',
      'C-situacao',
      'C-total',
      'x',
    ]);
  });

  it('fixa fora da ponta: a ordem salva é a que aparece depois de recarregar', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const markup = () => {
      build('data-eds-table-reorder data-eds-table-prefs="fixa"');
      // Move o th e as células da fixa para a segunda posição (origem com a fixa no meio).
      const head = T().tHead!.rows[0]!;
      head.insertBefore(head.cells[0]!, head.cells[2]!);
      for (const r of Array.from(T().tBodies[0]!.rows)) {
        if (r.cells.length === 5) r.insertBefore(r.cells[0]!, r.cells[2]!);
      }
    };
    markup();
    start();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const seen = headers();
    expect(seen.slice(0, 4)).toEqual(['codigo', 'cliente', 'total', 'situacao']);
    const box = document.querySelector('[data-eds-col-id="total"] input') as HTMLInputElement;
    await user.click(box);
    vi.advanceTimersByTime(350);
    const saved = JSON.parse(localStorage.getItem('eds:table:fixa') ?? '{}');
    expect(saved.order).toEqual(seen.slice(0, 4));
    stop();
    markup();
    start();
    expect(headers().slice(0, 4)).toEqual(saved.order);
  });
});
