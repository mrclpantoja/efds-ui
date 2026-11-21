import { HELVETICA, HELVETICA_BOLD, winAnsiCode } from './afm';
import { cellText, formatNow, msg, normalize, resolveLocale } from './model';
import type { ExportData, ExportOptions } from './types';

/**
 * PDF 1.4 gerado à mão: fontes padrão Helvetica e Helvetica-Bold (`WinAnsiEncoding`, sem
 * embutir fonte). Acentos do português funcionam; qualquer caractere fora do WinAnsi
 * (emoji, ideogramas, aspas tipográficas fora do CP1252...) vira `?`. A4 retrato, ou paisagem
 * quando a largura natural da tabela passa da do retrato.
 */

const A4_W = 595.28;
const A4_H = 841.89;
const MARGIN = 36;
const FOOTER = 22;
const PAD_X = 4;
const PAD_Y = 3.5;
const TITLE_SIZE = 15;
const SUBTITLE_SIZE = 10;
const NOTE_SIZE = 8;

type Codes = number[];

/** Texto -> parágrafos de códigos WinAnsi (quebras de linha do texto viram parágrafos). */
function paragraphs(text: string): Codes[] {
  return text.split(/\r\n|\r|\n/).map((line) => {
    const codes: Codes = [];
    for (const ch of line) codes.push(winAnsiCode(ch.codePointAt(0) ?? 63));
    return codes;
  });
}

const widthOf = (codes: readonly number[], bold: boolean): number => {
  const table = bold ? HELVETICA_BOLD : HELVETICA;
  let w = 0;
  for (const c of codes) w += table[c] ?? 556;
  return w;
};

const points = (codes: readonly number[], bold: boolean, size: number): number =>
  (widthOf(codes, bold) * size) / 1000;

function splitWords(codes: readonly number[]): Codes[] {
  const words: Codes[] = [];
  let cur: Codes = [];
  for (const c of codes) {
    if (c === 32) {
      if (cur.length > 0) words.push(cur);
      cur = [];
    } else cur.push(c);
  }
  if (cur.length > 0) words.push(cur);
  return words;
}

/** Quebra um parágrafo em linhas de no máximo `maxW` pontos; palavra maior que a coluna é cortada. */
function wrap(codes: readonly number[], maxW: number, bold: boolean, size: number): Codes[] {
  const words = splitWords(codes);
  if (words.length === 0) return [[]];
  const space = points([32], bold, size);
  const lines: Codes[] = [];
  let cur: Codes = [];
  let curW = 0;

  const place = (word: Codes) => {
    const w = points(word, bold, size);
    if (w <= maxW) {
      cur = [...word];
      curW = w;
      return;
    }
    let chunk: Codes = [];
    let cw = 0;
    for (const c of word) {
      const charW = points([c], bold, size);
      if (cw + charW > maxW && chunk.length > 0) {
        lines.push(chunk);
        chunk = [];
        cw = 0;
      }
      chunk.push(c);
      cw += charW;
    }
    cur = chunk;
    curW = cw;
  };

  for (const word of words) {
    if (cur.length === 0) {
      place(word);
      continue;
    }
    const w = points(word, bold, size);
    if (curW + space + w <= maxW) {
      cur.push(32, ...word);
      curW += space + w;
    } else {
      lines.push(cur);
      cur = [];
      curW = 0;
      place(word);
    }
  }
  if (cur.length > 0) lines.push(cur);
  return lines;
}

const wrapText = (text: string, maxW: number, bold: boolean, size: number): Codes[] =>
  paragraphs(text).flatMap((p) => wrap(p, maxW, bold, size));

const hex = (codes: readonly number[]): string =>
  codes.map((c) => c.toString(16).padStart(2, '0')).join('');

/** Número para o fluxo de conteúdo: até 2 casas, sem zeros à direita. */
const num = (n: number): string => String(Math.round(n * 100) / 100);

interface Layout {
  landscape: boolean;
  pageW: number;
  pageH: number;
  size: number;
  lineH: number;
  colW: number[];
}

interface RowLayout {
  lines: Codes[][];
  height: number;
}

