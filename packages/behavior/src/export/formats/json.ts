/**
 * Entrada `@eds-ui/behavior/export/json`: gera e baixa só o formato JSON, para carregar sob
 * demanda (`import()`) sem trazer os outros geradores.
 */
import { MIME, downloadFile } from '../download';
import { fileName } from '../model';
import { toJson } from '../json';
import type { ExportData, ExportOptions } from '../types';

export { toJson };
export type { ExportData, ExportOptions };

/** Gera JSON e entrega o arquivo ao usuário. Devolve o nome final (com extensão). */
export function exportFile(data: ExportData, options: ExportOptions = {}): string {
  const name = fileName(options.filename, 'json');
  downloadFile(toJson(data) as BlobPart, MIME.json, name);
  return name;
}
