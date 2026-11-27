import { describe, expect, it } from 'vitest';
import { matchColumnFilter, sortByCriteria, sortValues, type SortCriterion } from './data';
import { applyQueryToUrl, parseTableQuery, toTableSearchParams } from './table-query';

interface Row {
  cliente: string;
  total: string;
  data: string;
}

const rows: Row[] = [
  { cliente: 'Beta', total: 'R$ 100,00', data: '10/01/2026' },
  { cliente: 'Álamo', total: 'R$ 300,00', data: '05/03/2026' },
  { cliente: 'Beta', total: 'R$ 50,00', data: '01/02/2026' },
  { cliente: '', total: '', data: '' },
  { cliente: 'Alfa', total: 'R$ 300,00', data: '20/12/2025' },
];
const get = (row: Row, key: string) => row[key as keyof Row];

describe('sortByCriteria', () => {
  it('desempata no segundo critério e deixa vazios por último em cada um', () => {
    const sort: SortCriterion[] = [
      { key: 'cliente', direction: 'ascending' },
      { key: 'total', direction: 'descending' },
    ];
    const out = sortByCriteria(rows, sort, get).map((r) => `${r.cliente}|${r.total}`);
    expect(out).toEqual([
      'Álamo|R$ 300,00',
      'Alfa|R$ 300,00',
      'Beta|R$ 100,00',
      'Beta|R$ 50,00',
      '|',
    ]);
  });

  it('detecta número (não texto) e data por coluna', () => {
    const byTotal = sortByCriteria(rows, [{ key: 'total', direction: 'ascending' }], get);
    expect(byTotal.map((r) => r.total)).toEqual([
      'R$ 50,00',
      'R$ 100,00',
      'R$ 300,00',
      'R$ 300,00',
      '',
    ]);
    const byDate = sortByCriteria(rows, [{ key: 'data', direction: 'descending' }], get);
    expect(byDate.map((r) => r.data)).toEqual([
      '05/03/2026',
      '01/02/2026',
      '10/01/2026',
      '20/12/2025',
      '',
    ]);
  });

  it('é estável e não altera o original; sem critérios devolve cópia', () => {
    const copy = [...rows];
    expect(sortByCriteria(rows, [], get)).toEqual(copy);
    expect(sortByCriteria(rows, [], get)).not.toBe(rows);
    sortByCriteria(rows, [{ key: 'cliente', direction: 'ascending' }], get);
    expect(rows).toEqual(copy);
  });

  it('sortValues continua igual (um critério)', () => {
    expect(sortValues(['b', 'a', '', 'c'], (v) => v, 'descending')).toEqual(['c', 'b', 'a', '']);
  });
});

describe('matchColumnFilter', () => {
  it('texto: contém, sem acento e caixa', () => {
    expect(matchColumnFilter('Álamo Ltda', 'alamo')).toBe(true);
    expect(matchColumnFilter('Beta', 'alamo')).toBe(false);
  });
  it('seleção: igual a algum item', () => {
    expect(matchColumnFilter('Pago', ['pago', 'pendente'])).toBe(true);
    expect(matchColumnFilter('Não pago', ['pago'])).toBe(false);
  });
  it('faixa numérica (pt-BR) e de datas, com o dia final inclusivo', () => {
    expect(matchColumnFilter('R$ 300,00', { gte: '100', lte: '500' })).toBe(true);
    expect(matchColumnFilter('R$ 50,00', { gte: '100' })).toBe(false);
    expect(matchColumnFilter('', { gte: '1' })).toBe(false);
    expect(matchColumnFilter('2026-01-31', { gte: '2026-01-01', lte: '2026-01-31' })).toBe(true);
    expect(matchColumnFilter('02/02/2026', { lte: '2026-01-31' })).toBe(false);
  });
  it('filtro vazio passa tudo', () => {
    expect(matchColumnFilter('x', '')).toBe(true);
    expect(matchColumnFilter('x', [])).toBe(true);
    expect(matchColumnFilter('x', {})).toBe(true);
  });
});

describe('parseTableQuery / toTableSearchParams', () => {
  it('lê página, tamanho, ordenação, busca e filtros', () => {
    const q = parseTableQuery(
      '?page=2&size=25&sort=cliente,-total&q=ana&filter[situacao]=pago&filter[situacao]=pendente&filter[total][gte]=100&filter[total][lte]=500&filter[nome]=ana',
    );
    expect(q.page).toBe(2);
    expect(q.size).toBe(25);
    expect(q.q).toBe('ana');
    expect(q.sort).toEqual([
      { key: 'cliente', direction: 'ascending' },
      { key: 'total', direction: 'descending' },
    ]);
    expect(q.filters.situacao).toEqual(['pago', 'pendente']);
    expect(q.filters.total).toEqual({ gte: '100', lte: '500' });
    expect(q.filters.nome).toBe('ana');
  });

  it('ida e volta mantém a consulta; omite page 1, vazios e filtros vazios', () => {
    const q = parseTableQuery('page=3&sort=-total&filter[a][gte]=1&filter[b]=x&filter[b]=y&q=%20z');
    const text = toTableSearchParams(q).toString();
    expect(parseTableQuery(text)).toEqual(q);
    const empty = toTableSearchParams({ page: 1, size: 0, sort: [], filters: { a: '' }, q: '' });
    expect(empty.toString()).toBe('');
  });

  it('valores inválidos viram os padrões e os nomes são configuráveis', () => {
    expect(parseTableQuery('page=abc&size=-1').page).toBe(1);
    const q = parseTableQuery('p=4&limit=50&ordem=-a', { page: 'p', size: 'limit', sort: 'ordem' });
    expect(q).toMatchObject({ page: 4, size: 50, sort: [{ key: 'a', direction: 'descending' }] });
    expect(toTableSearchParams(q, { page: 'p', size: 'limit', sort: 'ordem' }).toString()).toBe(
      'p=4&limit=50&ordem=-a',
    );
  });

  it('applyQueryToUrl troca só a consulta e mantém outros parâmetros e o hash', () => {
    const url = applyQueryToUrl(
      'https://exemplo.test/pedidos?tab=2&page=5&sort=x',
      { page: 1, size: 10, sort: [{ key: 'a', direction: 'ascending' }], filters: {}, q: '' },
      {},
      'tabela',
    );
    expect(url).toBe('https://exemplo.test/pedidos?tab=2&size=10&sort=a#tabela');
  });
});