/** Larguras de coluna: naturais, depois comprimidas até a menor largura (palavra mais longa). */
function columnWidths(
  heads: Codes[],
  cells: Codes[][][],
  size: number,
  avail: number,
): { natural: number[]; widths: number[]; fits: boolean } {
  const cols = heads.length;
  const natural: number[] = [];
  const min: number[] = [];
  for (let c = 0; c < cols; c += 1) {
    let nat = points(heads[c] ?? [], true, size);
    let mn = Math.max(0, ...splitWords(heads[c] ?? []).map((w) => points(w, true, size)));
    for (const row of cells) {
      for (const para of row[c] ?? []) {
        nat = Math.max(nat, points(para, false, size));
        for (const w of splitWords(para)) mn = Math.max(mn, points(w, false, size));
      }
    }
    natural.push(nat + 2 * PAD_X);
    min.push(Math.min(mn + 2 * PAD_X, nat + 2 * PAD_X));
  }
  const sumNat = natural.reduce((a, b) => a + b, 0);
  if (sumNat <= avail) {
    // Cabe: reparte a sobra proporcionalmente, para a tabela ocupar a largura útil.
    const extra = avail - sumNat;
    return {
      natural,
      widths: natural.map((w) => w + (sumNat > 0 ? (extra * w) / sumNat : 0)),
      fits: true,
    };
  }
  const sumMin = min.reduce((a, b) => a + b, 0);
  if (sumMin >= avail) {
    return { natural, widths: min.map((w) => (w * avail) / sumMin), fits: sumMin === avail };
  }
  const room = avail - sumMin;
  const grow = natural.map((w, i) => w - (min[i] ?? 0));
  const sumGrow = grow.reduce((a, b) => a + b, 0);
  return {
    natural,
    widths: min.map((w, i) => w + (sumGrow > 0 ? (room * (grow[i] ?? 0)) / sumGrow : 0)),
    fits: true,
  };
}

