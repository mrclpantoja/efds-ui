import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { init } from '../index';
import { initTable } from './table';
import { initTableFilter } from './table-filter';

const html = `
<div class="eds-table-toolbar">
  <input type="search" class="eds-input" id="busca" data-eds-table-filter="tabela" aria-controls="tabela" aria-label="Buscar pedido" />
</div>
<div class="eds-table-wrap">
  <table class="eds-table" id="tabela">
    <caption class="eds-table-caption eds-visually-hidden">Pedidos</caption>
    <thead>
      <tr>
        <th scope="col"><input type="checkbox" id="todos" data-eds-select-all aria-label="Selecionar todos" /></th>
        <th scope="col" aria-sort="none"><button type="button" class="eds-table-sort">Cliente</button></th>
        <th scope="col">Cidade</th>
        <th scope="col">Ações</th>
      </tr>
    </thead>
    <tbody>
      <tr id="r1"><td><input type="checkbox" data-eds-select-row aria-label="Selecionar 1" /></td><td>Clínica Fictícia</td><td>Pelotas</td><td data-eds-filter-ignore>Editar</td></tr>
      <tr id="r2"><td><input type="checkbox" data-eds-select-row aria-label="Selecionar 2" /></td><td>Atelier Exemplo</td><td>São Paulo</td><td data-eds-filter-ignore>Editar</td></tr>
      <tr id="r3"><td><input type="checkbox" data-eds-select-row aria-label="Selecionar 3" /></td><td>Comércio Teste</td><td>Clínica Norte</td><td data-eds-filter-ignore>Editar</td></tr>
    </tbody>
  </table>
</div>`;

const input = () => document.getElementById('busca') as HTMLInputElement;
const visible = () =>
  Array.from(document.querySelectorAll<HTMLElement>('tbody tr'))
    .filter((r) => !r.hidden && !r.hasAttribute('data-eds-filter-empty'))
    .map((r) => r.id);
const status = () => input().nextElementSibling as HTMLElement;
const box = (n: number) =>
  document.querySelectorAll<HTMLInputElement>('[data-eds-select-row]')[n] as HTMLInputElement;

