import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bindAll } from '../core/registry';
import { tableController } from '../core/table-hub';
import { sortClearBehavior, tableBehavior } from './table';
import { tableBulkBehavior } from './table-bulk';
import { columnFilterBehavior, tableChipsBehavior } from './table-column-filter';
import { tableFilterBehavior } from './table-filter';
import { tablePaginationBehavior, tableRemoteBehavior } from './table-remote';

// O jsdom esconde `[popover]`; os campos precisam estar visíveis para o userEvent.
const style = document.createElement('style');
style.textContent = '[popover] { display: block !important; }';
document.head.append(style);

const sortBtn = (label: string, extra = '') =>
  `<button type="button" class="eds-table-sort">${label}</button>${extra}`;

const rowsHtml = `
  <tr data-eds-row-id="1"><td><input type="checkbox" data-eds-select-row aria-label="s1" /></td><td>Beta</td><td>R$ 100,00</td><td>Pago</td></tr>
  <tr data-eds-row-id="2"><td><input type="checkbox" data-eds-select-row aria-label="s2" /></td><td>Alfa</td><td>R$ 300,00</td><td>Pendente</td></tr>
  <tr data-eds-row-id="3"><td><input type="checkbox" data-eds-select-row aria-label="s3" /></td><td>Beta</td><td>R$ 50,00</td><td>Pago</td></tr>
  <tr data-eds-row-id="4"><td><input type="checkbox" data-eds-select-row aria-label="s4" /></td><td>Gama</td><td>R$ 700,00</td><td>Atrasado</td></tr>`;

const filterPopover = (id: string, type: string, key: string, body: string) => `
  <div class="eds-table-th">
    <button type="button" class="eds-table-filter-btn" popovertarget="${id}" aria-label="Filtrar ${key}"></button>
    <div id="${id}" class="eds-popover eds-table-filter" popover role="dialog">
      <form data-eds-column-filter="${type}">${body}
        <button type="submit">Aplicar</button>
        <button type="reset" data-eds-filter-clear>Limpar</button>
      </form>
    </div>
  </div>`;

function build(attrs = '', extra = ''): void {
  document.body.innerHTML = `
  <input data-eds-table-filter="t" id="busca" />
  <ul data-eds-table-chips="t"></ul>
  <button type="button" data-eds-sort-clear id="limpar">Limpar</button>
  <div class="eds-table-wrap">
    <table class="eds-table" id="t" ${attrs}>
      <caption>Pedidos</caption>
      <thead><tr>
        <th scope="col" class="eds-table-check"><input type="checkbox" data-eds-select-all aria-label="todos" /></th>
        <th scope="col" data-eds-col="cliente" aria-sort="none">${sortBtn('Cliente')}${filterPopover('f-cliente', 'text', 'cliente', '<input name="filter[cliente]" type="search" />')}</th>
        <th scope="col" data-eds-col="total" aria-sort="none">${sortBtn('Total')}${filterPopover('f-total', 'number', 'total', '<input name="filter[total][gte]" id="min" /><input name="filter[total][lte]" id="max" />')}</th>
        <th scope="col" data-eds-col="situacao" aria-sort="none">${sortBtn('Situação')}${filterPopover('f-sit', 'select', 'situacao', '<input type="checkbox" name="filter[situacao]" value="pago" id="c-pago" /><input type="checkbox" name="filter[situacao]" value="pendente" id="c-pend" />')}</th>
      </tr></thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  </div>
  <div class="eds-table-bulk" data-eds-table-bulk="t" hidden>
    <span data-eds-bulk-count></span>
    <button type="button" data-eds-bulk-all-results hidden>Todos <span data-eds-bulk-total></span></button>
    <button type="button" data-eds-bulk-action="arquivar">Arquivar</button>
    <button type="button" data-eds-bulk-clear>Limpar seleção</button>
  </div>${extra}`;
}

const T = () => document.getElementById('t') as HTMLTableElement;
const names = () =>
  Array.from(T().tBodies[0]?.rows ?? [])
    .filter((r) => !r.hidden && !r.querySelector('.eds-table-empty'))
    .map(
      (r) =>
        (r.cells[1] as HTMLElement).textContent + '|' + (r.cells[2] as HTMLElement).textContent,
    );
const th = (key: string) => T().querySelector(`th[data-eds-col="${key}"]`) as HTMLElement;
const sortButton = (key: string) => th(key).querySelector('.eds-table-sort') as HTMLElement;
const status = () => document.querySelector('[role="status"]')?.textContent ?? '';

