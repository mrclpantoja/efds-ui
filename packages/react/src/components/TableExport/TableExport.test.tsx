import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TableExport } from './TableExport';
import type { ExportData } from '@eds-ui/behavior/export';

const data: ExportData = {
  columns: [
    { key: 'cliente', label: 'Cliente' },
    { key: 'cpf', label: 'CPF' },
    { key: 'total', label: 'Total', type: 'currency' },
  ],
  rows: [
    { cliente: 'Atelier Exemplo', cpf: '000.000.000-00', total: 1280.5 },
    { cliente: 'Comércio Modelo', cpf: '000.000.000-01', total: 459 },
  ],
};

interface Download {
  name: string;
  type: string;
  blob: Blob;
}
let downloads: Download[] = [];

const text = (blob: Blob): Promise<string> =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.readAsText(blob);
  });

beforeEach(() => {
  downloads = [];
  const blobs = new Map<string, Blob>();
  let n = 0;
  URL.createObjectURL = vi.fn((blob: Blob) => {
    n += 1;
    const url = `blob:eds-${n}`;
    blobs.set(url, blob);
    return url;
  });
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    const blob = blobs.get(this.href);
    if (blob) downloads.push({ name: this.download, type: blob.type, blob });
  });
});

const item = (name: string) => screen.getByRole('button', { name, hidden: true });
const labelsOf = (root: HTMLElement) =>
  Array.from(root.querySelectorAll('.eds-dropdown-item'), (el) => el.textContent);

