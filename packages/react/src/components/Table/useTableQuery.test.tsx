import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useTableQuery } from './useTableQuery';

afterEach(() => window.history.replaceState(null, '', '/'));

describe('useTableQuery', () => {
  it('muda ordenação, filtro, busca e tamanho voltando à página 1', () => {
    const { result } = renderHook(() => useTableQuery({ initial: { size: 25 } }));
    act(() => result.current.setPage(3));
    expect(result.current.query.page).toBe(3);
    act(() =>
      result.current.setSort([
        { key: 'cliente', direction: 'ascending' },
        { key: 'total', direction: 'descending' },
      ]),
    );
    expect(result.current.query.page).toBe(1);
    act(() => result.current.setFilter('situacao', ['pago', 'pendente']));
    act(() => result.current.setFilter('total', { gte: '100', lte: '500' }));
    act(() => result.current.setQ('ana'));
    expect(result.current.searchParams.toString()).toBe(
      'size=25&sort=cliente%2C-total&q=ana&filter%5Bsituacao%5D=pago&filter%5Bsituacao%5D=pendente&filter%5Btotal%5D%5Bgte%5D=100&filter%5Btotal%5D%5Blte%5D=500',
    );
    act(() => result.current.setFilter('situacao', null));
    expect(Object.keys(result.current.query.filters)).toEqual(['total']);
    expect(result.current.sortState).toEqual([
      { column: 'cliente', direction: 'ascending' },
      { column: 'total', direction: 'descending' },
    ]);
    act(() => result.current.clearFilters());
    expect(result.current.query.filters).toEqual({});
    act(() => result.current.setSize(50));
    expect(result.current.query.size).toBe(50);
    act(() => result.current.reset());
    expect(result.current.query).toMatchObject({ page: 1, size: 25, sort: [], q: '' });
  });

  it('syncUrl: lê a URL ao montar e a mantém (replaceState; pushState na página)', () => {
    window.history.replaceState(null, '', '/pedidos?sort=-total&filter[situacao]=pago');
    const { result } = renderHook(() => useTableQuery({ syncUrl: 'search' }));
    expect(result.current.query.page).toBe(1);
    expect(result.current.query.sort).toEqual([{ key: 'total', direction: 'descending' }]);
    expect(result.current.query.filters).toEqual({ situacao: 'pago' });
    const length = window.history.length;
    act(() => result.current.setQ('ana'));
    expect(decodeURIComponent(window.location.search)).toBe(
      '?sort=-total&q=ana&filter[situacao]=pago',
    );
    expect(window.history.length).toBe(length);
    act(() => result.current.setPage(4));
    expect(window.location.search).toContain('page=4');
    expect(window.history.length).toBe(length + 1);
  });
});
