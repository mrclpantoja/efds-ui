import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { exportData } from '../export';
import { readZip } from '../test-utils/zip';
import { toXlsx } from '../export/xlsx';
import { collectTable, initTableExport } from './table-export';
import { initTableFilter } from './table-filter';
import { initTable } from './table';

const html = `
<div class="eds-dropdown-wrap">
  <button type="button" popovertarget="menu">Exportar</button>
  <div id="menu" class="eds-dropdown" popover>
    <button type="button" data-eds-export="csv" data-eds-export-target="pedidos">CSV</button>
    <button type="button" data-eds-export="xlsx" data-eds-export-target="pedidos" data-eds-export-filename="pedidos">Excel</button>
    <button type="button" data-eds-export="json" data-eds-export-target="pedidos" data-eds-export-scope="all">JSON</button>
    <button type="button" data-eds-export="pdf" data-eds-export-target="pedidos" data-eds-export-title="Relatório de pedidos" data-eds-export-subtitle="Mês 11">PDF</button>
    <button type="button" data-eds-export="csv" data-eds-export-target="pedidos" data-eds-export-scope="selected" id="so-sel">Só marcadas</button>
    <button type="button" data-eds-export="csv" data-eds-export-target="pedidos" data-eds-export-scope="visible" id="so-vis">Só visíveis</button>
  </div>
</div>
<input type="search" id="busca" data-eds-table-filter="pedidos" aria-label="Buscar" />
<div class="eds-table-wrap">
  <table class="eds-table" id="pedidos">
    <caption>Pedidos de Novembro</caption>
    <thead>
      <tr>
        <th scope="col" class="eds-table-check"><input type="checkbox" data-eds-select-all aria-label="Todos" /></th>
        <th scope="col">Cliente</th>
        <th scope="col" data-type="currency" class="eds-table-num">Total</th>
        <th scope="col" data-type="date">Data</th>
        <th scope="col" data-eds-export-ignore>CPF</th>
        <th scope="col" class="eds-table-actions"><span class="eds-visually-hidden">Ações</span></th>
      </tr>
    </thead>
    <tbody>
      <tr id="r1"><td><input type="checkbox" data-eds-select-row aria-label="1" /></td><td>Óleo Modelo</td><td data-value="1280.5">R$ 1.280,50</td><td data-value="2026-03-15">15/03/2026</td><td>000.000.000-00</td><td><button>Ver</button></td></tr>
      <tr id="r2"><td><input type="checkbox" data-eds-select-row aria-label="2" /></td><td>Atelier Exemplo</td><td data-value="459">R$ 459,00</td><td data-value="2026-01-02">02/01/2026</td><td>000.000.000-01</td><td><button>Ver</button></td></tr>
      <tr id="r3"><td><input type="checkbox" data-eds-select-row aria-label="3" /></td><td>Comércio Teste</td><td>R$ 8.920,90</td><td>20/11/2025</td><td data-eds-export-ignore>x</td><td><button>Ver</button></td></tr>
    </tbody>
  </table>
</div>`;

interface Download {
  name: string;
  type: string;
  blob: Blob;
}
let downloads: Download[] = [];
let revoked: string[] = [];
let stop: (() => void)[] = [];
const listen = (type: string, fn: EventListener) => {
  document.addEventListener(type, fn);
  stop.push(() => document.removeEventListener(type, fn));
};

const read = (blob: Blob): Promise<string> =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.readAsText(blob);
  });

const bytes = (blob: Blob): Promise<Uint8Array> =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.readAsArrayBuffer(blob);
  });

const button = (label: string) =>
  Array.from(document.querySelectorAll<HTMLButtonElement>('#menu button')).find(
    (b) => b.textContent === label,
  ) as HTMLButtonElement;

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date(2026, 10, 20, 14, 30));
  downloads = [];
  revoked = [];
  let n = 0;
  const blobs = new Map<string, Blob>();
  URL.createObjectURL = vi.fn((blob: Blob) => {
    n += 1;
    const url = `blob:eds-${n}`;
    blobs.set(url, blob);
    return url;
  });
  URL.revokeObjectURL = vi.fn((url: string) => {
    revoked.push(url);
  });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    const blob = blobs.get(this.href);
    if (blob) downloads.push({ name: this.download, type: blob.type, blob });
  });
  document.body.innerHTML = html;
});

afterEach(() => {
  for (const s of stop) s();
  stop = [];
  vi.useRealTimers();
  document.body.innerHTML = '';
});

const setup = () => {
  stop.push(initTable(), initTableFilter(), initTableExport());
};

