// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readZip } from '../test-utils/zip';
import { HELVETICA, HELVETICA_BOLD, winAnsiCode } from './afm';
import { toCsv } from './csv';
import { toJson } from './json';
import { fileName, formatDecimal, normalize, parseDateText } from './model';
import { toPdf } from './pdf';
import { columnLetters, excelSerial, sheetNameFor, toXlsx } from './xlsx';
import { crc32 } from './zip';
import type { ExportData } from './types';

const NOW = new Date(2026, 10, 20, 14, 30, 0);

const data: ExportData = {
  columns: [
    { key: 'cliente', label: 'Cliente' },
    { key: 'total', label: 'Total', type: 'currency' },
    { key: 'qtd', label: 'Quantidade', type: 'number' },
    { key: 'desc', label: 'Desconto', type: 'percent' },
    { key: 'data', label: 'Data', type: 'date' },
  ],
  rows: [
    { cliente: 'Óleo Modelo "Ltda"; Ação', total: 1280.5, qtd: 3, desc: 12.5, data: '2026-03-15' },
    { cliente: 'Atelier Exemplo', total: -459, qtd: -2.25, desc: 0, data: '2026-01-02T09:05:00' },
    { cliente: '', total: null, qtd: undefined, desc: '', data: '' },
  ],
};

describe('model', () => {
  it('formata números em pt-BR', () => {
    expect(formatDecimal(1280.5, 2, 2, true)).toBe('1.280,50');
    expect(formatDecimal(1280.5, 2, 2, false)).toBe('1280,50');
    expect(formatDecimal(-3.5, 0, 6, false)).toBe('-3,5');
    expect(formatDecimal(0.1 + 0.2, 0, 6, false)).toBe('0,3');
    expect(formatDecimal(-0.0001, 0, 2, false)).toBe('0');
    expect(formatDecimal(1234567, 0, 6, true)).toBe('1.234.567');
  });

  it('interpreta datas de texto e rejeita as impossíveis', () => {
    expect(parseDateText('15/03/2026')).toMatchObject({
      year: 2026,
      month: 3,
      day: 15,
      time: false,
    });
    expect(parseDateText('2026-03-15T14:30')).toMatchObject({ hour: 14, minute: 30, time: true });
    expect(parseDateText('31/02/2026')).toBeNull();
    expect(parseDateText('ontem')).toBeNull();
  });

  it('infere o tipo da coluna pelo primeiro valor e valida a entrada', () => {
    const n = normalize({
      columns: [
        { key: 'a', label: 'A' },
        { key: 'b', label: 'B' },
        { key: 'c', label: 'C' },
      ],
      rows: [{ a: '', b: 2, c: new Date(2026, 0, 5) }, { a: 'x' }],
    });
    expect(n.columns.map((c) => c.type)).toEqual(['text', 'number', 'date']);
    expect(() => normalize({} as ExportData)).toThrow(TypeError);
  });

  it('nome de arquivo: troca caracteres ilegais e não duplica a extensão', () => {
    expect(fileName('a/b:c', 'csv')).toBe('a-b-c.csv');
    expect(fileName('pedidos.XLSX', 'xlsx')).toBe('pedidos.xlsx');
    expect(fileName('', 'pdf')).toBe('tabela.pdf');
    expect(fileName('..', 'pdf')).toBe('tabela.pdf');
  });
});

