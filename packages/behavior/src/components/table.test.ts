import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetLocale, setLocale } from '../core/config';
import { initTable, parseDate, parseNumber, sortRows } from './table';

const html = `
<div class="eds-table-wrap">
  <table class="eds-table" id="tabela">
    <caption class="eds-table-caption eds-visually-hidden">Pedidos</caption>
    <thead>
      <tr>
        <th scope="col" class="eds-table-check"><input type="checkbox" id="todos" data-eds-select-all aria-label="Selecionar todos desta página" /></th>
        <th scope="col" id="th-cliente" aria-sort="none"><button type="button" class="eds-table-sort">Cliente</button></th>
        <th scope="col" id="th-total" class="eds-table-num" aria-sort="none"><button type="button" class="eds-table-sort">Total</button></th>
        <th scope="col" id="th-data" aria-sort="none"><button type="button" class="eds-table-sort">Data</button></th>
      </tr>
    </thead>
    <tbody>
      <tr id="r1"><td><input type="checkbox" data-eds-select-row aria-label="Selecionar PED-0001" /></td><td>Óleo Modelo</td><td class="eds-table-num">R$ 1.280,50</td><td>15/03/2025</td></tr>
      <tr id="r2"><td><input type="checkbox" data-eds-select-row aria-label="Selecionar PED-0002" /></td><td>Atelier Exemplo</td><td class="eds-table-num">R$ 459,00</td><td>02/01/2025</td></tr>
      <tr id="r3"><td><input type="checkbox" data-eds-select-row aria-label="Selecionar PED-0003" /></td><td>Comércio Teste</td><td class="eds-table-num">R$ 8.920,90</td><td>20/11/2024</td></tr>
    </tbody>
  </table>
</div>
<div role="status" class="eds-visually-hidden" id="status"></div>`;

const order = () => Array.from(document.querySelectorAll('tbody tr')).map((r) => r.id);
const byId = (id: string) => document.getElementById(id) as HTMLElement;
const box = (n: number) =>
  document.querySelectorAll<HTMLInputElement>('[data-eds-select-row]')[n] as HTMLInputElement;

describe('parse e sortRows', () => {
  it('reconhece números pt-BR, simples e datas', () => {
    expect(parseNumber('R$ 1.280,50')).toBe(1280.5);
    expect(parseNumber('459,00')).toBe(459);
    expect(parseNumber('-3.5')).toBe(-3.5);
    expect(parseNumber('abc')).toBeNull();
    expect(parseDate('02/01/2025')).toBe(new Date(2025, 0, 2).getTime());
    expect(parseDate('2025-01-02')).toBe(new Date(2025, 0, 2).getTime());
    expect(parseDate('amanhã')).toBeNull();
  });

  it('ordena texto sem diferenciar acento/caixa e deixa vazios por último', () => {
    document.body.innerHTML = `<table><tbody>
      <tr id="a"><td>zeta</td></tr><tr id="b"><td></td></tr><tr id="c"><td>Álamo</td></tr></tbody></table>`;
    const rows = Array.from(document.querySelectorAll('tr'));
    expect(sortRows(rows, 0, 'ascending').map((r) => r.id)).toEqual(['c', 'a', 'b']);
    expect(sortRows(rows, 0, 'descending').map((r) => r.id)).toEqual(['a', 'c', 'b']);
  });

  it('data-sort-value tem prioridade sobre o texto', () => {
    document.body.innerHTML = `<table><tbody>
      <tr id="a"><td data-sort-value="2">dois</td></tr><tr id="b"><td data-sort-value="10">dez</td></tr></tbody></table>`;
    const rows = Array.from(document.querySelectorAll('tr'));
    expect(sortRows(rows, 0, 'ascending').map((r) => r.id)).toEqual(['a', 'b']);
  });
});