describe('collectTable', () => {
  it('colunas: ignora seleção, ações e data-eds-export-ignore; tipos e valores crus', () => {
    const { data, scope } = collectTable(document.getElementById('pedidos') as HTMLTableElement);
    expect(scope).toBe('visible');
    expect(data.columns).toEqual([
      { key: 'cliente', label: 'Cliente', type: undefined },
      { key: 'total', label: 'Total', type: 'currency' },
      { key: 'data', label: 'Data', type: 'date' },
    ]);
    expect(data.rows[0]).toEqual({ cliente: 'Óleo Modelo', total: 1280.5, data: '2026-03-15' });
    // sem data-value: o texto da célula
    expect(data.rows[2]).toEqual({
      cliente: 'Comércio Teste',
      total: 'R$ 8.920,90',
      data: '20/11/2025',
    });
  });

  it('data-eds-export-ignore na célula esvazia só o valor', () => {
    const table = document.getElementById('pedidos') as HTMLTableElement;
    table.querySelector('#r1 td:nth-child(2)')?.setAttribute('data-eds-export-ignore', '');
    expect(collectTable(table).data.rows[0]?.cliente).toBe('');
    table.querySelector('#r2')?.setAttribute('data-eds-export-ignore', '');
    expect(collectTable(table, 'all').data.rows).toHaveLength(2);
  });

  it('escopos: auto, visible, selected e all, com filtro', async () => {
    setup();
    const table = document.getElementById('pedidos') as HTMLTableElement;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.type(document.getElementById('busca') as HTMLInputElement, 'atelier');
    await vi.advanceTimersByTimeAsync(300);
    const ids = (scope: 'auto' | 'visible' | 'selected' | 'all') =>
      collectTable(table, scope).data.rows.map((r) => r.cliente);

    // sem seleção: auto = visíveis (respeita o filtro)
    expect(ids('auto')).toEqual(['Atelier Exemplo']);
    expect(collectTable(table, 'auto').scope).toBe('visible');
    expect(ids('visible')).toEqual(['Atelier Exemplo']);
    expect(ids('all')).toEqual(['Óleo Modelo', 'Atelier Exemplo', 'Comércio Teste']);
    expect(ids('selected')).toEqual([]);

    // com seleção: auto = marcadas (inclusive a oculta pelo filtro)
    await user.click(document.querySelector('#r1 input') as HTMLInputElement);
    expect(collectTable(table, 'auto').scope).toBe('selected');
    expect(ids('auto')).toEqual(['Óleo Modelo']);
    expect(ids('selected')).toEqual(['Óleo Modelo']);
    expect(ids('visible')).toEqual(['Atelier Exemplo']);
  });

  it('a ordem acompanha o DOM depois da ordenação', () => {
    const table = document.getElementById('pedidos') as HTMLTableElement;
    const body = table.tBodies[0] as HTMLTableSectionElement;
    body.append(document.getElementById('r1') as HTMLElement);
    expect(collectTable(table, 'all').data.rows.map((r) => r.cliente)).toEqual([
      'Atelier Exemplo',
      'Comércio Teste',
      'Óleo Modelo',
    ]);
  });
});

