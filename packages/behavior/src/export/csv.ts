import { cellText, normalize } from './model';
import type { ExportData } from './types';

const SEPARATOR = ';';
/** Marca de ordem de bytes UTF-8: o Excel só reconhece os acentos com ela. */
const BOM = String.fromCharCode(0xfeff);

/**
 * Proteção contra injeção de fórmula (CSV injection): texto que começa com `=`, `+`, `-`, `@`,
 * tabulação ou retorno de carro ganha um `'` na frente, que o Excel e o LibreOffice mostram
 * como texto. Vale só para texto: números e datas já saem formatados (um número negativo
 * `-3,5` não é alterado).
 */
export function guardFormula(text: string): string {
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}

function field(text: string): string {
  return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * CSV para o Excel em português: separador `;`, BOM UTF-8, quebra CRLF, aspas duplicadas,
 * números com vírgula decimal e sem milhar, datas `dd/mm/aaaa`. Devolve texto (com o BOM).
 */
export function toCsv(data: ExportData): string {
  const { columns, rows } = normalize(data);
  const lines: string[] = [];
  lines.push(columns.map((c) => field(guardFormula(c.label))).join(SEPARATOR));
  for (const row of rows) {
    lines.push(
      row
        .map((cell, i) => {
          const text = cellText(cell, columns[i]?.type ?? 'text', 'csv');
          return field(cell.kind === 'text' ? guardFormula(text) : text);
        })
        .join(SEPARATOR),
    );
  }
  return `${BOM}${lines.join('\r\n')}\r\n`;
}