describe('table', () => {
  let destroy: () => void;
  beforeEach(() => {
    document.body.innerHTML = html;
    destroy = initTable(document);
  });
  afterEach(() => {
    destroy();
    document.body.innerHTML = '';
  });

  it('ordena por texto, atualiza aria-sort e anuncia no status', async () => {
    const user = userEvent.setup();
    await user.click(byId('th-cliente').querySelector('button') as HTMLElement);
    expect(order()).toEqual(['r2', 'r3', 'r1']);
    expect(byId('th-cliente')).toHaveAttribute('aria-sort', 'ascending');
    expect(byId('th-total')).toHaveAttribute('aria-sort', 'none');
    expect(byId('status')).toHaveTextContent('Ordenado por Cliente, crescente.');
    await user.click(byId('th-cliente').querySelector('button') as HTMLElement);
    expect(order()).toEqual(['r1', 'r3', 'r2']);
    expect(byId('th-cliente')).toHaveAttribute('aria-sort', 'descending');
    expect(byId('status')).toHaveTextContent('Ordenado por Cliente, decrescente.');
  });

  it('ordena números e datas', async () => {
    const user = userEvent.setup();
    await user.click(byId('th-total').querySelector('button') as HTMLElement);
    expect(order()).toEqual(['r2', 'r1', 'r3']);
    await user.click(byId('th-data').querySelector('button') as HTMLElement);
    expect(order()).toEqual(['r3', 'r2', 'r1']);
    expect(byId('th-total')).toHaveAttribute('aria-sort', 'none');
  });

  it('eds:table-sort cancelável deixa a ordenação para o consumidor', async () => {
    const user = userEvent.setup();
    const handler = vi.fn((e: Event) => e.preventDefault());
    document.addEventListener('eds:table-sort', handler);
    await user.click(byId('th-cliente').querySelector('button') as HTMLElement);
    expect(handler).toHaveBeenCalledTimes(1);
    expect((handler.mock.calls[0]?.[0] as CustomEvent).detail).toMatchObject({
      column: 1,
      label: 'Cliente',
      direction: 'ascending',
    });
    expect(order()).toEqual(['r1', 'r2', 'r3']);
    expect(byId('status')).toBeEmptyDOMElement();
    document.removeEventListener('eds:table-sort', handler);
  });

  it('seleção: indeterminate, selecionar todos e anúncio com plural', async () => {
    const user = userEvent.setup();
    const todos = byId('todos') as HTMLInputElement;
    await user.click(box(0));
    expect(todos.indeterminate).toBe(true);
    expect(todos.checked).toBe(false);
    expect(byId('status')).toHaveTextContent('1 item selecionado.');
    await user.click(todos);
    expect(box(1).checked && box(2).checked).toBe(true);
    expect(todos.indeterminate).toBe(false);
    expect(byId('status')).toHaveTextContent('3 itens selecionados.');
    await user.click(todos);
    expect(box(0).checked).toBe(false);
    expect(byId('status')).toHaveTextContent('Nenhum item selecionado.');
  });

  it('seleção dispara eds:table-select-change e ignora linhas desabilitadas', async () => {
    const user = userEvent.setup();
    box(2).disabled = true;
    const handler = vi.fn();
    document.addEventListener('eds:table-select-change', handler);
    await user.click(byId('todos'));
    expect(box(2).checked).toBe(false);
    expect((handler.mock.calls[0]?.[0] as CustomEvent).detail.count).toBe(2);
    expect((byId('todos') as HTMLInputElement).checked).toBe(true);
    document.removeEventListener('eds:table-select-change', handler);
  });

  it('cria a região de status quando não existe', () => {
    destroy();
    document.body.innerHTML = html.replace(
      '<div role="status" class="eds-visually-hidden" id="status"></div>',
      '',
    );
    destroy = initTable(document);
    const status = document.querySelector('[role="status"]');
    expect(status).not.toBeNull();
    expect(status).toBeEmptyDOMElement();
  });

  it('wrap vira região rolável só quando rola', () => {
    const callbacks: (() => void)[] = [];
    class FakeRO {
      constructor(cb: () => void) {
        callbacks.push(cb);
      }
      observe() {}
      disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', FakeRO);
    destroy();
    document.body.innerHTML = html;
    destroy = initTable(document);
    const wrap = document.querySelector('.eds-table-wrap') as HTMLElement;
    expect(wrap).not.toHaveAttribute('role');
    Object.defineProperty(wrap, 'scrollWidth', { value: 900, configurable: true });
    Object.defineProperty(wrap, 'clientWidth', { value: 300, configurable: true });
    callbacks.forEach((cb) => cb());
    expect(wrap).toHaveAttribute('role', 'region');
    expect(wrap).toHaveAttribute('tabindex', '0');
    const captionId = document.querySelector('caption')?.id;
    expect(captionId).toBeTruthy();
    expect(wrap).toHaveAttribute('aria-labelledby', captionId);
    vi.unstubAllGlobals();
  });
});

describe('locale da ordenação', () => {
  afterEach(() => resetLocale());

  it('usa o collator do locale configurado', () => {
    document.body.innerHTML = `<table><tbody>
      <tr id="a"><td>z</td></tr><tr id="b"><td>ä</td></tr><tr id="c"><td>a</td></tr></tbody></table>`;
    const rows = Array.from(document.querySelectorAll('tr'));
    setLocale('sv-SE');
    // No sueco, "ä" vem depois do "z".
    expect(sortRows(rows, 0, 'ascending').map((r) => r.id)).toEqual(['c', 'a', 'b']);
    setLocale('de-DE');
    expect(sortRows(rows, 0, 'ascending').map((r) => r.id)).toEqual(['b', 'c', 'a']);
  });
});
