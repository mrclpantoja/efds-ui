import { MIME, downloadFile } from './download';
import { toCsv } from './csv';
import { toJson } from './json';
import { fileName } from './model';
import { toPdf } from './pdf';
import { toXlsx } from './xlsx';
import type { ExportData, ExportFormat, ExportOptions } from './types';

export { MIME, downloadFile };
export { toCsv, toJson, toPdf, toXlsx };
export type {
  ExportColumn,
  ExportColumnType,
  ExportData,
  ExportFormat,
  ExportOptions,
} from './types';

/** Gera o conteúdo do formato: texto (CSV, JSON) ou bytes (XLSX, PDF). */
export function generate(
  data: ExportData,
  format: ExportFormat,
  options: ExportOptions = {},
): string | Uint8Array {
  switch (format) {
    case 'csv':
      return toCsv(data, options);
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
