/**
 * Entrada `@eds-ui/behavior/export/csv`: gera e baixa só o formato CSV, para carregar sob
 * demanda (`import()`) sem trazer os outros geradores.
 */
import { MIME, downloadFile } from '../download';
import { fileName } from '../model';
import { toCsv } from '../csv';
import type { ExportData, ExportOptions } from '../types';

export { toCsv };
export type { ExportData, ExportOptions };

/** Gera CSV e entrega o arquivo ao usuário. Devolve o nome final (com extensão). */
export function exportFile(data: ExportData, options: ExportOptions = {}): string {
  const name = fileName(options.filename, 'csv');
  downloadFile(toCsv(data, options) as BlobPart, MIME.csv, name);
  return name;
}