describe('TableExport', () => {
  it('é um Dropdown (disclosure) com o botão Exportar e um item por formato', () => {
    const { container } = render(<TableExport data={data} />);
    const trigger = screen.getByRole('button', { name: 'Exportar' });
    expect(trigger).toHaveClass('eds-button', 'eds-button-secondary');
    expect(trigger.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
    const menu = container.querySelector<HTMLElement>('.eds-dropdown')!;
    expect(menu).toHaveAttribute('role', 'group');
    expect(trigger).toHaveAttribute('popovertarget', menu.id);
    expect(labelsOf(container)).toEqual(['CSV', 'Excel (.xlsx)', 'JSON', 'PDF']);
    expect(container.querySelector('[role="status"]')).toBeEmptyDOMElement();
  });

  it('formats escolhe e ordena os itens; rótulos e botão são substituíveis', () => {
    const { container } = render(
      <TableExport
        data={data}
        formats={['pdf', 'csv', 'pdf']}
        label="Export"
        formatLabels={{ csv: 'Planilha CSV' }}
        variant="primary"
        size="sm"
        className="extra"
      />,
    );
    const trigger = screen.getByRole('button', { name: 'Export' });
    expect(trigger).toHaveClass('eds-button-primary', 'eds-button-sm', 'extra');
    expect(labelsOf(container)).toEqual(['PDF', 'Planilha CSV']);
  });

  it('repassa o ref ao botão', () => {
    const ref = createRef<HTMLButtonElement>();
    render(<TableExport ref={ref} data={data} />);
    expect(ref.current).toBe(screen.getByRole('button', { name: 'Exportar' }));
    expect(TableExport.displayName).toBe('TableExport');
  });

  it('baixa o CSV com acentos, nome e extensão corretos', async () => {
    const user = userEvent.setup();
    render(<TableExport data={data} filename="pedidos" />);
    await user.click(item('CSV'));
    expect(downloads).toHaveLength(1);
    expect(downloads[0]?.name).toBe('pedidos.csv');
    expect(downloads[0]?.type).toBe('text/csv;charset=utf-8');
    const csv = await text(downloads[0]!.blob);
    expect(csv).toContain('Comércio Modelo');
    expect(csv).toContain('Cliente;CPF;Total');
  });

  it('gera os quatro formatos com o tipo MIME certo', async () => {
    const user = userEvent.setup();
    render(<TableExport data={data} filename="pedidos.xlsx" title="Pedidos" subtitle="Novembro" />);
    for (const name of ['CSV', 'Excel (.xlsx)', 'JSON', 'PDF']) await user.click(item(name));
    expect(downloads.map((d) => d.name)).toEqual([
      'pedidos.csv',
      'pedidos.xlsx',
      'pedidos.json',
      'pedidos.pdf',
    ]);
    expect(downloads[1]?.type).toContain('spreadsheetml.sheet');
    expect(downloads[3]?.type).toBe('application/pdf');
    const json = JSON.parse(await text(downloads[2]!.blob)) as Record<string, unknown>[];
    expect(json[0]).toMatchObject({ cliente: 'Atelier Exemplo', total: 1280.5 });
    expect(await text(downloads[3]!.blob.slice(0, 8))).toBe('%PDF-1.4');
  });

  it('getData é lido a cada clique (a fonte é o estado atual)', async () => {
    const user = userEvent.setup();
    const getData = vi.fn(() => ({ ...data, rows: data.rows.slice(0, 1) }));
    render(<TableExport getData={getData} />);
    await user.click(item('JSON'));
    await user.click(item('JSON'));
    expect(getData).toHaveBeenCalledTimes(2);
    expect(JSON.parse(await text(downloads[0]!.blob))).toHaveLength(1);
  });

  it('onBeforeExport pode mascarar o CPF e o arquivo sai mascarado', async () => {
    const user = userEvent.setup();
    const before = vi.fn((d: ExportData) => ({
      ...d,
      rows: d.rows.map((r) => ({ ...r, cpf: '***.***.***-**' })),
    }));
    render(<TableExport data={data} onBeforeExport={before} filename="p" />);
    await user.click(item('JSON'));
    expect(before).toHaveBeenCalledWith(data, { format: 'json', filename: 'p.json' });
    const out = await text(downloads[0]!.blob);
    expect(out).toContain('***.***.***-**');
    expect(out).not.toContain('000.000.000');
    // a fonte do consumidor não é alterada
    expect(data.rows[0]?.cpf).toBe('000.000.000-00');
  });

  it('onBeforeExport pode retirar uma coluna sensível', async () => {
    const user = userEvent.setup();
    render(
      <TableExport
        data={data}
        onBeforeExport={(d) => ({ ...d, columns: d.columns.filter((c) => c.key !== 'cpf') })}
      />,
    );
    await user.click(item('CSV'));
    const csv = await text(downloads[0]!.blob);
    expect(csv).not.toContain('CPF');
    expect(csv).toContain('Cliente;Total');
  });

  it('onBeforeExport devolvendo false cancela sem baixar nem anunciar', async () => {
    const user = userEvent.setup();
    const onExport = vi.fn();
    const { container } = render(
      <TableExport data={data} onBeforeExport={() => false} onExport={onExport} />,
    );
    await user.click(item('CSV'));
    expect(downloads).toHaveLength(0);
    expect(onExport).not.toHaveBeenCalled();
    expect(container.querySelector('[role="status"]')).toBeEmptyDOMElement();
  });

  it('anuncia o resultado e chama onExport', async () => {
    const user = userEvent.setup();
    const onExport = vi.fn();
    const { container } = render(<TableExport data={data} filename="p" onExport={onExport} />);
    await user.click(item('CSV'));
    expect(onExport).toHaveBeenCalledWith({ format: 'csv', filename: 'p.csv', count: 2 });
    const status = container.querySelector('[role="status"]')!;
    await vi.waitFor(() => expect(status).toHaveTextContent('Arquivo p.csv gerado (2 linhas).'));
  });

  it('uma linha só usa a mensagem do singular; messages substitui os textos', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <TableExport
        data={{ ...data, rows: data.rows.slice(0, 1) }}
        filename="p"
        messages={{ doneOne: 'Saved {name}.' }}
      />,
    );
    await user.click(item('CSV'));
    const status = container.querySelector('[role="status"]')!;
    await vi.waitFor(() => expect(status).toHaveTextContent('Saved p.csv.'));
  });

  it('sem linhas: avisa e não baixa', async () => {
    const user = userEvent.setup();
    const { container } = render(<TableExport data={{ ...data, rows: [] }} />);
    await user.click(item('PDF'));
    expect(downloads).toHaveLength(0);
    const status = container.querySelector('[role="status"]')!;
    await vi.waitFor(() => expect(status).toHaveTextContent('Não há linhas para exportar.'));
  });

  it('falha ao obter os dados: avisa em vez de quebrar', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <TableExport
        getData={() => {
          throw new Error('falha');
        }}
      />,
    );
    await user.click(item('CSV'));
    expect(downloads).toHaveLength(0);
    const status = container.querySelector('[role="status"]')!;
    await vi.waitFor(() => expect(status).toHaveTextContent('Não foi possível gerar o arquivo.'));
  });

  it('disabled desabilita o botão', () => {
    render(<TableExport data={data} disabled />);
    expect(screen.getByRole('button', { name: 'Exportar' })).toBeDisabled();
  });

  it('o tipo exige data ou getData', () => {
    // @ts-expect-error sem fonte de dados
    render(<TableExport />);
  });
});
