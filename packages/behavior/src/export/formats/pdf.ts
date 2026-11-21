/**
 * Entrada `@efds-ui/behavior/export/pdf`: gera e baixa só o formato PDF, para carregar sob
 * demanda (`import()`) sem trazer os outros geradores.
 */
import { MIME, downloadFile } from '../download';
import { fileName } from '../model';
import { toPdf } from '../pdf';
import type { ExportData, ExportOptions } from '../types';

export { toPdf };
export type { ExportData, ExportOptions };

/** Gera PDF e entrega o arquivo ao usuário. Devolve o nome final (com extensão). */
export function exportFile(data: ExportData, options: ExportOptions = {}): string {
  const name = fileName(options.filename, 'pdf');
  downloadFile(toPdf(data, options) as BlobPart, MIME.pdf, name);
  return name;
}
