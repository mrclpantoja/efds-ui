import type { ExportFormat } from './types';

export const MIME: Record<ExportFormat, string> = {
  csv: 'text/csv;charset=utf-8',
  json: 'application/json;charset=utf-8',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
};

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