/** PDF da tabela, como bytes. */
export function toPdf(data: ExportData, options: ExportOptions = {}): Uint8Array {
  const { columns, rows } = normalize(data);
  const now = options.now ?? new Date();
  const locale = resolveLocale(options.locale);
  const cols = columns.length;
  const numeric = columns.map(
    (c) => c.type === 'number' || c.type === 'currency' || c.type === 'percent',
  );

  const heads = columns.map((c) => paragraphs(c.label.replace(/\s+/g, ' '))[0] ?? []);
  const texts = rows.map((row) =>
    row.map((cell, c) => paragraphs(cellText(cell, columns[c]?.type ?? 'text', 'view', locale))),
  );

  // Escolha de orientação: paisagem se a largura natural passa da útil do retrato.
  let size = 8.5;
  const portraitAvail = A4_W - 2 * MARGIN;
  let first = columnWidths(heads, texts, size, portraitAvail);
  const landscape = first.natural.reduce((a, b) => a + b, 0) > portraitAvail;
  const pageW = landscape ? A4_H : A4_W;
  const pageH = landscape ? A4_W : A4_H;
  const avail = pageW - 2 * MARGIN;
  first = columnWidths(heads, texts, size, avail);
  if (!first.fits) {
    // Colunas demais para a página: reduz a fonte uma vez.
    size = 7;
    first = columnWidths(heads, texts, size, avail);
  }
  const layout: Layout = {
    landscape,
    pageW,
    pageH,
    size,
    lineH: size * 1.3,
    colW: first.widths,
  };
  const { lineH } = layout;
  const colX: number[] = [];
  {
    let x = MARGIN;
    for (const w of layout.colW) {
      colX.push(x);
      x += w;
    }
  }
  const tableW = layout.colW.reduce((a, b) => a + b, 0);

  // ---- Bloco de título (só na primeira página) ---------------------------------------------
  const titleLines = options.title ? wrapText(options.title, avail, true, TITLE_SIZE) : [];
  const subtitleLines = options.subtitle
    ? wrapText(options.subtitle, avail, false, SUBTITLE_SIZE)
    : [];
  const generated = wrapText(
    msg('exportGeneratedAt', { date: formatNow(now, locale) }),
    avail,
    false,
    NOTE_SIZE,
  );
  const blockH =
    titleLines.length * TITLE_SIZE * 1.3 +
    subtitleLines.length * SUBTITLE_SIZE * 1.3 +
    generated.length * NOTE_SIZE * 1.3 +
    12;

  // ---- Linhas: quebra pela largura da coluna -----------------------------------------------
  const headLines = heads.map((h, c) => wrap(h, (layout.colW[c] ?? 0) - 2 * PAD_X, true, size));
  const headH = Math.max(1, ...headLines.map((l) => l.length)) * lineH + 2 * PAD_Y;
  const bodyTop = MARGIN; // topo útil de páginas sem título
  const bodyBottom = pageH - MARGIN - FOOTER;
  const maxLinesPerPage = Math.max(
    1,
    Math.floor((bodyBottom - bodyTop - headH - 2 * PAD_Y) / lineH),
  );

  const laid: RowLayout[] = texts.map((row) => {
    const lines = row.map((paras, c) =>
      paras.flatMap((p) => wrap(p, (layout.colW[c] ?? 0) - 2 * PAD_X, false, size)),
    );
    let count = Math.max(1, ...lines.map((l) => l.length));
    if (count > maxLinesPerPage) {
      // Linha maior que uma página: corta e termina com reticências (0x85).
      count = maxLinesPerPage;
      for (const cell of lines) {
        if (cell.length > count) {
          cell.length = count;
          const last = cell[count - 1] ?? [];
          cell[count - 1] = [...last.slice(0, Math.max(0, last.length - 1)), 0x85];
        }
      }
    }
    return { lines, height: count * lineH + 2 * PAD_Y };
  });

  // ---- Paginação ---------------------------------------------------------------------------
  interface Page {
    tableTop: number;
    items: { row: number; top: number }[];
    bottom: number;
  }
  const pages: Page[] = [];
  let page: Page = { tableTop: MARGIN + blockH, items: [], bottom: MARGIN + blockH + headH };
  pages.push(page);
  laid.forEach((row, i) => {
    if (page.bottom + row.height > bodyBottom && page.items.length > 0) {
      page = { tableTop: MARGIN, items: [], bottom: MARGIN + headH };
      pages.push(page);
    }
    page.items.push({ row: i, top: page.bottom });
    page.bottom += row.height;
  });
  if (rows.length === 0) page.bottom += lineH + 2 * PAD_Y;

  // ---- Fluxo de conteúdo de cada página ----------------------------------------------------
  const total = pages.length;
  const contents = pages.map((pg, pageIndex) => {
    const ops: string[] = [];
    const y = (top: number) => pageH - top;
    const text = (font: 1 | 2, fs: number, gray: number, x: number, top: number, codes: Codes) => {
      if (codes.length === 0) return;
      ops.push(
        `BT /F${font} ${num(fs)} Tf ${num(gray)} g ${num(x)} ${num(y(top))} Td <${hex(codes)}> Tj ET`,
      );
    };

    // Título, subtítulo e data de geração.
    if (pageIndex === 0) {
      let top = MARGIN;
      for (const line of titleLines) {
        text(2, TITLE_SIZE, 0.1, MARGIN, top + TITLE_SIZE * 0.95, line);
        top += TITLE_SIZE * 1.3;
      }
      for (const line of subtitleLines) {
        text(1, SUBTITLE_SIZE, 0.3, MARGIN, top + SUBTITLE_SIZE * 0.95, line);
        top += SUBTITLE_SIZE * 1.3;
      }
      for (const line of generated) {
        text(1, NOTE_SIZE, 0.4, MARGIN, top + NOTE_SIZE * 0.95, line);
        top += NOTE_SIZE * 1.3;
      }
    }

    // Faixas: cabeçalho e linhas zebradas.
    ops.push(
      `0.91 g ${num(MARGIN)} ${num(y(pg.tableTop + headH))} ${num(tableW)} ${num(headH)} re f`,
    );
    for (const item of pg.items) {
      if (item.row % 2 === 1) {
        const h = laid[item.row]?.height ?? 0;
        ops.push(`0.965 g ${num(MARGIN)} ${num(y(item.top + h))} ${num(tableW)} ${num(h)} re f`);
      }
    }

    // Grade fina.
    ops.push('0.78 G 0.4 w');
    const hLines = [
      pg.tableTop,
      pg.tableTop + headH,
      ...pg.items.map((it) => it.top + (laid[it.row]?.height ?? 0)),
    ];
    for (const top of hLines)
      ops.push(`${num(MARGIN)} ${num(y(top))} m ${num(MARGIN + tableW)} ${num(y(top))} l S`);
    const vBottom = pg.bottom;
    for (let c = 0; c <= cols; c += 1) {
      const x = c === cols ? MARGIN + tableW : (colX[c] ?? MARGIN);
      ops.push(`${num(x)} ${num(y(pg.tableTop))} m ${num(x)} ${num(y(vBottom))} l S`);
    }

    // Cabeçalho.
    heads.forEach((_, c) => {
      (headLines[c] ?? []).forEach((line, j) => {
        const w = points(line, true, size);
        const x = numeric[c]
          ? (colX[c] ?? 0) + (layout.colW[c] ?? 0) - PAD_X - w
          : (colX[c] ?? 0) + PAD_X;
        text(2, size, 0.1, x, pg.tableTop + PAD_Y + size * 0.82 + j * lineH, line);
      });
    });

    // Linhas.
    for (const item of pg.items) {
      const row = laid[item.row];
      const cells = rows[item.row];
      if (!row || !cells) continue;
      row.lines.forEach((cellLines, c) => {
        const right = numeric[c] === true && cells[c]?.kind === 'number';
        cellLines.forEach((line, j) => {
          const w = points(line, false, size);
          const x = right
            ? (colX[c] ?? 0) + (layout.colW[c] ?? 0) - PAD_X - w
            : (colX[c] ?? 0) + PAD_X;
          text(1, size, 0.12, x, item.top + PAD_Y + size * 0.82 + j * lineH, line);
        });
      });
    }
    if (rows.length === 0) {
      const line = wrapText(msg('exportNoRows'), tableW - 2 * PAD_X, false, size)[0] ?? [];
      text(1, size, 0.35, MARGIN + PAD_X, pg.tableTop + headH + PAD_Y + size * 0.82, line);
    }

    // Rodapé.
    const footer =
      wrapText(msg('exportPage', { page: pageIndex + 1, total }), avail, false, NOTE_SIZE)[0] ?? [];
    const fw = points(footer, false, NOTE_SIZE);
    text(1, NOTE_SIZE, 0.4, pageW - MARGIN - fw, pageH - MARGIN + 4, footer);
    return ops.join('\n');
  });

  // ---- Montagem do arquivo -----------------------------------------------------------------
  // Tudo ASCII, menos o comentário binário do cabeçalho (bytes > 127 em Latin-1).
  const chunks: string[] = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (s: string) => {
    chunks.push(s);
    length += s.length;
  };
  const object = (id: number, body: string) => {
    offsets[id] = length;
    push(`${id} 0 obj\n${body}\nendobj\n`);
  };

  push('%PDF-1.4\n%âãÏÓ\n');
  const pageIds = pages.map((_, i) => 6 + 2 * i);
  object(1, `<< /Type /Catalog /Pages 2 0 R /Lang (${locale}) >>`);
  object(
    2,
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${total} >>`,
  );
  object(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  object(
    4,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
  );
  const p2 = (n: number) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}${p2(now.getMonth() + 1)}${p2(now.getDate())}${p2(now.getHours())}${p2(now.getMinutes())}${p2(now.getSeconds())}`;
  const rawTitle = options.title ?? '';
  const title = rawTitle
    ? ` /Title <FEFF${Array.from({ length: rawTitle.length }, (_, i) => rawTitle.charCodeAt(i).toString(16).padStart(4, '0')).join('')}>`
    : '';
  object(5, `<<${title} /Creator (efDS.ui) /Producer (efDS.ui) /CreationDate (D:${stamp}) >>`);
  pages.forEach((_, i) => {
    const id = pageIds[i] ?? 0;
    object(
      id,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(pageW)} ${num(pageH)}] ` +
        `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${id + 1} 0 R >>`,
    );
    const stream = contents[i] ?? '';
    object(id + 1, `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  });

  const count = 6 + 2 * pages.length;
  const xrefAt = length;
  let xref = `xref\n0 ${count}\n0000000000 65535 f \n`;
  for (let id = 1; id < count; id += 1) {
    xref += `${String(offsets[id] ?? 0).padStart(10, '0')} 00000 n \n`;
  }
  push(xref);
  push(`trailer\n<< /Size ${count} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`);

  const out = new Uint8Array(length);
  let pos = 0;
  for (const chunk of chunks) {
    for (let i = 0; i < chunk.length; i += 1) out[pos++] = chunk.charCodeAt(i) & 0xff;
  }
  return out;
}
