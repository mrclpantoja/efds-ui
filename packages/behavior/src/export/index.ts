import { toCsv } from './csv';
import { toJson } from './json';
import { fileName } from './model';
import { toPdf } from './pdf';
import { toXlsx } from './xlsx';
import type { ExportData, ExportFormat, ExportOptions } from './types';

export { toCsv, toJson, toPdf, toXlsx };
export type {
  ExportColumn,
  ExportColumnType,
  ExportData,
  ExportFormat,
  ExportOptions,
} from './types';

export const MIME: Record<ExportFormat, string> = {
  csv: 'text/csv;charset=utf-8',
  json: 'application/json;charset=utf-8',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
};

/** Gera o conteúdo do formato: texto (CSV, JSON) ou bytes (XLSX, PDF). */
export function generate(
  data: ExportData,
  format: ExportFormat,
  options: ExportOptions = {},
): string | Uint8Array {
  switch (format) {
    case 'csv':
      return toCsv(data);
    case 'json':
      return toJson(data);
    case 'xlsx':
      return toXlsx(data, options);
    case 'pdf':
      return toPdf(data, options);
    default:
      throw new TypeError(`Formato de exportação desconhecido: ${String(format)}`);
  }
}

/** Entrega o arquivo ao usuário (Blob + `<a download>`) e libera a URL depois. */
export function downloadFile(content: BlobPart, mime: string, name: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Gera `data` no `format` e baixa o arquivo. Devolve o nome final (com extensão).
 * Só o navegador: as funções `toCsv`, `toJson`, `toXlsx` e `toPdf` não tocam o DOM.
 */
export function exportData(
  data: ExportData,
  format: ExportFormat,
  options: ExportOptions = {},
): string {
  const name = fileName(options.filename, format);
  const content = generate(data, format, options);
  downloadFile(content as BlobPart, MIME[format], name);
  return name;
}