let stop: () => void;
const start = () => {
  stop = bindAll(document, [
    tableBehavior,
    sortClearBehavior,
    tableFilterBehavior,
    columnFilterBehavior,
    tableChipsBehavior,
    tableBulkBehavior,
    tableRemoteBehavior,
    tablePaginationBehavior,
  ]);
};

afterEach(() => {
  stop?.();
  document.body.innerHTML = '';
});

describe('ordenação múltipla', () => {
  beforeEach(() => {
    build('data-eds-sort-multi data-eds-sort-max="2"');
    start();
  });

  it('clique substitui; Shift+clique acrescenta; aria-sort só no primário', async () => {
    const user = userEvent.setup();
    await user.click(sortButton('cliente'));
    expect(th('cliente').getAttribute('aria-sort')).toBe('ascending');
    await user.keyboard('{Shift>}');
    await user.click(sortButton('total'));
    await user.keyboard('{/Shift}');
    expect(th('cliente').getAttribute('aria-sort')).toBe('ascending');
    expect(th('total').hasAttribute('aria-sort')).toBe(false);
    expect(th('total').getAttribute('data-eds-sort-order')).toBe('2');
    expect(th('total').getAttribute('data-eds-sort-dir')).toBe('ascending');
    expect(th('situacao').getAttribute('aria-sort')).toBe('none');
    expect(sortButton('total').querySelector('.eds-table-sort-order')?.textContent).toBe('2');
    expect(sortButton('total').querySelector('.eds-table-sort-text')?.textContent).toContain(
      'critério 2, crescente',
    );
    expect(names()).toEqual([
      'Alfa|R$ 300,00',
      'Beta|R$ 50,00',
      'Beta|R$ 100,00',
      'Gama|R$ 700,00',
    ]);
    expect(status()).toBe('Ordenado por Cliente, crescente, depois Total, crescente.');
  });

  it('Shift+Enter acrescenta; de novo alterna; depois de descendente remove', async () => {
    const user = userEvent.setup();
    await user.click(sortButton('cliente'));
    sortButton('total').focus();
    await user.keyboard('{Shift>}{Enter}{/Shift}');
    expect(th('total').getAttribute('data-eds-sort-dir')).toBe('ascending');
    await user.keyboard('{Shift>}{Enter}{/Shift}');
    expect(th('total').getAttribute('data-eds-sort-dir')).toBe('descending');
    expect(names().slice(1, 3)).toEqual(['Beta|R$ 100,00', 'Beta|R$ 50,00']);
    await user.keyboard('{Shift>}{Enter}{/Shift}');
    expect(th('total').hasAttribute('data-eds-sort-dir')).toBe(false);
    expect(th('total').getAttribute('aria-sort')).toBe('none');
    expect(status()).toBe('Ordenação por Total removida.');
  });

  it('respeita o máximo e avisa', async () => {
    const user = userEvent.setup();
    await user.click(sortButton('cliente'));
    await user.keyboard('{Shift>}');
    await user.click(sortButton('total'));
    await user.click(sortButton('situacao'));
    await user.keyboard('{/Shift}');
    expect(th('situacao').getAttribute('aria-sort')).toBe('none');
    expect(status()).toBe('Máximo de 2 colunas na ordenação.');
  });

  it('o evento traz a ordenação completa e pode ser cancelado', async () => {
    const user = userEvent.setup();
    const seen: unknown[] = [];
    T().addEventListener('eds:table-sort', (e) => {
      const detail = (e as CustomEvent).detail;
      seen.push(detail);
      e.preventDefault();
    });
    await user.click(sortButton('cliente'));
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({
      key: 'cliente',
      reason: 'replace',
      sort: [{ key: 'cliente', direction: 'ascending' }],
    });
    // Cancelado: nada mudou; o app chama setState.
    expect(th('cliente').getAttribute('aria-sort')).toBe('none');
    tableController(T())?.setState({ sort: [{ key: 'total', direction: 'descending' }] });
    expect(th('total').getAttribute('aria-sort')).toBe('descending');
  });

  it('o botão "remover ordenação" limpa tudo e mantém o foco', async () => {
    const user = userEvent.setup();
    await user.click(sortButton('cliente'));
    await user.click(document.getElementById('limpar') as HTMLElement);
    expect(th('cliente').getAttribute('aria-sort')).toBe('none');
    expect(document.activeElement).toBe(document.getElementById('limpar'));
    expect(status()).toBe('Ordenação removida.');
  });

  it('a dica da ordenação por Shift liga-se aos botões', () => {
    const id = sortButton('cliente').getAttribute('aria-describedby');
    expect(id).toBeTruthy();
    expect(document.getElementById(id as string)?.textContent).toContain('Shift');
  });
});

