/**
 * Entrada `@efds-ui/behavior/export/xlsx`: gera e baixa só o formato XLSX, para carregar sob
 * demanda (`import()`) sem trazer os outros geradores.
 */
import { MIME, downloadFile } from '../download';
import { fileName } from '../model';
import { toXlsx } from '../xlsx';
import type { ExportData, ExportOptions } from '../types';

export { toXlsx };
export type { ExportData, ExportOptions };

/** Gera XLSX e entrega o arquivo ao usuário. Devolve o nome final (com extensão). */
export function exportFile(data: ExportData, options: ExportOptions = {}): string {
  const name = fileName(options.filename, 'xlsx');
  downloadFile(toXlsx(data, options) as BlobPart, MIME.xlsx, name);
  return name;
}