describe('toCsv', () => {
  const lines = (csv: string) => csv.split('\r\n');

  it('começa com BOM, usa ; e CRLF e termina com quebra', () => {
    const csv = toCsv(data);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.endsWith('\r\n')).toBe(true);
    expect(lines(csv)[0]).toBe('﻿Cliente;Total;Quantidade;Desconto;Data');
  });

  it('escapa aspas e ;, mantém acentos e formata números e datas em pt-BR', () => {
    const rows = lines(toCsv(data));
    expect(rows[1]).toBe('"Óleo Modelo ""Ltda""; Ação";1280,50;3;12,5%;15/03/2026');
    expect(rows[2]).toBe('Atelier Exemplo;-459,00;-2,25;0%;02/01/2026 09:05');
  });

  it('valores vazios viram campos vazios', () => {
    expect(lines(toCsv(data))[3]).toBe(';;;;');
  });

  it('protege texto contra injeção de fórmula, sem alterar números negativos', () => {
    const csv = toCsv({
      columns: [
        { key: 'a', label: '=SOMA(A1)' },
        { key: 'n', label: 'N', type: 'number' },
      ],
      rows: [
        { a: '=1+1', n: -5 },
        { a: '+55 53', n: 1 },
        { a: '-x', n: 1 },
        { a: '@cmd', n: 1 },
        { a: '\tTab', n: 1 },
        { a: 'normal', n: 1 },
      ],
    });
    const rows = lines(csv);
    expect(rows[0]).toBe("﻿'=SOMA(A1);N");
    expect(rows[1]).toBe("'=1+1;-5");
    expect(rows[2]).toBe("'+55 53;1");
    expect(rows[3]).toBe("'-x;1");
    expect(rows[4]).toBe("'@cmd;1");
    expect(rows[5]).toBe("'	Tab;1");
    expect(rows[6]).toBe('normal;1');
  });

  it('aspas dentro e quebra de linha na célula', () => {
    const csv = toCsv({ columns: [{ key: 'a', label: 'A' }], rows: [{ a: 'linha 1\nlinha 2' }] });
    expect(csv).toContain('"linha 1\nlinha 2"');
  });
});

describe('toJson', () => {
  it('array de objetos com valores tipados', () => {
    const out = JSON.parse(toJson(data)) as Record<string, unknown>[];
    expect(out).toHaveLength(3);
    expect(out[0]).toEqual({
      cliente: 'Óleo Modelo "Ltda"; Ação',
      total: 1280.5,
      qtd: 3,
      desc: 12.5,
      data: '2026-03-15',
    });
    expect(out[1]).toMatchObject({ total: -459, qtd: -2.25, data: '2026-01-02T09:05:00' });
    expect(out[2]).toEqual({ cliente: null, total: null, qtd: null, desc: null, data: null });
  });

  it('aceita Date e valores lógicos', () => {
    const out = JSON.parse(
      toJson({
        columns: [
          { key: 'd', label: 'D' },
          { key: 'b', label: 'B' },
        ],
        rows: [{ d: new Date(2026, 4, 9), b: true }],
      }),
    ) as unknown[];
    expect(out[0]).toEqual({ d: '2026-05-09', b: true });
  });
});

describe('zip', () => {
  it('CRC32 de referência', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });
});