describe('filtro por coluna', () => {
  beforeEach(() => {
    build();
    start();
  });

  const form = (key: string) => th(key).querySelector('form') as HTMLFormElement;

  it('texto: aplica pelo envio, filtra, marca o botão e anuncia uma vez', async () => {
    const user = userEvent.setup();
    const field = form('cliente').querySelector('input') as HTMLInputElement;
    await user.type(field, 'bet{Enter}');
    expect(names()).toHaveLength(2);
    const btn = th('cliente').querySelector('.eds-table-filter-btn') as HTMLElement;
    expect(btn.hasAttribute('data-active')).toBe(true);
    expect(btn.getAttribute('aria-label')).toBe('Filtrar cliente, filtro ativo');
    expect(th('cliente').hasAttribute('data-eds-filtered')).toBe(true);
    expect(status()).toBe('Cliente filtrada. 2 resultados.');
    expect(document.activeElement).toBe(btn);
  });

  it('número: faixa; faixa invertida mostra erro e não aplica', async () => {
    const user = userEvent.setup();
    const min = document.getElementById('min') as HTMLInputElement;
    const max = document.getElementById('max') as HTMLInputElement;
    await user.type(min, '500');
    await user.type(max, '100{Enter}');
    expect(form('total').querySelector('.eds-error')).not.toBeNull();
    expect(min.getAttribute('aria-invalid')).toBe('true');
    expect(names()).toHaveLength(4);
    await user.clear(max);
    await user.type(max, '800{Enter}');
    expect(names()).toEqual(['Gama|R$ 700,00']);
    expect(form('total').querySelector('.eds-error')).toBeNull();
  });

  it('seleção: marcadas viram lista; Limpar remove e anuncia', async () => {
    const user = userEvent.setup();
    await user.click(document.getElementById('c-pago') as HTMLElement);
    await user.click(form('situacao').querySelector('button[type=submit]') as HTMLElement);
    expect(names()).toHaveLength(2);
    expect(tableController(T())?.getState().query.filters.situacao).toEqual(['pago']);
    await user.click(form('situacao').querySelector('[data-eds-filter-clear]') as HTMLElement);
    expect(names()).toHaveLength(4);
    expect(status()).toBe('Filtro de Situação removido. 4 resultados.');
  });

  it('chips: listam, removem e devolvem o foco ao chip seguinte ou ao botão', async () => {
    const user = userEvent.setup();
    await user.type(form('cliente').querySelector('input') as HTMLInputElement, 'beta{Enter}');
    await user.type(document.getElementById('min') as HTMLInputElement, '60{Enter}');
    const chips = () =>
      Array.from(document.querySelectorAll<HTMLElement>('[data-eds-chip-remove]'));
    expect(chips().map((c) => c.textContent)).toEqual(['Cliente: beta', 'Total: a partir de 60']);
    expect(names()).toEqual(['Beta|R$ 100,00']);
    await user.click(chips()[0] as HTMLElement);
    expect(names()).toHaveLength(3);
    expect(document.activeElement).toBe(chips()[0]);
    await user.click(chips()[0] as HTMLElement);
    expect(document.activeElement).toBe(th('total').querySelector('.eds-table-filter-btn'));
  });

  it('combina com a busca geral (E lógico) e emite um evento cancelável', async () => {
    const user = userEvent.setup();
    const events: unknown[] = [];
    T().addEventListener('eds:table-column-filter', (e) => events.push((e as CustomEvent).detail));
    await user.type(document.getElementById('busca') as HTMLInputElement, 'beta');
    await vi.waitFor(() => expect(names()).toHaveLength(2));
    await user.type(document.getElementById('min') as HTMLInputElement, '80{Enter}');
    expect(names()).toEqual(['Beta|R$ 100,00']);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ key: 'total', value: { gte: '80' } });
  });

  it('zero resultados mostra a linha de vazio', async () => {
    const user = userEvent.setup();
    await user.type(form('cliente').querySelector('input') as HTMLInputElement, 'zzz{Enter}');
    expect(T().querySelector('.eds-table-empty')).not.toBeNull();
    expect(names()).toHaveLength(0);
  });
});