describe('botões de exportação', () => {
  it('CSV: baixa o arquivo com data no nome, MIME e URL liberada depois', async () => {
    setup();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(button('CSV'));
    expect(downloads).toHaveLength(1);
    expect(downloads[0]?.name).toBe('pedidos-de-novembro-2026-11-20.csv');
    expect(downloads[0]?.type).toBe('text/csv;charset=utf-8');
    const text = await read(downloads[0]?.blob as Blob);
    expect(text).toContain('Cliente;Total;Data');
    expect(text).toContain('Óleo Modelo;1280,50;15/03/2026');
    expect(text).not.toContain('000.000');
    expect(text).not.toContain('Ver');
    expect(revoked).toEqual([]);
    await vi.advanceTimersByTimeAsync(1500);
    expect(revoked).toEqual(['blob:eds-1']);
    expect(document.querySelector('a[download]')).toBeNull();
  });

  it('status "Arquivo ... gerado (N linhas)." e evento eds:table-export', async () => {
    setup();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const seen: unknown[] = [];
    listen('eds:table-export', (e) => seen.push((e as CustomEvent).detail));
    await user.click(button('Excel'));
    expect(downloads[0]?.name).toBe('pedidos-2026-11-20.xlsx');
    expect(document.querySelector('[role=status]')?.textContent).toBe(
      'Arquivo pedidos-2026-11-20.xlsx gerado (3 linhas).',
    );
    expect(seen).toEqual([
      { format: 'xlsx', scope: 'visible', filename: 'pedidos-2026-11-20.xlsx', count: 3 },
    ]);
    const zip = readZip(await bytes(downloads[0]?.blob as Blob));
    const sheet = zip.find((f) => f.name === 'xl/worksheets/sheet1.xml')?.text ?? '';
    expect(sheet).toContain('<v>1280.5</v>');
    expect(zip.find((f) => f.name === 'xl/workbook.xml')?.text).toContain(
      'name="Pedidos de Novembro"',
    );
  });

  it('JSON com escopo all e PDF com título/subtítulo próprios', async () => {
    setup();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(button('JSON'));
    const json = JSON.parse(await read(downloads[0]?.blob as Blob)) as Record<string, unknown>[];
    expect(json[0]).toEqual({ cliente: 'Óleo Modelo', total: 1280.5, data: '2026-03-15' });
    expect(json[2]).toEqual({ cliente: 'Comércio Teste', total: 8920.9, data: '2025-11-20' });
    await user.click(button('PDF'));
    expect(downloads[1]?.type).toBe('application/pdf');
    const pdf = new TextDecoder('latin1').decode(await bytes(downloads[1]?.blob as Blob));
    expect(pdf.startsWith('%PDF-1.4')).toBe(true);
    expect(pdf).toContain('/Title <FEFF');
  });

  it('escopo selected e visible; sem linhas avisa e não baixa', async () => {
    setup();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(document.getElementById('so-sel') as HTMLElement);
    expect(downloads).toHaveLength(0);
    expect(document.querySelector('[role=status]')?.textContent).toBe(
      'Não há linhas para exportar.',
    );
    await user.click(document.querySelector('#r2 input') as HTMLInputElement);
    await user.click(document.getElementById('so-sel') as HTMLElement);
    expect(downloads).toHaveLength(1);
    expect(await read(downloads[0]?.blob as Blob)).not.toContain('Óleo');
    expect(document.querySelector('[role=status]')?.textContent).toBe(
      'Arquivo pedidos-de-novembro-2026-11-20.csv gerado (1 linha).',
    );
    await user.click(document.getElementById('so-vis') as HTMLElement);
    expect(await read(downloads[1]?.blob as Blob)).toContain('Óleo');
  });

  it('eds:table-beforeexport cancelável impede a geração e traz os dados', async () => {
    setup();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const log: { format: string; count: number; filename: string }[] = [];
    const ok = vi.fn();
    listen('eds:table-beforeexport', (e) => {
      const d = (e as CustomEvent).detail as { format: string; count: number; filename: string };
      log.push({ format: d.format, count: d.count, filename: d.filename });
      e.preventDefault();
    });
    listen('eds:table-export', ok);
    await user.click(button('CSV'));
    expect(log).toEqual([
      { format: 'csv', count: 3, filename: 'pedidos-de-novembro-2026-11-20.csv' },
    ]);
    expect(downloads).toHaveLength(0);
    expect(ok).not.toHaveBeenCalled();
  });

  it('o ouvinte pode mascarar os dados antes da geração', async () => {
    setup();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    listen('eds:table-beforeexport', (e) => {
      const d = (e as CustomEvent).detail as { data: { rows: Record<string, unknown>[] } };
      for (const row of d.data.rows) row.cliente = '***';
    });
    await user.click(button('CSV'));
    const text = await read(downloads[0]?.blob as Blob);
    expect(text).toContain('***;1280,50');
    expect(text).not.toContain('Óleo');
  });

  it('item de menu: ignora aria-disabled e destino inexistente; destroy desliga', async () => {
    const stopAll = initTableExport();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    button('CSV').setAttribute('aria-disabled', 'true');
    await user.click(button('CSV'));
    button('Excel').setAttribute('data-eds-export-target', 'nao-existe');
    await user.click(button('Excel'));
    expect(downloads).toHaveLength(0);
    button('CSV').removeAttribute('aria-disabled');
    stopAll();
    await user.click(button('CSV'));
    expect(downloads).toHaveLength(0);
  });

  it('liga botões que entram depois (parcial do servidor)', async () => {
    stop.push(initTableExport());
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const late = document.createElement('button');
    late.setAttribute('data-eds-export', 'json');
    late.setAttribute('data-eds-export-target', 'pedidos');
    late.textContent = 'Tarde';
    document.body.append(late);
    await vi.advanceTimersByTimeAsync(10);
    await user.click(late);
    expect(downloads).toHaveLength(1);
  });
});

describe('exportData', () => {
  it('baixa com o nome e a extensão certos', () => {
    const name = exportData({ columns: [{ key: 'a', label: 'A' }], rows: [{ a: 1 }] }, 'xlsx', {
      filename: 'relatorio.xlsx',
    });
    expect(name).toBe('relatorio.xlsx');
    expect(downloads[0]?.name).toBe('relatorio.xlsx');
    expect(downloads[0]?.type).toContain('spreadsheetml.sheet');
  });

  it('toXlsx é independente do DOM', () => {
    expect(toXlsx({ columns: [], rows: [] }).length).toBeGreaterThan(100);
  });
});
