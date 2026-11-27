import { createContext, useContext } from 'react';
import { formatMessage as format, getMessages } from '@efds-ui/behavior/export';
import type { TableColumnsController } from './useTableColumns';

export type TableSortDirection = 'ascending' | 'descending';

/** Ordenação atual: a coluna (o `sortKey` do `<TableHeaderCell>`) e a direção. */
export interface TableSortState {
  column: string;
  direction: TableSortDirection;
}

export interface TableTexts {
  /** Anúncio ao ordenar (leitor de tela). Padrão: "Ordenado por {coluna}, crescente.". */
  sortedBy: (column: string, direction: TableSortDirection) => string;
  /** Anúncio da ordenação múltipla (coluna, direção, na ordem de prioridade). */
  sortedByMany: (criteria: { column: string; direction: TableSortDirection }[]) => string;
  /** Coluna tirada da ordenação múltipla. */
  sortRemoved: (column: string) => string;
  /** Dica (oculta) do botão de ordenação com Shift. */
  sortHint: string;
  /** Máximo de colunas na ordenação atingido. */
  sortMaxReached: (max: number) => string;
  /** Texto oculto do botão de uma coluna secundária: ", critério 2, decrescente". */
  sortOrderLabel: (order: number, direction: TableSortDirection) => string;
  /** Anúncio ao começar a carregar (`loading`). Padrão: "Carregando". */
  loading: string;
  /** Alça de ajuste da coluna (reordenar e redimensionar). */
  columnHandleLabel: (column: string) => string;
  columnHandleHelp: string;
  columnGrab: (column: string) => string;
  columnMoved: (column: string, pos: number, total: number) => string;
  columnResized: (column: string, width: number) => string;
  columnDrop: (column: string, pos: number, total: number) => string;
  columnCancel: string;
}

const directionText = (direction: TableSortDirection) => {
  const m = getMessages();
  return direction === 'ascending' ? m.tableSortAscending : m.tableSortDescending;
};

export const defaultTableTexts: TableTexts = {
  get loading() {
    return getMessages().tableLoading;
  },
  sortedBy: (column, direction) =>
    format(getMessages().tableSortedBy, { column, direction: directionText(direction) }),
  sortedByMany: (criteria) => {
    const m = getMessages();
    return format(m.tableSortedByMany, {
      criteria: criteria
        .map((c) => `${c.column}, ${directionText(c.direction)}`)
        .join(`, ${m.tableSortThen} `),
    });
  },
  sortRemoved: (column) => format(getMessages().tableSortRemoved, { column }),
  get sortHint() {
    return getMessages().tableSortHint;
  },
  sortMaxReached: (max) => format(getMessages().tableSortMaxReached, { max }),
  sortOrderLabel: (order, direction) =>
    format(getMessages().tableSortOrderLabel, { order, direction: directionText(direction) }),
  columnHandleLabel: (column) => format(getMessages().tableColumnHandleLabel, { column }),
  get columnHandleHelp() {
    return getMessages().tableColumnHandleHelp;
  },
  columnGrab: (column) => format(getMessages().tableColumnGrab, { column }),
  columnMoved: (column, pos, total) =>
    format(getMessages().tableColumnMoved, { column, pos, total }),
  columnResized: (column, width) => format(getMessages().tableColumnResized, { column, width }),
  columnDrop: (column, pos, total) => format(getMessages().tableColumnDrop, { column, pos, total }),
  get columnCancel() {
    return getMessages().tableColumnCancel;
  },
};

export interface TableContextValue {
  /** Ordenação como lista (a simples vira lista de um). */
  sort: TableSortState[];
  /** Há ordenação controlada (`onSortChange` foi dado). */
  controlled: boolean;
  /** Ordenação múltipla: `shift` (Shift acrescenta) ou `add` (todo clique acrescenta). */
  multi: false | 'shift' | 'add';
  /** Nome de cada coluna ordenável (por `sortKey`), registrado pelo cabeçalho. */
  labels: Map<string, string>;
  hintId: string;
  helpId: string;
  /** `additive`: Shift+clique (ou modo `add`). */
  requestSort: (column: string, label: string, additive: boolean) => void;
  announce: (message: string) => void;
  texts: TableTexts;
  columns: TableColumnsController | null;
  resizable: boolean;
  reorderable: boolean;
}

export const TableContext = createContext<TableContextValue | null>(null);

export const useTableContext = () => useContext(TableContext);