describe('lote', () => {
  beforeEach(() => {
    build('data-eds-total="248"');
    start();
  });
  const bar = () => document.querySelector('[data-eds-table-bulk]') as HTMLElement;
  const box = (n: number) =>
    T().querySelectorAll<HTMLInputElement>('[data-eds-select-row]')[n] as HTMLInputElement;

  it('aparece com a seleção, conta e some ao limpar', async () => {
    const user = userEvent.setup();
    expect(bar().hidden).toBe(true);
    await user.click(box(0));
    expect(bar().hidden).toBe(false);
    expect(bar().querySelector('[data-eds-bulk-count]')?.textContent).toBe('1 selecionado');
    await user.click(box(1));
    expect(bar().querySelector('[data-eds-bulk-count]')?.textContent).toBe('2 selecionados');
    await user.click(bar().querySelector('[data-eds-bulk-clear]') as HTMLElement);
    expect(bar().hidden).toBe(true);
    expect(box(0).checked).toBe(false);
  });

  it('a ação emite ids e linhas, e é cancelável', async () => {
    const user = userEvent.setup();
    const detail = vi.fn();
    T().addEventListener('eds:table-bulk-action', (e) => detail((e as CustomEvent).detail));
    await user.click(box(0));
    await user.click(box(2));
    await user.click(bar().querySelector('[data-eds-bulk-action]') as HTMLElement);
    expect(detail.mock.calls[0]?.[0]).toMatchObject({
      action: 'arquivar',
      ids: ['1', '3'],
      count: 2,
      scope: 'page',
    });
  });

  it('"selecionar todos os N" só em tabela remota com o cabeçalho marcado', async () => {
    const user = userEvent.setup();
    await user.click(T().querySelector('[data-eds-select-all]') as HTMLElement);
    const all = bar().querySelector('[data-eds-bulk-all-results]') as HTMLElement;
    expect(all.hidden).toBe(true); // tabela local
    T().setAttribute('data-eds-table-remote', 'event');
    stop();
    start();
    await user.click(T().querySelector('[data-eds-select-all]') as HTMLElement);
    await user.click(T().querySelector('[data-eds-select-all]') as HTMLElement);
    expect(all.hidden).toBe(false);
    expect(all.textContent).toContain('248');
    const seen = vi.fn();
    T().addEventListener('eds:table-select-all-results', (e) => seen((e as CustomEvent).detail));
    await user.click(all);
    expect(seen).toHaveBeenCalledWith({ total: 248 });
    expect(bar().querySelector('[data-eds-bulk-count]')?.textContent).toBe(
      'Todos os 248 selecionados.',
    );
    expect(tableController(T())?.getState().selection.scope).toBe('all');
    // Qualquer mudança de linha volta para a página.
    await user.click(box(1));
    expect(tableController(T())?.getState().selection.scope).toBe('page');
  });

  it('o foco do botão que some vai para o "selecionar todos"', async () => {
    const user = userEvent.setup();
    await user.click(box(0));
    (bar().querySelector('[data-eds-bulk-clear]') as HTMLElement).focus();
    await user.keyboard('{Enter}');
    expect(document.activeElement).toBe(T().querySelector('[data-eds-select-all]'));
  });
});

