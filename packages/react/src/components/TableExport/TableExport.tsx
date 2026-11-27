import { forwardRef, useRef, type ReactNode } from 'react';
import {
  datedFileName,
  format as fillTemplate,
  getMessages,
  type ExportData,
  type ExportFormat,
  type ExportOptions,
} from '@efds-ui/behavior/export';
import { useAnnouncer } from '../../internal/announcer';
import { DownloadGlyph } from '../../internal/glyphs-h';
import { Button, type ButtonSize, type ButtonVariant } from '../Button';
import { Dropdown, DropdownItem } from '../Dropdown';
import { useLocale } from '../Locale';

const DEFAULT_LABELS: Record<ExportFormat, string> = {
  csv: 'CSV',
  xlsx: 'Excel (.xlsx)',
  json: 'JSON',
  pdf: 'PDF',
};

/**
 * Cada gerador é carregado só quando o formato é pedido (`import()`): quem exporta só CSV não
 * baixa o código do XLSX e do PDF. O primeiro hover/foco no item já começa a carregar.
 */
type FormatModule = { exportFile: (data: ExportData, options?: ExportOptions) => string };
const FORMAT_LOADERS: Record<ExportFormat, () => Promise<FormatModule>> = {
  csv: () => import('@efds-ui/behavior/export/csv'),
  xlsx: () => import('@efds-ui/behavior/export/xlsx'),
  json: () => import('@efds-ui/behavior/export/json'),
  pdf: () => import('@efds-ui/behavior/export/pdf'),
};
const preload = (fmt: ExportFormat) => {
  FORMAT_LOADERS[fmt]().catch(() => undefined);
};

const ALL_FORMATS: readonly ExportFormat[] = ['csv', 'xlsx', 'json', 'pdf'];

/**
 * Textos do botão, do menu e do anúncio. `{name}` e `{count}` são substituídos. Os do anúncio
 * (`done`, `doneOne`, `empty`, `failed`) têm por padrão os do `@efds-ui/behavior` (pt-BR).
 */
export interface TableExportTexts {
  /** Texto do botão. Padrão: "Exportar". */
  label: ReactNode;
  /** Itens do menu. Padrão: "CSV", "Excel (.xlsx)", "JSON", "PDF". */
  csv: string;
  xlsx: string;
  json: string;
  pdf: string;
  /** "Arquivo {name} gerado ({count} linhas)." */
  done: string;
  /** Uma linha só: "Arquivo {name} gerado (1 linha)." */
  doneOne: string;
  /** Sem linhas para exportar. */
  empty: string;
  /** Falha ao gerar o arquivo. */
  failed: string;
}

export interface TableExportBeforeInfo {
  format: ExportFormat;
  /** Nome final do arquivo, com extensão. */
  filename: string;
}

export interface TableExportDoneInfo extends TableExportBeforeInfo {
  /** Linhas gravadas no arquivo (depois do `onBeforeExport`). */
  count: number;
}

interface TableExportOwnProps {
  /** Formatos oferecidos, na ordem do menu. Padrão: `csv`, `xlsx`, `json`, `pdf`. */
  formats?: readonly ExportFormat[];
  /** Nome do arquivo, sem extensão; ganha `-aaaa-mm-dd` e a extensão. Padrão: `tabela`. */
  filename?: string;
  /** Título (PDF: cabeçalho; XLSX: nome da planilha). */
  title?: string;
  /** Subtítulo do PDF. */
  subtitle?: string;
  /** Nome da planilha do XLSX. */
  sheetName?: string;
  /**
   * Última chance de alterar ou barrar a exportação: devolva os dados (por exemplo, com o CPF
   * mascarado ou sem colunas sensíveis), `false` para cancelar, ou nada para exportar como está.
   * Use também para registrar quem exportou o quê.
   */
  onBeforeExport?: (data: ExportData, info: TableExportBeforeInfo) => ExportData | false | void;
  /** Depois de o arquivo ser gerado e entregue ao navegador. */
  onExport?: (info: TableExportDoneInfo) => void;
  /** Textos do botão, do menu e do anúncio de resultado (padrões em pt-BR). */
  texts?: Partial<TableExportTexts>;
  /** Locale das datas e dos números do arquivo. Padrão: o do `LocaleProvider` (`pt-BR`). */
  locale?: string;
  /** Padrão: `secondary`. */
  variant?: ButtonVariant;
  /** Padrão: `md`. */
  size?: ButtonSize;
  disabled?: boolean;
  /** Classe do botão. */
  className?: string;
}