describe('filtro da table', () => {
  let destroy: Array<() => void>;
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = html;
    destroy = [initTable(document), initTableFilter(document)];
  });
  afterEach(() => {
    for (const d of destroy) d();
    document.body.innerHTML = '';
    vi.useRealTimers();
  });

  const type = async (text: string) => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(input());
    await user.type(input(), text);
    await vi.advanceTimersByTimeAsync(200);
    return user;
  };

  it('filtra sem acento e sem caixa em todas as células', async () => {
    await type('CLINICA');
    expect(visible()).toEqual(['r1', 'r3']);
    expect(status()).toHaveTextContent('2 resultados.');
  });

  it('ignora células data-eds-filter-ignore', async () => {
    await type('editar');
    expect(visible()).toEqual([]);
  });

  it('data-eds-filter-columns restringe as colunas (base 1)', async () => {
    input().setAttribute('data-eds-filter-columns', '2');
    await type('clin');
    expect(visible()).toEqual(['r1']);
    expect(status()).toHaveTextContent('1 resultado.');
  });

  it('não anuncia a cada tecla: só depois do debounce, e emite eds:table-filter', async () => {
    const handler = vi.fn();
    input().addEventListener('eds:table-filter', handler);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(input());
    await user.type(input(), 'cli');
    expect(status()).toBeEmptyDOMElement();
    expect(handler).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(200);
    expect(handler).toHaveBeenCalledTimes(1);
    expect((handler.mock.calls[0]?.[0] as CustomEvent).detail).toEqual({ query: 'cli', count: 2 });
  });

  it('sem resultado: linha de vazio criada com colspan, texto e status', async () => {
    await type('zzz');
    expect(visible()).toEqual([]);
    const empty = document.querySelector<HTMLElement>('tr[data-eds-filter-empty]');
    expect(empty).not.toBeNull();
    expect(empty?.hidden).toBe(false);
    expect(empty?.querySelector('td')).toHaveAttribute('colspan', '4');
    expect(empty).toHaveTextContent('Nenhum resultado para "zzz".');
    expect(status()).toHaveTextContent('Nenhum resultado.');
    // Voltando a casar, a linha de vazio some.
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.clear(input());
    await vi.advanceTimersByTimeAsync(200);
    expect(empty?.hidden).toBe(true);
    expect(visible()).toEqual(['r1', 'r2', 'r3']);
  });

  it('usa a linha de Empty State do próprio markup', async () => {
    document
      .querySelector('tbody')
      ?.insertAdjacentHTML(
        'beforeend',
        '<tr id="vazio" hidden><td colspan="4" class="eds-table-empty"><div class="eds-empty">Nada</div></td></tr>',
      );
    await type('zzz');
    expect(document.getElementById('vazio')?.hidden).toBe(false);
    expect(document.querySelector('tr[data-eds-filter-empty]')).toBeNull();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.clear(input());
    await vi.advanceTimersByTimeAsync(200);
    expect(document.getElementById('vazio')?.hidden).toBe(true);
  });

  it('Esc limpa, reaplica e anuncia "Filtro removido"', async () => {
    const user = await type('clin');
    expect(visible()).toEqual(['r1', 'r3']);
    await user.keyboard('{Escape}');
    expect(input().value).toBe('');
    expect(visible()).toEqual(['r1', 'r2', 'r3']);
    expect(status()).toHaveTextContent('Filtro removido. 3 linhas.');
  });

  it('ordenação mantém o filtro', async () => {
    const user = await type('clin');
    await user.click(document.querySelector('.eds-table-sort') as HTMLElement);
    await vi.advanceTimersByTimeAsync(10);
    expect(visible()).toEqual(['r1', 'r3']);
    expect(document.getElementById('r2')?.hidden).toBe(true);
  });

  it('selecionar todos e a contagem consideram só as visíveis', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(box(1)); // r2 será ocultada, continua marcada
    await user.click(input());
    await user.type(input(), 'clin');
    await vi.advanceTimersByTimeAsync(200);
    const todos = document.getElementById('todos') as HTMLInputElement;
    expect(todos.checked).toBe(false);
    expect(todos.indeterminate).toBe(false);
    const handler = vi.fn();
    document.getElementById('tabela')?.addEventListener('eds:table-select-change', handler);
    await user.click(todos);
    expect(box(0).checked && box(2).checked).toBe(true);
    expect(box(1).checked).toBe(true);
    const detail = (handler.mock.calls[0]?.[0] as CustomEvent).detail as {
      count: number;
      total: number;
    };
    expect(detail.count).toBe(2);
    expect(detail.total).toBe(3);
    expect(todos.checked).toBe(true);
    // Limpar o filtro: todas marcadas continuam, cabeçalho reflete as 3 visíveis.
    await user.clear(input());
    await vi.advanceTimersByTimeAsync(200);
    expect(todos.checked).toBe(true);
    // Desmarcar todos (3 visíveis) limpa tudo.
    await user.click(todos);
    expect([0, 1, 2].every((i) => !box(i).checked)).toBe(true);
  });

  it('seleção oculta pelo filtro: o status diz as da busca e o total; ao limpar, diz os selecionados', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const tableStatus = () =>
      document.querySelector('.eds-table-wrap + [role="status"]') as HTMLElement;
    await user.click(box(1));
    await user.click(box(2));
    expect(tableStatus()).toHaveTextContent('2 itens selecionados.');
    await user.click(input());
    await user.type(input(), 'clin'); // sobram r1 e r3; r2 (marcada) fica oculta
    await vi.advanceTimersByTimeAsync(200);
    await user.click(box(0));
    expect(tableStatus().textContent).toBe('2 itens selecionados nesta busca, 3 no total.');
    await user.click(box(0));
    expect(tableStatus().textContent).toBe('1 item selecionado nesta busca, 2 no total.');
    await user.click(box(2));
    expect(tableStatus().textContent).toBe('Nenhum item selecionado nesta busca, 1 no total.');
    await user.click(box(2));
    await user.clear(input());
    await vi.advanceTimersByTimeAsync(200);
    expect(status()).toHaveTextContent('Filtro removido. 3 linhas. 2 selecionados.');
    await user.click(box(2));
    expect(tableStatus().textContent).toBe('1 item selecionado.');
  });

  it('limpar o filtro sem seleção não acrescenta nada', async () => {
    await type('clin');
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.clear(input());
    await vi.advanceTimersByTimeAsync(200);
    expect(status().textContent).toBe('Filtro removido. 3 linhas.');
  });

  it('linhas acrescentadas depois passam pelo filtro', async () => {
    await type('clin');
    document
      .querySelector('tbody')
      ?.insertAdjacentHTML(
        'beforeend',
        '<tr id="r4"><td></td><td>Outra Empresa</td><td>Rio</td><td></td></tr><tr id="r5"><td></td><td>CLÍNICA Nova</td><td>Rio</td><td></td></tr>',
      );
    await vi.advanceTimersByTimeAsync(10);
    expect(visible()).toEqual(['r1', 'r3', 'r5']);
  });

  it('destroy remove a região, a linha criada e reexibe as linhas', async () => {
    await type('zzz');
    for (const d of destroy) d();
    expect(document.querySelector('tr[data-eds-filter-empty]')).toBeNull();
    expect(document.querySelectorAll('tbody tr[hidden]')).toHaveLength(0);
    expect(input().nextElementSibling).toBeNull();
  });

  it('init() liga o filtro junto com os demais', async () => {
    for (const d of destroy) d();
    const stop = init(document, { loader: { mode: 'off' } });
    destroy = [stop];
    await type('atelier');
    expect(visible()).toEqual(['r2']);
  });
});
