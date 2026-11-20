import { getMessages } from '../core/config';
import { cellText, normalize, type Cell, type NormalizedColumn } from './model';
import type { ExportData, ExportOptions } from './types';
import { createZip } from './zip';

const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const NS_PKG = 'http://schemas.openxmlformats.org/package/2006/relationships';
const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

const MAX_ROWS = 1048576;
const MAX_COLS = 16384;

/** Índices em `cellXfs` (ver `stylesXml`). */
const STYLE = {
  header: 1,
  headerRight: 2,
  integer: 3,
  decimal2: 4,
  decimalMany: 5,
  currency: 6,
  date: 7,
  dateTime: 8,
  percent: 9,
} as const;

// Caracteres que o XML 1.0 não admite, incluindo substitutos soltos.
const INVALID_XML =
  // eslint-disable-next-line no-control-regex
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

const esc = (text: string): string =>
  text
    .replace(INVALID_XML, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Nome de planilha válido: até 31 caracteres, sem `[ ] : * ? / \` e sem apóstrofo nas pontas. */
export function sheetNameFor(name: string | undefined): string {
  const fallback = getMessages().exportSheet;
  // eslint-disable-next-line no-control-regex
  const clean = Array.from((name ?? '').replace(/[[\]:*?/\\\u0000-\u001f]/g, ' '))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
  const cut = Array.from(clean)
    .slice(0, 31)
    .join('')
    .replace(/^'+|'+$/g, '')
    .trim();
  return cut === '' ? fallback.slice(0, 31) : cut;
}

/** 0 -> A, 25 -> Z, 26 -> AA. */
export function columnLetters(index: number): string {
  let n = index;
  let out = '';
  do {
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
}

/**
 * Menor série que o Excel mostra certo: 1900-03-01 (61). O Excel conta um 29/02/1900 que não
 * existiu, então antes dessa data a série fica deslocada em um dia, e antes de 1900 não existe.
 * Essas datas saem como texto (o mesmo que a tela mostra), nunca como outra data.
 */
export const FIRST_SAFE_SERIAL = 61;

/** Número de série do Excel (dias desde 1899-12-30, hora na fração). */
export function excelSerial(cell: Extract<Cell, { kind: 'date' }>): number {
  const ms =
    Date.UTC(cell.year, cell.month - 1, cell.day, cell.hour, cell.minute, cell.second) -
    Date.UTC(1899, 11, 30);
  return Number((ms / 86400000).toFixed(9));
}

function decimalsOf(value: number): number {
  const s = Math.abs(value).toFixed(6).replace(/0+$/, '');
  const dot = s.indexOf('.');
  return dot < 0 ? 0 : s.length - dot - 1;
}

function stylesXml(): string {
  const fmt = (id: number, code: string) => `<numFmt numFmtId="${id}" formatCode="${esc(code)}"/>`;
  const xf = (numFmtId: number, extra = '', fontId = 0, fillId = 0, borderId = 0) =>
    `<xf numFmtId="${numFmtId}" fontId="${fontId}" fillId="${fillId}" borderId="${borderId}" xfId="0"` +
    `${numFmtId ? ' applyNumberFormat="1"' : ''}${fontId ? ' applyFont="1"' : ''}` +
    `${fillId ? ' applyFill="1"' : ''}${borderId ? ' applyBorder="1"' : ''}` +
    (extra ? ` applyAlignment="1">${extra}</xf>` : '/>');
  const right = '<alignment horizontal="right"/>';
  return (
    `${XML}<styleSheet xmlns="${NS}">` +
    `<numFmts count="4">${fmt(164, '"R$"\\ #,##0.00')}${fmt(165, 'dd/mm/yyyy')}` +
    `${fmt(166, 'dd/mm/yyyy\\ hh:mm')}${fmt(167, '#,##0.######')}</numFmts>` +
    '<fonts count="2"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font>' +
    '<font><b/><sz val="11"/><name val="Calibri"/><family val="2"/></font></fonts>' +
    '<fills count="3"><fill><patternFill patternType="none"/></fill>' +
    '<fill><patternFill patternType="gray125"/></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/><bgColor indexed="64"/></patternFill></fill></fills>' +
    '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>' +
    '<border><left/><right/><top/><bottom style="thin"><color rgb="FF94A3B8"/></bottom><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="10">' +
    xf(0) +
    xf(0, '', 1, 2, 1) +
    xf(0, right, 1, 2, 1) +
    xf(3) +
    xf(4) +
    xf(167) +
    xf(164) +
    xf(165) +
    xf(166) +
    xf(10) +
    '</cellXfs>' +
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
    '</styleSheet>'
  );
}

const isNumeric = (c: NormalizedColumn): boolean =>
  c.type === 'number' || c.type === 'currency' || c.type === 'percent';

/**
 * XLSX real (Office Open XML num ZIP próprio, sem compressão): uma planilha com cabeçalho
 * em negrito e congelado, autofiltro, larguras pelo conteúdo, textos em `sharedStrings`,
 * números com formato (`#,##0.00`, R$, %), datas como número de série com `dd/mm/yyyy`.
 * O nome da planilha vem de `sheetName` ou `title`.
 */
export function toXlsx(data: ExportData, options: ExportOptions = {}): Uint8Array {
  const { columns, rows } = normalize(data);
  if (columns.length > MAX_COLS) throw new RangeError(`XLSX aceita no máximo ${MAX_COLS} colunas.`);
  if (rows.length + 1 > MAX_ROWS) throw new RangeError(`XLSX aceita no máximo ${MAX_ROWS} linhas.`);

  const strings = new Map<string, number>();
  let stringRefs = 0;
  const shared = (text: string): number => {
    stringRefs += 1;
    let i = strings.get(text);
    if (i === undefined) {
      i = strings.size;
      strings.set(text, i);
    }
    return i;
  };

  // Formato dos números de cada coluna: inteiro, 2 casas ou quantas houver.
  const numberStyle = columns.map((col, c) => {
    if (col.type === 'currency') return STYLE.currency;
    if (col.type === 'percent') return STYLE.percent;
    let max = 0;
    for (const row of rows) {
      const cell = row[c];
      if (cell?.kind === 'number') max = Math.max(max, decimalsOf(cell.value));
    }
    return max === 0 ? STYLE.integer : max <= 2 ? STYLE.decimal2 : STYLE.decimalMany;
  });

  const widths = columns.map((col) => Array.from(col.label).length * 1.15);
  const rowsXml: string[] = [];

  const headerCells = columns
    .map(
      (col, c) =>
        `<c r="${columnLetters(c)}1" s="${isNumeric(col) ? STYLE.headerRight : STYLE.header}" t="s"><v>${shared(col.label)}</v></c>`,
    )
    .join('');
  rowsXml.push(`<row r="1">${headerCells}</row>`);

  rows.forEach((row, r) => {
    const ref = r + 2;
    const cells: string[] = [];
    row.forEach((cell, c) => {
      const col = columns[c];
      if (!col || cell.kind === 'empty') return;
      const at = `${columnLetters(c)}${ref}`;
      const view = cellText(cell, col.type, 'view');
      const longest = Math.max(...view.split(/\r\n|\r|\n/).map((line) => Array.from(line).length));
      widths[c] = Math.max(widths[c] ?? 0, longest);
      if (cell.kind === 'number') {
        cells.push(`<c r="${at}" s="${numberStyle[c] ?? 0}"><v>${cell.value}</v></c>`);
      } else if (cell.kind === 'date' && excelSerial(cell) >= FIRST_SAFE_SERIAL) {
        const style = cell.time ? STYLE.dateTime : STYLE.date;
        cells.push(`<c r="${at}" s="${style}"><v>${excelSerial(cell)}</v></c>`);
      } else {
        cells.push(`<c r="${at}" t="s"><v>${shared(view)}</v></c>`);
      }
    });
    rowsXml.push(`<row r="${ref}">${cells.join('')}</row>`);
  });

  const lastCol = columnLetters(Math.max(0, columns.length - 1));
  const range = `A1:${lastCol}${rows.length + 1}`;
  const colsXml =
    columns.length > 0
      ? `<cols>${columns
          .map((_, c) => {
            const w = Math.min(60, Math.max(8, Math.ceil((widths[c] ?? 0) + 2)));
            return `<col min="${c + 1}" max="${c + 1}" width="${w}" customWidth="1"/>`;
          })
          .join('')}</cols>`
      : '';

  const sheet =
    `${XML}<worksheet xmlns="${NS}" xmlns:r="${NS_R}">` +
    `<dimension ref="${range}"/>` +
    '<sheetViews><sheetView workbookViewId="0">' +
    '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>' +
    '<selection pane="bottomLeft" activeCell="A2" sqref="A2"/></sheetView></sheetViews>' +
    '<sheetFormatPr defaultRowHeight="15"/>' +
    `${colsXml}<sheetData>${rowsXml.join('')}</sheetData>` +
    (columns.length > 0 ? `<autoFilter ref="${range}"/>` : '') +
    '<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>' +
    '</worksheet>';

  const sharedXml =
    `${XML}<sst xmlns="${NS}" count="${stringRefs}" uniqueCount="${strings.size}">` +
    Array.from(strings.keys())
      .map((s) => `<si><t xml:space="preserve">${esc(s)}</t></si>`)
      .join('') +
    '</sst>';

  const name = sheetNameFor(options.sheetName ?? options.title);
  const quoted = `'${name.replace(/'/g, "''")}'`;
  const filterName =
    columns.length > 0
      ? `<definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">${esc(quoted)}!$A$1:$${lastCol}$${rows.length + 1}</definedName></definedNames>`
      : '';
  const workbook =
    `${XML}<workbook xmlns="${NS}" xmlns:r="${NS_R}"><bookViews><workbookView/></bookViews>` +
    `<sheets><sheet name="${esc(name)}" sheetId="1" r:id="rId1"/></sheets>${filterName}</workbook>`;

  const rel = (id: string, type: string, target: string) =>
    `<Relationship Id="${id}" Type="${NS_R}/${type}" Target="${target}"/>`;
  const SHEET = 'application/vnd.openxmlformats-officedocument.spreadsheetml';
  const encoder = new TextEncoder();
  const file = (name: string, text: string) => ({ name, data: encoder.encode(text) });

  return createZip(
    [
      file(
        '[Content_Types].xml',
        `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
          '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
          '<Default Extension="xml" ContentType="application/xml"/>' +
          `<Override PartName="/xl/workbook.xml" ContentType="${SHEET}.sheet.main+xml"/>` +
          `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="${SHEET}.worksheet+xml"/>` +
          `<Override PartName="/xl/styles.xml" ContentType="${SHEET}.styles+xml"/>` +
          `<Override PartName="/xl/sharedStrings.xml" ContentType="${SHEET}.sharedStrings+xml"/>` +
          '</Types>',
      ),
      file(
        '_rels/.rels',
        `${XML}<Relationships xmlns="${NS_PKG}">${rel('rId1', 'officeDocument', 'xl/workbook.xml')}</Relationships>`,
      ),
      file('xl/workbook.xml', workbook),
      file(
        'xl/_rels/workbook.xml.rels',
        `${XML}<Relationships xmlns="${NS_PKG}">` +
          rel('rId1', 'worksheet', 'worksheets/sheet1.xml') +
          rel('rId2', 'styles', 'styles.xml') +
          rel('rId3', 'sharedStrings', 'sharedStrings.xml') +
          '</Relationships>',
      ),
      file('xl/worksheets/sheet1.xml', sheet),
      file('xl/styles.xml', stylesXml()),
      file('xl/sharedStrings.xml', sharedXml),
    ],
    options.now ?? new Date(),
  );
}