describe('toXlsx', () => {
  const files = () => readZip(toXlsx(data, { title: 'Pedidos', now: NOW }));
  const get = (name: string) => files().find((f) => f.name === name)?.text ?? '';

  it('traz todas as partes do pacote, com CRC válido e nomes UTF-8', () => {
    expect(files().map((f) => f.name)).toEqual([
      '[Content_Types].xml',
      '_rels/.rels',
      'xl/workbook.xml',
      'xl/_rels/workbook.xml.rels',
      'xl/worksheets/sheet1.xml',
      'xl/styles.xml',
      'xl/sharedStrings.xml',
    ]);
    const bytes = toXlsx(data, { now: NOW });
    expect(Array.from(bytes.slice(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04]);
  });

  it('planilha: cabeçalho congelado, autofiltro, larguras e células', () => {
    const sheet = get('xl/worksheets/sheet1.xml');
    expect(sheet).toContain(
      '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>',
    );
    expect(sheet).toContain('<autoFilter ref="A1:E4"/>');
    expect(sheet).toContain('<dimension ref="A1:E4"/>');
    expect(sheet).toMatch(
      /<cols>(<col min="\d" max="\d" width="\d+" customWidth="1"\/>){5}<\/cols>/,
    );
    // número como número, com estilo de moeda; negativo preservado.
    expect(sheet).toContain('<c r="B2" s="6"><v>1280.5</v></c>');
    expect(sheet).toContain('<c r="B3" s="6"><v>-459</v></c>');
    // percentual e quantidade com casas.
    expect(sheet).toContain('<c r="D2" s="9"><v>12.5</v></c>');
    expect(sheet).toContain('<c r="C3" s="4"><v>-2.25</v></c>');
    // linha vazia não gera célula de dados.
    expect(sheet).toContain('<row r="4"></row>');
  });

  it('datas viram número de série do Excel com formato de data', () => {
    const sheet = get('xl/worksheets/sheet1.xml');
    // 15/03/2026 = 46096; 02/01/2026 09:05 = 46024 + 9:05
    expect(sheet).toContain('<c r="E2" s="7"><v>46096</v></c>');
    expect(sheet).toMatch(/<c r="E3" s="8"><v>46024\.378472222<\/v><\/c>/);
    expect(
      excelSerial({
        kind: 'date',
        year: 1900,
        month: 3,
        day: 1,
        hour: 0,
        minute: 0,
        second: 0,
        time: false,
      }),
    ).toBe(61);
    expect(
      excelSerial({
        kind: 'date',
        year: 2000,
        month: 1,
        day: 1,
        hour: 0,
        minute: 0,
        second: 0,
        time: false,
      }),
    ).toBe(36526);
  });

  it('estilos: negrito no cabeçalho e formatos numéricos', () => {
    const styles = get('xl/styles.xml');
    expect(styles).toContain('<b/>');
    expect(styles).toContain('formatCode="&quot;R$&quot;\\ #,##0.00"');
    expect(styles).toContain('formatCode="dd/mm/yyyy"');
    expect(styles).toContain('<cellXfs count="10">');
    expect(styles.match(/<xf /g)?.length).toBe(11); // 1 em cellStyleXfs + 10
  });

  it('textos em sharedStrings, escapados, e contagem coerente', () => {
    const sst = get('xl/sharedStrings.xml');
    expect(sst).toContain('Óleo Modelo &quot;Ltda&quot;; Ação');
    const unique = Number(/uniqueCount="(\d+)"/.exec(sst)?.[1]);
    expect(sst.match(/<si>/g)?.length).toBe(unique);
    // cabeçalhos (5) + 2 clientes
    expect(Number(/ count="(\d+)"/.exec(sst)?.[1])).toBe(7);
  });

  it('nome da planilha: título, limite de 31 e caracteres proibidos', () => {
    expect(get('xl/workbook.xml')).toContain('<sheet name="Pedidos" sheetId="1" r:id="rId1"/>');
    expect(sheetNameFor('A/B\\C:D*E?F[G]H')).toBe('A B C D E F G H');
    expect(sheetNameFor('x'.repeat(40))).toHaveLength(31);
    expect(sheetNameFor("'Relatório'")).toBe('Relatório');
    expect(sheetNameFor(undefined)).toBe('Dados');
    expect(sheetNameFor('///')).toBe('Dados');
  });

  it('remove caracteres inválidos em XML e aceita zero linhas e zero colunas', () => {
    const f = readZip(
      toXlsx(
        { columns: [{ key: 'a', label: 'A\u0001' }], rows: [{ a: 'x\u0000y' }] },
        { now: NOW },
      ),
    );
    const sst = f.find((x) => x.name === 'xl/sharedStrings.xml')?.text ?? '';
    expect(sst).toContain('>A<');
    expect(sst).toContain('>xy<');
    expect(() => toXlsx({ columns: [{ key: 'a', label: 'A' }], rows: [] })).not.toThrow();
    expect(() => toXlsx({ columns: [], rows: [] })).not.toThrow();
  });

  it('letras de coluna', () => {
    expect(columnLetters(0)).toBe('A');
    expect(columnLetters(25)).toBe('Z');
    expect(columnLetters(26)).toBe('AA');
    expect(columnLetters(701)).toBe('ZZ');
    expect(columnLetters(702)).toBe('AAA');
  });
});

// ---- PDF -----------------------------------------------------------------------------------

const latin1 = (bytes: Uint8Array): string => {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return s;
};

/** Textos desenhados (`<hex> Tj`) de todas as páginas, decodificados como WinAnsi/Latin-1. */
const drawn = (source: string | Uint8Array): string[] => {
  const pdf = typeof source === 'string' ? source : latin1(source);
  return Array.from(pdf.matchAll(/<([0-9a-f]+)> Tj/g), (m) => {
    const hex = m[1] ?? '';
    let s = '';
    for (let i = 0; i < hex.length; i += 2)
      s += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
    return s;
  });
};

function checkStructure(bytes: Uint8Array): { pdf: string; pages: number } {
  const pdf = latin1(bytes);
  expect(pdf.startsWith('%PDF-1.4\n')).toBe(true);
  expect(pdf.endsWith('%%EOF\n')).toBe(true);
  const start = Number(/startxref\n(\d+)\n%%EOF/.exec(pdf)?.[1]);
  expect(pdf.slice(start, start + 4)).toBe('xref');
  const header = /^xref\n0 (\d+)\n/.exec(pdf.slice(start));
  const size = Number(header?.[1]);
  expect(pdf).toContain(`/Size ${size} `);
  const entries = pdf
    .slice(start + (header?.[0].length ?? 0))
    .split('\n')
    .slice(0, size);
  expect(entries[0]).toBe('0000000000 65535 f ');
  for (let id = 1; id < size; id += 1) {
    const entry = entries[id] ?? '';
    expect(entry).toMatch(/^\d{10} 00000 n $/);
    const offset = Number(entry.slice(0, 10));
    expect(pdf.slice(offset, offset + `${id} 0 obj`.length)).toBe(`${id} 0 obj`);
  }
  // /Length de cada fluxo confere com o conteúdo.
  for (const m of pdf.matchAll(/<< \/Length (\d+) >>\nstream\n([\s\S]*?)\nendstream/g)) {
    expect(m[2]?.length).toBe(Number(m[1]));
  }
  const pages = pdf.match(/\/Type \/Page /g)?.length ?? 0;
  expect(pdf).toContain(`/Count ${pages} `);
  expect(pdf.match(/\/Type \/Pages /g)?.length).toBe(1);
  return { pdf, pages };
}

describe('afm', () => {
  it('larguras da Helvetica e da Helvetica-Bold', () => {
    expect(HELVETICA[winAnsiCode('A'.charCodeAt(0))]).toBe(667);
    expect(HELVETICA[winAnsiCode('i'.charCodeAt(0))]).toBe(222);
    expect(HELVETICA[winAnsiCode('á'.charCodeAt(0))]).toBe(556);
    expect(HELVETICA[winAnsiCode('Ç'.charCodeAt(0))]).toBe(722);
    expect(HELVETICA_BOLD[winAnsiCode('A'.charCodeAt(0))]).toBe(722);
    expect(HELVETICA[32]).toBe(278);
    expect(HELVETICA[0x85]).toBe(1000);
  });

  it('mapeia para WinAnsi e troca o que não existe por ?', () => {
    expect(winAnsiCode(0xe7)).toBe(0xe7);
    expect(winAnsiCode(0x20ac)).toBe(0x80);
    expect(winAnsiCode(0x201c)).toBe(0x93);
    expect(winAnsiCode(0x1f600)).toBe(63);
    expect(winAnsiCode(0x4e2d)).toBe(63);
    expect(winAnsiCode(10)).toBe(32);
  });
});

describe('locale', () => {
  it('formata números e datas no locale pedido, com pt-BR como padrão', () => {
    expect(formatDecimal(1280.5, 2, 2, true, 'en-US')).toBe('1,280.50');
    expect(formatDecimal(1280.5, 2, 2, false, 'de-DE')).toBe('1280,50');
    const en = toCsv(data, { locale: 'en-US' }).split('\r\n');
    expect(en[1]).toBe('"Óleo Modelo ""Ltda""; Ação";1280.50;3;12.5%;03/15/2026');
    expect(toCsv(data).split('\r\n')[1]).toContain(';1280,50;3;12,5%;15/03/2026');
  });

  it('o PDF declara o /Lang do locale', () => {
    const latin = (bytes: Uint8Array) => Array.from(bytes, (b) => String.fromCharCode(b)).join('');
    expect(latin(toPdf(data, { now: NOW }))).toContain('/Lang (pt-BR)');
    expect(latin(toPdf(data, { now: NOW, locale: 'en-US' }))).toContain('/Lang (en-US)');
  });
});

describe('toPdf', () => {
  it('uma página A4 retrato com a estrutura correta', () => {
    const { pdf, pages } = checkStructure(
      toPdf(data, { title: 'Pedidos', subtitle: 'Mês 11', now: NOW }),
    );
    expect(pages).toBe(1);
    expect(pdf).toContain('/MediaBox [0 0 595.28 841.89]');
    expect(pdf).toContain('/BaseFont /Helvetica /Encoding /WinAnsiEncoding');
    expect(pdf).toContain('/BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding');
    expect(pdf).toContain('/CreationDate (D:20261120143000)');
    expect(pdf).toContain('/Title <FEFF');
    const text = drawn(pdf);
    expect(text).toContain('Pedidos');
    expect(text).toContain('Mês 11');
    expect(text).toContain('Gerado em 20/11/2026 14:30');
    expect(text).toContain('Página 1 de 1');
    // cabeçalho em negrito (F2), linhas em regular (F1), zebra e grade
    expect(pdf).toContain('/F2 8.5 Tf');
    expect(pdf).toContain('0.965 g');
    expect(pdf).toContain('0.78 G 0.4 w');
  });

  it('acentos, números e datas saem codificados em WinAnsi', () => {
    const text = drawn(checkStructure(toPdf(data, { now: NOW })).pdf).join('|');
    expect(text).toContain('Ação');
    expect(text).toContain('R$ 1.280,50');
    expect(text).toContain('-R$ 459,00');
    expect(text).toContain('12,5%');
    expect(text).toContain('15/03/2026');
    expect(text).toContain('02/01/2026 09:05');
  });

  it('caracteres fora do WinAnsi viram ?, e o euro é mantido', () => {
    const text = drawn(
      toPdf({ columns: [{ key: 'a', label: 'A' }], rows: [{ a: 'ok 😀 中 € “x”' }] }, { now: NOW }),
    );
    const cell = text.find((t) => t.startsWith('ok')) ?? '';
    expect(cell).toBe('ok ? ? \u0080 \u0093x\u0094');
  });

  it('valores vazios não desenham texto e a tabela vazia mostra a mensagem', () => {
    const empty = drawn(toPdf({ columns: [{ key: 'a', label: 'A' }], rows: [] }, { now: NOW }));
    expect(empty).toContain('Nenhum registro.');
    checkStructure(toPdf({ columns: [{ key: 'a', label: 'A' }], rows: [] }, { now: NOW }));
    const sparse = drawn(toPdf(data, { now: NOW }));
    expect(sparse.filter((t) => t === '')).toHaveLength(0);
    checkStructure(toPdf({ columns: [], rows: [] }, { now: NOW }));
  });

  it('muitas colunas passam para paisagem', () => {
    const columns = Array.from({ length: 12 }, (_, i) => ({
      key: `c${i}`,
      label: `Coluna número ${i}`,
    }));
    const row = Object.fromEntries(columns.map((c) => [c.key, 'Valor de exemplo bem comprido']));
    const { pdf } = checkStructure(toPdf({ columns, rows: [row] }, { now: NOW }));
    expect(pdf).toContain('/MediaBox [0 0 841.89 595.28]');
    expect(toPdf(data, { now: NOW })).not.toEqual(toPdf({ columns, rows: [row] }, { now: NOW }));
  });

  it('muitas linhas: várias páginas, cabeçalho repetido e rodapé "Página N de M"', () => {
    const rows = Array.from({ length: 120 }, (_, i) => ({
      cliente: `Cliente ${i + 1}`,
      total: i * 10.5,
      qtd: i,
      desc: i % 100,
      data: '2026-03-15',
    }));
    const { pdf, pages } = checkStructure(
      toPdf({ columns: data.columns, rows }, { title: 'Pedidos', now: NOW }),
    );
    expect(pages).toBeGreaterThanOrEqual(3);
    const text = drawn(pdf);
    for (let p = 1; p <= pages; p += 1) expect(text).toContain(`Página ${p} de ${pages}`);
    expect(text.filter((t) => t === 'Cliente')).toHaveLength(pages);
    expect(text).toContain('Cliente 120');
    // o título só aparece na primeira página
    expect(text.filter((t) => t === 'Pedidos')).toHaveLength(1);
  });

  it('quebra o texto dentro da célula pela largura da coluna', () => {
    const long = 'Texto bem comprido para obrigar a quebra de linha dentro da célula da tabela';
    const cols = [
      { key: 'a', label: 'Descrição' },
      { key: 'b', label: 'Código' },
    ];
    const lines = drawn(
      toPdf({ columns: cols, rows: [{ a: long.repeat(3), b: 'X1' }] }, { now: NOW }),
    );
    const joined = lines.filter((l) => long.includes(l.trim()) || l.includes('Texto'));
    expect(joined.length).toBeGreaterThan(1);
    expect(lines.join(' ')).toContain('célula');
  });

  it('palavra maior que a coluna é cortada sem estourar', () => {
    const word = 'X'.repeat(300);
    const { pdf } = checkStructure(
      toPdf(
        {
          columns: [
            { key: 'a', label: 'A' },
            { key: 'b', label: 'B' },
          ],
          rows: [{ a: word, b: 'ok' }],
        },
        { now: NOW },
      ),
    );
    const pieces = drawn(pdf).filter((t) => /^X+$/.test(t));
    expect(pieces.length).toBeGreaterThan(1);
    expect(pieces.join('')).toHaveLength(300);
  });

  it('números alinhados à direita (a borda direita do texto é a mesma)', () => {
    const pdf = latin1(
      toPdf(
        {
          columns: [{ key: 'v', label: 'Valor', type: 'currency' }],
          rows: [{ v: 5 }, { v: 1234567.5 }],
        },
        { now: NOW },
      ),
    );
    const edge = (text: string): number => {
      const hex = Array.from(text, (ch) => ch.charCodeAt(0).toString(16).padStart(2, '0')).join('');
      const m = new RegExp(`([0-9.]+) [0-9.]+ Td <${hex}> Tj`).exec(pdf);
      const w = Array.from(text).reduce((sum, ch) => sum + (HELVETICA[ch.charCodeAt(0)] ?? 0), 0);
      return Number(m?.[1]) + (w * 8.5) / 1000;
    };
    expect(edge('R$ 5,00')).toBeCloseTo(edge('R$ 1.234.567,50'), 1);
  });

  it('uma linha mais alta que a página é cortada com reticências', () => {
    const huge = Array.from({ length: 4000 }, () => 'palavra').join(' ');
    const { pages, pdf } = checkStructure(
      toPdf({ columns: [{ key: 'a', label: 'A' }], rows: [{ a: huge }] }, { now: NOW }),
    );
    expect(pages).toBe(1);
    expect(drawn(pdf).some((t) => t.endsWith('\u0085'))).toBe(true);
  });
});

describe('toXlsx: datas fora do alcance do Excel', () => {
  it('antes de 01/03/1900 a data sai como texto (série deslocada ou inexistente)', () => {
    const sheet = readZip(
      toXlsx(
        {
          columns: [{ key: 'd', label: 'Data', type: 'date' }],
          rows: [
            { d: '1850-05-10' },
            { d: '1900-01-15' },
            { d: '1900-02-28' },
            { d: '1900-03-01' },
            { d: '2026-03-15' },
          ],
        },
        { now: NOW },
      ),
    );
    const xml = sheet.find((f) => f.name === 'xl/worksheets/sheet1.xml')?.text ?? '';
    const sst = sheet.find((f) => f.name === 'xl/sharedStrings.xml')?.text ?? '';
    // Texto (t="s") com o que a tela mostraria; sem número de série negativo ou deslocado.
    expect(sst).toContain('10/05/1850');
    expect(sst).toContain('15/01/1900');
    expect(sst).toContain('28/02/1900');
    expect(xml).not.toMatch(/<c r="A[2-4]" s="7">/);
    expect(xml).not.toMatch(/<v>-\d/);
    // A partir de 01/03/1900 (série 61) continua data de verdade.
    expect(xml).toContain('<c r="A5" s="7"><v>61</v></c>');
    expect(xml).toContain('<c r="A6" s="7"><v>46096</v></c>');
  });
});

describe('afm: valores de referência da Helvetica (tabelas AFM padrão)', () => {
  const at = (table: Uint16Array, ch: string) => table[winAnsiCode(ch.codePointAt(0) ?? 63)];
  // Helvetica.afm e Helvetica-Bold.afm, caractere a caractere.
  const regular: Record<string, number> = {
    ' ': 278,
    a: 556,
    b: 556,
    c: 500,
    d: 556,
    e: 556,
    f: 278,
    g: 556,
    h: 556,
    i: 222,
    j: 222,
    k: 500,
    l: 222,
    m: 833,
    n: 556,
    o: 556,
    p: 556,
    q: 556,
    r: 333,
    s: 500,
    t: 278,
    u: 556,
    v: 500,
    w: 722,
    x: 500,
    y: 500,
    z: 500,
    A: 667,
    B: 667,
    C: 722,
    D: 722,
    E: 667,
    F: 611,
    G: 778,
    H: 722,
    I: 278,
    J: 500,
    K: 667,
    L: 556,
    M: 833,
    N: 722,
    O: 778,
    P: 667,
    Q: 778,
    R: 722,
    S: 667,
    T: 611,
    U: 722,
    V: 667,
    W: 944,
    X: 667,
    Y: 667,
    Z: 611,
    '0': 556,
    '9': 556,
    '.': 278,
    ',': 278,
    ':': 278,
    ';': 278,
    '-': 333,
    '/': 278,
    '%': 889,
    '&': 667,
    '(': 333,
    ')': 333,
    '@': 1015,
    '?': 556,
    '!': 278,
    '+': 584,
    '=': 584,
    _: 556,
    '~': 584,
    '|': 260,
    '{': 334,
    '^': 469,
    // Latin-1: mesma largura da letra base.
    é: 556,
    ã: 556,
    ç: 500,
    Á: 667,
    Ç: 722,
    Õ: 778,
    ú: 556,
    ü: 556,
  };
  const bold: Record<string, number> = {
    ' ': 278,
    a: 556,
    b: 611,
    c: 556,
    d: 611,
    e: 556,
    f: 333,
    g: 611,
    h: 611,
    i: 278,
    j: 278,
    k: 556,
    l: 278,
    m: 889,
    n: 611,
    o: 611,
    p: 611,
    q: 611,
    r: 389,
    s: 556,
    t: 333,
    u: 611,
    v: 556,
    w: 778,
    x: 556,
    y: 556,
    z: 500,
    A: 722,
    B: 722,
    C: 722,
    D: 722,
    E: 667,
    F: 611,
    G: 778,
    H: 722,
    I: 278,
    J: 556,
    K: 722,
    L: 611,
    M: 833,
    N: 722,
    O: 778,
    P: 667,
    Q: 778,
    R: 722,
    S: 667,
    T: 611,
    U: 722,
    V: 667,
    W: 944,
    X: 667,
    Y: 667,
    Z: 611,
    '0': 556,
    '.': 278,
    ',': 278,
    ':': 333,
    ';': 333,
    '-': 333,
    '/': 278,
    '%': 889,
    '&': 722,
    '@': 975,
    '?': 611,
    '!': 333,
    '+': 584,
    '|': 280,
    '^': 584,
  };

  it('Helvetica', () => {
    for (const [ch, w] of Object.entries(regular)) expect([ch, at(HELVETICA, ch)]).toEqual([ch, w]);
  });

  it('Helvetica-Bold', () => {
    for (const [ch, w] of Object.entries(bold))
      expect([ch, at(HELVETICA_BOLD, ch)]).toEqual([ch, w]);
  });

  it('dígitos medem 556 nas duas fontes', () => {
    for (const d of '0123456789') {
      expect(at(HELVETICA, d)).toBe(556);
      expect(at(HELVETICA_BOLD, d)).toBe(556);
    }
  });
});

describe('toPdf: fonte reduzida quando as colunas não cabem', () => {
  const grid = (n: number, word: string) => ({
    columns: Array.from({ length: n }, (_, i) => ({ key: `c${i}`, label: 'A' })),
    rows: [Object.fromEntries(Array.from({ length: n }, (_, i) => [`c${i}`, word]))],
  });
  const fontSizes = (bytes: Uint8Array) =>
    new Set(Array.from(latin1(bytes).matchAll(/\/F1 ([\d.]+) Tf/g), (m) => m[1]));

  it('cabe a 8,5 pt: mantém o tamanho padrão', () => {
    const sizes = fontSizes(toPdf(grid(7, 'X'.repeat(16)), { now: NOW }));
    expect(sizes.has('8.5')).toBe(true);
    expect(sizes.has('7')).toBe(false);
  });

  it('só cabe a 7 pt: reduz a fonte do corpo uma vez', () => {
    const sizes = fontSizes(toPdf(grid(8, 'X'.repeat(16)), { now: NOW }));
    expect(sizes.has('7')).toBe(true);
    expect(sizes.has('8.5')).toBe(false);
  });

  it('não cabe nem a 7 pt: fica em 7 pt, sem estourar a página, com a palavra cortada', () => {
    const word = 'X'.repeat(40);
    const bytes = toPdf(grid(12, word), { now: NOW });
    const { pdf } = checkStructure(bytes);
    expect(fontSizes(bytes).has('7')).toBe(true);
    const pieces = drawn(pdf).filter((t) => /^X+$/.test(t));
    expect(pieces.length).toBeGreaterThan(12);
    expect(pieces.join('')).toHaveLength(12 * 40);
  });
});