/** A fonte é estado do React, não o DOM: passe os dados prontos ou uma função que os devolve. */
export type TableExportProps = TableExportOwnProps &
  ({ data: ExportData; getData?: undefined } | { getData: () => ExportData; data?: undefined });

/**
 * Botão "Exportar" com menu (Dropdown, padrão disclosure) para baixar a tabela em CSV, Excel
 * (.xlsx), JSON ou PDF, gerados no navegador, sem dependência. O `ref` vai para o botão.
 * O resultado é anunciado em uma região `role="status"`.
 */
export const TableExport = forwardRef<HTMLButtonElement, TableExportProps>(function TableExport(
  {
    data,
    getData,
    formats = ALL_FORMATS,
    filename = 'tabela',
    title,
    subtitle,
    sheetName,
    onBeforeExport,
    onExport,
    texts,
    locale: localeProp,
    variant = 'secondary',
    size = 'md',
    disabled = false,
    className,
  },
  ref,
) {
  const { text: status, announce } = useAnnouncer();
  const contextLocale = useLocale();
  const locale = localeProp ?? contextLocale;
  // Sempre a versão mais recente das props, sem recriar os itens do menu.
  const latest = useRef({ data, getData, onBeforeExport, onExport });
  latest.current = { data, getData, onBeforeExport, onExport };

  const run = async (fmt: ExportFormat) => {
    const m = getMessages();
    const words = {
      done: texts?.done ?? m.exportDone,
      doneOne: texts?.doneOne ?? m.exportDoneOne,
      empty: texts?.empty ?? m.exportEmpty,
      failed: texts?.failed ?? m.exportFailed,
    };
    let source: ExportData | undefined;
    try {
      source = latest.current.getData ? latest.current.getData() : latest.current.data;
    } catch {
      announce(words.failed);
      return;
    }
    if (!source || source.rows.length === 0) {
      announce(words.empty);
      return;
    }
    // Mesma regra do HTML: `nome-aaaa-mm-dd.ext`.
    const finalName = datedFileName(filename, fmt);
    let finalData: ExportData = source;
    try {
      const result = latest.current.onBeforeExport?.(source, { format: fmt, filename: finalName });
      if (result === false) return;
      if (result) finalData = result;
      if (finalData.rows.length === 0) {
        announce(words.empty);
        return;
      }
      const { exportFile } = await FORMAT_LOADERS[fmt]();
      exportFile(finalData, { filename: finalName, title, subtitle, sheetName, locale });
    } catch {
      announce(words.failed);
      return;
    }
    const count = finalData.rows.length;
    latest.current.onExport?.({ format: fmt, filename: finalName, count });
    announce(
      count === 1
        ? fillTemplate(words.doneOne, { name: finalName })
        : fillTemplate(words.done, { name: finalName, count }),
    );
  };

  const shown = formats.filter((f, i) => ALL_FORMATS.includes(f) && formats.indexOf(f) === i);

  return (
    <>
      <Dropdown
        trigger={
          <Button ref={ref} variant={variant} size={size} disabled={disabled} className={className}>
            <DownloadGlyph />
            {texts?.label ?? 'Exportar'}
          </Button>
        }
      >
        {shown.map((fmt) => (
          <DropdownItem
            key={fmt}
            onClick={() => void run(fmt)}
            onPointerEnter={() => preload(fmt)}
            onFocus={() => preload(fmt)}
          >
            {texts?.[fmt] ?? DEFAULT_LABELS[fmt]}
          </DropdownItem>
        ))}
      </Dropdown>
      <span role="status" className="eds-visually-hidden">
        {status}
      </span>
    </>
  );
});
TableExport.displayName = 'TableExport';
