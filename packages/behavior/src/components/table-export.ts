import { format, getMessages } from '../core/config';
import { emit, hidePopover } from '../core/dom';
import { bindAll, type Behavior } from '../core/registry';
import { createAnnouncer, type Announcer } from '../core/status';
import { statusRegion } from '../core/table-hub';
import { MIME, downloadFile, generate } from '../export';
import { datedFileName } from '../export/model';
import type {
  ExportColumn,
  ExportColumnType,
  ExportData,
  ExportFormat,
  ExportOptions,
} from '../export';

export type ExportScope = 'auto' | 'visible' | 'selected' | 'all';

const FORMATS: readonly ExportFormat[] = ['csv', 'xlsx', 'json', 'pdf'];
const SCOPES: readonly ExportScope[] = ['auto', 'visible', 'selected', 'all'];
const TYPES: readonly ExportColumnType[] = ['text', 'number', 'currency', 'date', 'percent'];
const IGNORE = 'data-eds-export-ignore';

const clean = (text: string | null | undefined): string => (text ?? '').replace(/\s+/g, ' ').trim();

/** Texto sem acento, em minúsculas, com `-`: nome de arquivo e chave de coluna. */
function slug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const isEmptyRow = (row: HTMLTableRowElement): boolean =>
  row.hasAttribute('data-eds-filter-empty') || row.querySelector('.eds-table-empty') !== null;

const isHidden = (row: HTMLTableRowElement): boolean =>
  Boolean(row.hidden) || row.closest('[hidden]') !== null;

const isChecked = (row: HTMLTableRowElement): boolean =>
  row.querySelector<HTMLInputElement>('input[data-eds-select-row]')?.checked === true;

/** Linhas de dados do `tbody` (sem a linha de "vazio" e sem `data-eds-export-ignore`). */
function dataRows(table: HTMLTableElement): HTMLTableRowElement[] {
  return Array.from(table.tBodies)
    .flatMap((body) => Array.from(body.rows))
    .filter((row) => !isEmptyRow(row) && !row.hasAttribute(IGNORE));
}

function headerCells(table: HTMLTableElement): HTMLTableCellElement[] {
  const head = table.tHead?.rows;
  const row = head && head.length > 0 ? head[head.length - 1] : table.rows[0];
  return row ? Array.from(row.cells) : [];
}

/** Coluna de seleção ou de ações: nunca entra no arquivo. */
const isAutoIgnored = (th: HTMLTableCellElement): boolean =>
  th.hasAttribute(IGNORE) ||
  th.classList.contains('eds-table-check') ||
  th.classList.contains('eds-table-actions') ||
  th.querySelector('input[type="checkbox"]') !== null;

export interface CollectResult {
  data: ExportData;
  /** Escopo efetivo (`auto` vira `selected` ou `visible`). */
  scope: Exclude<ExportScope, 'auto'>;
}

/**
 * Lê a tabela do DOM: colunas de `thead th` (menos seleção, ações e `data-eds-export-ignore`),
 * valor da célula em `data-value` ou no texto, tipo em `th[data-type]`. Só vê o que está no DOM.
 */
export function collectTable(
  table: HTMLTableElement,
  scope: ExportScope = 'auto',
  includeHidden = false,
): CollectResult {
  // Colunas ocultas pelo usuário ficam de fora (`data-eds-export-hidden-columns` inclui tudo); a
  // ordem é a visual, porque reordenar move as células no DOM.
  const ths = headerCells(table).filter(
    (th) => !isAutoIgnored(th) && (includeHidden || !th.hidden),
  );
  const used = new Set<string>();
  const columns: (ExportColumn & { index: number })[] = ths.map((th, n) => {
    const label = clean(th.textContent);
    const typeAttr = th.getAttribute('data-type') as ExportColumnType | null;
    const type: ExportColumnType | undefined =
      typeAttr && TYPES.includes(typeAttr)
        ? typeAttr
        : th.classList.contains('eds-table-num')
          ? 'number'
          : undefined;
    const base = th.getAttribute('data-key') || slug(label) || `col${n + 1}`;
    let key = base;
    for (let i = 2; used.has(key); i += 1) key = `${base}-${i}`;
    used.add(key);
    return { key, label, type, index: th.cellIndex };
  });

  const all = dataRows(table);
  const checked = all.filter(isChecked);
  const effective: CollectResult['scope'] =
    scope === 'auto' ? (checked.length > 0 ? 'selected' : 'visible') : scope;
  const chosen =
    effective === 'selected'
      ? checked
      : effective === 'visible'
        ? all.filter((row) => !isHidden(row))
        : all;

  const rows = chosen.map((row) => {
    const record: Record<string, unknown> = {};
    for (const col of columns) {
      const cell = row.cells[col.index];
      if (!cell || cell.hasAttribute(IGNORE)) {
        record[col.key] = '';
        continue;
      }
      const raw = cell.getAttribute('data-value');
      if (raw !== null) {
        const numeric = col.type === 'number' || col.type === 'currency' || col.type === 'percent';
        record[col.key] =
          numeric && raw.trim() !== '' && Number.isFinite(Number(raw)) ? Number(raw) : raw;
      } else record[col.key] = clean(cell.textContent);
    }
    return record;
  });

  return {
    data: { columns: columns.map(({ key, label, type }) => ({ key, label, type })), rows },
    scope: effective,
  };
}