describe('tabela remota', () => {
  beforeEach(() => {
    build('data-eds-table-remote="event" data-eds-total="248" data-eds-size="25"');
    start();
  });

  it('ordenar não ordena localmente: emite eds:table-query e carrega com respondWith', async () => {
    const user = userEvent.setup();
    const before = names();
    const detail = vi.fn();
    let release = () => undefined as void;
    T().addEventListener('eds:table-query', (e) => {
      const d = (e as CustomEvent).detail;
      detail({ reason: d.reason, query: d.params.toString() });
      d.respondWith(
        new Promise((resolve) => {
          release = () => resolve({ total: 100 });
        }),
      );
    });
    await user.click(sortButton('total'));
    expect(names()).toEqual(before);
    expect(detail).toHaveBeenCalledWith({ reason: 'sort', query: 'size=25&sort=total' });
    expect(T().getAttribute('aria-busy')).toBe('true');
    expect(T().hasAttribute('inert')).toBe(true);
    release();
    await vi.waitFor(() => expect(T().hasAttribute('aria-busy')).toBe(false));
    expect(T().getAttribute('data-eds-total')).toBe('100');
    expect(status()).toBe('100 resultados. Página 1 de 4.');
  });

  it('erro mantém os dados, marca data-eds-error e anuncia', async () => {
    const user = userEvent.setup();
    const errors = vi.fn();
    T().addEventListener('eds:table-error', (e) => errors((e as CustomEvent).detail.error));
    T().addEventListener('eds:table-query', (e) =>
      (e as CustomEvent).detail.respondWith(Promise.reject(new Error('falhou'))),
    );
    const before = names();
    await user.click(sortButton('total'));
    await vi.waitFor(() => expect(T().hasAttribute('data-eds-error')).toBe(true));
    expect(names()).toEqual(before);
    expect(T().hasAttribute('aria-busy')).toBe(false);
    expect(status()).toContain('Os dados anteriores foram mantidos');
    expect(errors).toHaveBeenCalled();
  });

  it('só a última consulta vale (corrida de respostas)', async () => {
    const user = userEvent.setup();
    const resolvers: ((v: { total: number }) => void)[] = [];
    T().addEventListener('eds:table-query', (e) =>
      (e as CustomEvent).detail.respondWith(
        new Promise((resolve) => resolvers.push(resolve as (v: { total: number }) => void)),
      ),
    );
    await user.click(sortButton('total'));
    await user.click(sortButton('cliente'));
    resolvers[1]?.({ total: 7 });
    await vi.waitFor(() => expect(T().getAttribute('data-eds-total')).toBe('7'));
    resolvers[0]?.({ total: 999 });
    await Promise.resolve();
    expect(T().getAttribute('data-eds-total')).toBe('7');
  });

  it('cancelar o evento deixa a consulta com o app; setState reflete o estado', async () => {
    const user = userEvent.setup();
    T().addEventListener('eds:table-query', (e) => e.preventDefault());
    await user.click(sortButton('total'));
    expect(T().hasAttribute('aria-busy')).toBe(false);
    tableController(T())?.setState({ sort: [{ key: 'total', direction: 'descending' }] });
    expect(th('total').getAttribute('aria-sort')).toBe('descending');
  });

  it('filtro por coluna e busca viram consulta (página volta a 1)', async () => {
    const user = userEvent.setup();
    const reasons: string[] = [];
    T().addEventListener('eds:table-query', (e) => {
      const d = (e as CustomEvent).detail;
      reasons.push(`${d.reason}:${d.params.toString()}`);
      e.preventDefault();
    });
    tableController(T())?.setState({ page: 3 });
    await user.type(th('cliente').querySelector('form input') as HTMLInputElement, 'ana{Enter}');
    expect(reasons[0]).toBe('filter:size=25&filter%5Bcliente%5D=ana');
    await user.type(document.getElementById('busca') as HTMLInputElement, 'x');
    await vi.waitFor(() => expect(reasons.some((r) => r.startsWith('q:'))).toBe(true), {
      timeout: 1500,
    });
  });

  it('paginação por link emite a página e não navega', async () => {
    const user = userEvent.setup();
    document.body.insertAdjacentHTML(
      'beforeend',
      '<nav data-eds-table-pagination="t"><a href="?page=2" data-eds-page="2">2</a></nav>',
    );
    stop();
    start();
    const seen = vi.fn();
    T().addEventListener('eds:table-query', (e) => {
      seen((e as CustomEvent).detail.query.page);
      e.preventDefault();
    });
    await user.click(document.querySelector('nav a') as HTMLElement);
    expect(seen).toHaveBeenCalledWith(2);
  });
});

describe('nome do botão de filtro', () => {
  it('"filtro ativo" aparece uma só vez, mesmo com o filtro já ativo no markup', async () => {
    build();
    const button = document.querySelector(
      'th[data-eds-col="total"] .eds-table-filter-btn',
    ) as HTMLElement;
    button.setAttribute('data-active', '');
    button.insertAdjacentHTML(
      'beforeend',
      '<span class="eds-visually-hidden">, filtro ativo</span>',
    );
    (document.getElementById('min') as HTMLInputElement).value = '60';
    start();
    expect(button.getAttribute('aria-label')).toBe('Filtrar total, filtro ativo');
    expect(button.querySelectorAll('.eds-visually-hidden')).toHaveLength(0);
    const user = userEvent.setup();
    await user.click(
      document.querySelector('th[data-eds-col="total"] [data-eds-filter-clear]') as HTMLElement,
    );
    expect(button.getAttribute('aria-label')).toBe('Filtrar total');
    expect(button.hasAttribute('data-active')).toBe(false);
  });
});
