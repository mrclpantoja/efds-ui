/** Tipos públicos da exportação de tabelas. Sem DOM: valem em Node e em qualquer framework. */

export type ExportFormat = 'csv' | 'json' | 'xlsx' | 'pdf';

/**
 * Tipo da coluna. `percent` guarda pontos percentuais (12,5 = 12,5%); `currency` usa R$.
 * Sem `type`, o tipo vem do primeiro valor preenchido (número, data ou texto).
 */
export type ExportColumnType = 'text' | 'number' | 'currency' | 'date' | 'percent';

export interface ExportColumn {
  /** Chave do valor em cada linha (e do objeto no JSON). */
  key: string;
  /** Texto do cabeçalho. */
  label: string;
  type?: ExportColumnType;
}

export interface ExportData {
  columns: ExportColumn[];
  rows: Record<string, unknown>[];
}

export interface ExportOptions {
  /** Nome do arquivo; a extensão é acrescentada (ou mantida, se já for a do formato). */
  filename?: string;
  /** Título (PDF: cabeçalho da primeira página; XLSX: nome da planilha, se não houver `sheetName`). */
  title?: string;
  /** Subtítulo do PDF. */
  subtitle?: string;
  /** Nome da planilha do XLSX (máximo de 31 caracteres, sem `[ ] : * ? / \`). */
  sheetName?: string;
  /** Locale BCP 47 de datas e números (e do `/Lang` do PDF). Padrão: o de `configure({ locale })` (pt-BR). */
  locale?: string;
  /** Instante de "Gerado em" e da data dos arquivos. Padrão: agora. Útil em testes. */
  now?: Date;
}