function resolveTable(trigger: HTMLElement): HTMLTableElement | null {
  const id = trigger.getAttribute('data-eds-export-target');
  const found = id ? trigger.ownerDocument.getElementById(id) : null;
  if (found instanceof HTMLTableElement) return found;
  return found?.querySelector('table') ?? null;
}

/**
 * Botões e itens de menu `[data-eds-export="csv|xlsx|json|pdf"][data-eds-export-target="ID"]`.
 * Opcionais: `data-eds-export-filename` (sem extensão; ganha `-aaaa-mm-dd`),
 * `data-eds-export-title`, `data-eds-export-subtitle`, `data-eds-export-scope`.
 * `eds:table-beforeexport` (cancelável) sai antes de gerar; `eds:table-export`, depois.
 */
export const tableExportBehavior: Behavior = {
  name: 'table-export',
  selector: '[data-eds-export]',
  bind(trigger) {
    const ac = new AbortController();
    let announcer: Announcer | null = null;

    trigger.addEventListener(
      'click',
      (event) => {
        const fmt = trigger.getAttribute('data-eds-export') as ExportFormat | null;
        if (!fmt || !FORMATS.includes(fmt)) return;
        event.preventDefault();
        if (
          trigger.getAttribute('aria-disabled') === 'true' ||
          (trigger as HTMLButtonElement).disabled
        ) {
          return;
        }
        const table = resolveTable(trigger);
        if (!table) return;
        // Itens de menu: fecha o popover; o foco volta ao gatilho do menu.
        const popup = trigger.closest<HTMLElement>('[popover]');
        if (popup) hidePopover(popup);

        const m = getMessages();
        announcer ??= createAnnouncer(statusRegion(table));
        const scopeAttr = trigger.getAttribute('data-eds-export-scope') as ExportScope | null;
        const { data, scope } = collectTable(
          table,
          scopeAttr && SCOPES.includes(scopeAttr) ? scopeAttr : 'auto',
          trigger.hasAttribute('data-eds-export-hidden-columns') ||
            table.hasAttribute('data-eds-export-hidden-columns'),
        );
        if (data.rows.length === 0) {
          announcer.say(m.exportEmpty);
          return;
        }

        const caption = clean(table.caption?.textContent);
        const base =
          trigger.getAttribute('data-eds-export-filename') ?? (slug(caption) || m.exportFilename);
        const now = new Date();
        const filename = datedFileName(base, fmt, now);
        const title = trigger.getAttribute('data-eds-export-title') ?? (caption || undefined);
        const subtitle = trigger.getAttribute('data-eds-export-subtitle') ?? undefined;

        const detail = { format: fmt, scope, filename, count: data.rows.length, data };
        if (!emit(table, 'table-beforeexport', detail, true)) return;

        try {
          const options: ExportOptions = { filename, title, subtitle, now };
          downloadFile(generate(detail.data, fmt, options) as BlobPart, MIME[fmt], filename);
        } catch {
          announcer.say(m.exportFailed);
          return;
        }
        const count = detail.data.rows.length;
        emit(table, 'table-export', { format: fmt, scope, filename, count });
        announcer.say(
          count === 1
            ? format(m.exportDoneOne, { name: filename })
            : format(m.exportDone, { name: filename, count }),
        );
      },
      { signal: ac.signal },
    );

    return () => {
      ac.abort();
      announcer?.dispose();
    };
  },
};

export function initTableExport(root: ParentNode = document): () => void {
  return bindAll(root, [tableExportBehavior]);
}
