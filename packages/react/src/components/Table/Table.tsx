import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
  type TdHTMLAttributes,
  type ThHTMLAttributes,
} from 'react';
import { format, getMessages } from '@eds-ui/behavior/export';
import { cx } from '../../utils/cx';
import { mergeTexts } from '../../utils/texts';
import { useAnnouncer } from '../../internal/announcer';
import { SortGlyph } from '../../internal/glyphs-d';
import { mergeRefs } from '../../internal/refs-d';
import { useScrollRegion } from '../../internal/useScrollRegion';
import { Spinner } from '../Spinner';
import { Skeleton } from '../Skeleton';

export type TableSortDirection = 'ascending' | 'descending';

/** Ordenação atual: a coluna (o `sortKey` do `<TableHeaderCell>`) e a direção. */
export interface TableSortState {
  column: string;
  direction: TableSortDirection;
}

export interface TableTexts {
  /** Anúncio ao ordenar (leitor de tela). Padrão: "Ordenado por {coluna}, crescente.". */
  sortedBy: (column: string, direction: TableSortDirection) => string;
  /** Anúncio ao começar a carregar (`loading`). Padrão: "Carregando". */
  loading: string;
}

const defaultTableTexts: TableTexts = {
  loading: 'Carregando',
  sortedBy: (column, direction) => {
    const m = getMessages();
    return format(m.sortedBy, {
      column,
      direction: direction === 'ascending' ? m.sortAscending : m.sortDescending,
    });
  },
};

interface TableContextValue {
  sort: TableSortState | null | undefined;
  /** Há ordenação controlada (`onSortChange` foi dado). */
  controlled: boolean;
  requestSort: (column: string, label: string) => void;
}

const TableContext = createContext<TableContextValue | null>(null);

export interface TableProps extends Omit<HTMLAttributes<HTMLTableElement>, 'children'> {
  /** Nome da tabela (`<caption>`): também rotula a região rolável. */
  caption: ReactNode;
  /** Oculta o caption visualmente, mantendo-o para leitores de tela. Padrão: `true`. */
  captionHidden?: boolean;
  /** Cabeçalho fixo; exige altura limitada no wrap (via `wrapClassName`). */
  sticky?: boolean;
  /** Classe extra do `.eds-table-wrap`. */
  wrapClassName?: string;
  /** Ref do `.eds-table-wrap`. */
  wrapRef?: Ref<HTMLDivElement>;
  /**
   * Ordenação controlada, no padrão do behavior: com `onSortChange`, os `<TableHeaderCell sortKey>`
   * derivam `aria-sort` daqui e pedem a nova ordem ao serem acionados (primeiro crescente, depois
   * alternando). Ordene os dados com `sortTableData`.
   */
  sort?: TableSortState | null;
  onSortChange?: (sort: TableSortState) => void;
  /**
   * Mensagem para leitor de tela (região `role="status"`) lida quando muda, ex.: o `status` do
   * `useTableFilter`. A ordenação é anunciada pela própria Table.
   */
  status?: string;
  /**
   * Carregando: `aria-busy` na tabela (as linhas reais ficam esmaecidas) e anúncio `texts.loading`
   * numa região `role="status"` que existe desde o início, para o leitor de tela ler a mudança.
   * Use `<TableLoadingRows>` no `<TableBody>` para as linhas Skeleton.
   */
  loading?: boolean;
  /** Com `loading`, acrescenta a sobreposição com Spinner (recarga sobre dados já exibidos). */
  loadingOverlay?: boolean;
  /** Textos internos (padrões em pt-BR). */
  texts?: Partial<TableTexts>;
  /** `<TableHead>`, `<TableBody>`. */
  children?: ReactNode;
}

/**
 * Tabela com a região rolável do core. O wrap só vira `role="region"` focável
 * (`tabIndex`, `aria-labelledby` = caption) quando a tabela de fato rola.
 */
export const Table = forwardRef<HTMLTableElement, TableProps>(function Table(
  {
    caption,
    captionHidden = true,
    sticky = false,
    wrapClassName,
    wrapRef,
    sort,
    onSortChange,
    status,
    loading,
    loadingOverlay = false,
    texts,
    className,
    children,
    ...rest
  },
  ref,
) {
  const captionId = useId();
  const { text: statusText, announce } = useAnnouncer();
  const t = mergeTexts(defaultTableTexts, texts);
  const latest = useRef({ sort, onSortChange, announce, t });
  useEffect(() => {
    latest.current = { sort, onSortChange, announce, t };
  });
  const context = useMemo<TableContextValue>(
    () => ({
      sort,
      controlled: onSortChange !== undefined,
      requestSort: (column, label) => {
        const { sort: current, onSortChange: change, announce: say, t: texts } = latest.current;
        const direction: TableSortDirection =
          current?.column === column && current.direction === 'ascending'
            ? 'descending'
            : 'ascending';
        change?.({ column, direction });
        say(texts.sortedBy(label, direction));
      },
    }),
    [sort, onSortChange],
  );
  useEffect(() => {
    if (status) announce(status);
  }, [status, announce]);
  const innerWrap = useRef<HTMLDivElement>(null);
  const innerTable = useRef<HTMLTableElement>(null);
  useScrollRegion(innerWrap, captionId);
  // Sobreposição de carregamento: o conteúdo da tabela fica `inert` (o foco não entra em controles
  // cobertos) e, ao sair, o foco volta ao elemento que o tinha, se ainda existir.
  const covered = loading === true && loadingOverlay;
  useEffect(() => {
    const table = innerTable.current;
    if (!covered || !table) return undefined;
    const focused = table.ownerDocument.activeElement;
    const restore = focused instanceof HTMLElement && table.contains(focused) ? focused : null;
    table.setAttribute('inert', '');
    return () => {
      table.removeAttribute('inert');
      const active = table.ownerDocument.activeElement;
      if (restore?.isConnected && (!active || active === table.ownerDocument.body)) {
        restore.focus({ preventScroll: true });
      }
    };
  }, [covered]);
  return (
    <TableContext.Provider value={context}>
      <div ref={mergeRefs(innerWrap, wrapRef)} className={cx('eds-table-wrap', wrapClassName)}>
        <table
          {...rest}
          ref={mergeRefs(innerTable, ref)}
          className={cx('eds-table', sticky && 'eds-table-sticky', className)}
          aria-busy={loading || undefined}
        >
          <caption
            id={captionId}
            className={cx('eds-table-caption', captionHidden && 'eds-visually-hidden')}
          >
            {caption}
          </caption>
          {children}
        </table>
        {loading !== undefined && (
          <span className="eds-visually-hidden" role="status">
            {loading ? t.loading : ''}
          </span>
        )}
        {covered && (
          <div className="eds-table-overlay">
            <div className="eds-table-overlay-box">
              <Spinner decorative />
            </div>
          </div>
        )}
      </div>
      {onSortChange !== undefined || status !== undefined ? (
        <div role="status" className="eds-visually-hidden">
          {statusText}
        </div>
      ) : null}
    </TableContext.Provider>
  );
});
Table.displayName = 'Table';

export type TableHeadProps = HTMLAttributes<HTMLTableSectionElement>;
export const TableHead = forwardRef<HTMLTableSectionElement, TableHeadProps>(
  function TableHead(props, ref) {
    return <thead {...props} ref={ref} />;
  },
);
TableHead.displayName = 'TableHead';

export type TableBodyProps = HTMLAttributes<HTMLTableSectionElement>;
export const TableBody = forwardRef<HTMLTableSectionElement, TableBodyProps>(
  function TableBody(props, ref) {
    return <tbody {...props} ref={ref} />;
  },
);
TableBody.displayName = 'TableBody';

export interface TableLoadingRowsProps {
  /** Número de colunas da tabela. */
  columns: number;
  /** Linhas Skeleton. Padrão: 3. */
  rows?: number;
  /** Índices (a partir de 0) das colunas numéricas, alinhadas à direita. */
  numeric?: readonly number[];
}

/** Linhas Skeleton (`tr.eds-table-loading`) com a altura de uma linha de dados, sem layout shift. */
export function TableLoadingRows({ columns, rows = 3, numeric = [] }: TableLoadingRowsProps) {
  return (
    <>
      {Array.from({ length: rows }, (_, r) => (
        <tr key={r} className="eds-table-loading">
          {Array.from({ length: columns }, (_, c) => (
            <td key={c} className={numeric.includes(c) ? 'eds-table-num' : undefined}>
              <Skeleton variant="text" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export type TableRowProps = HTMLAttributes<HTMLTableRowElement>;
export const TableRow = forwardRef<HTMLTableRowElement, TableRowProps>(
  function TableRow(props, ref) {
    return <tr {...props} ref={ref} />;
  },
);
TableRow.displayName = 'TableRow';

/** Colunas especiais do core: seleção (`check`) e ações (`actions`). */
export type TableColumnKind = 'check' | 'actions';

interface ColumnProps {
  /** Alinha à direita com algarismos tabulares. */
  numeric?: boolean;
  column?: TableColumnKind;
}

const columnClass = ({ numeric, column }: ColumnProps) =>
  cx(numeric && 'eds-table-num', column && `eds-table-${column}`);

/**
 * Coluna de seleção (`check`): o checkbox (com `aria-label`) vai dentro de um
 * `<label class="eds-check">`, que amplia o alvo do clique. As outras colunas não mudam.
 */
const columnContent = (column: TableColumnKind | undefined, children: ReactNode): ReactNode =>
  column === 'check' && children != null ? (
    <label className="eds-check">{children}</label>
  ) : (
    children
  );

export interface TableCellProps extends TdHTMLAttributes<HTMLTableCellElement>, ColumnProps {}

export const TableCell = forwardRef<HTMLTableCellElement, TableCellProps>(function TableCell(
  { numeric, column, className, children, ...rest },
  ref,
) {
  return (
    <td
      {...rest}
      ref={ref}
      className={cx(columnClass({ numeric, column }), className) || undefined}
    >
      {columnContent(column, children)}
    </td>
  );
});
TableCell.displayName = 'TableCell';

export type TableSort = 'ascending' | 'descending' | 'none';

export interface TableHeaderCellProps
  extends Omit<ThHTMLAttributes<HTMLTableCellElement>, 'aria-sort'>, ColumnProps {
  /**
   * Torna a coluna ordenável: `aria-sort` no `<th>` e botão com o ícone de ordenação.
   * Use `'none'` nas ordenáveis que não são a atual.
   */
  sort?: TableSort;
  /**
   * Chave desta coluna na ordenação controlada da `<Table sort onSortChange>`: `aria-sort` e o
   * botão vêm do estado da tabela, sem `sort` nem `onSort` à mão.
   */
  sortKey?: string;
  /** Chamado ao acionar o botão de ordenação (o consumidor decide a próxima direção). */
  onSort?: () => void;
}

export const TableHeaderCell = forwardRef<HTMLTableCellElement, TableHeaderCellProps>(
  function TableHeaderCell(
    {
      numeric,
      column,
      sort: sortProp,
      sortKey,
      onSort,
      scope = 'col',
      className,
      children,
      ...rest
    },
    ref,
  ) {
    const table = useContext(TableContext);
    const keyed = sortKey !== undefined && table?.controlled === true;
    const derived: TableSort | undefined = keyed
      ? table.sort?.column === sortKey
        ? table.sort.direction
        : 'none'
      : undefined;
    const sort = sortProp ?? derived;
    return (
      <th
        {...rest}
        ref={ref}
        scope={scope}
        aria-sort={sort}
        className={cx(columnClass({ numeric, column }), className) || undefined}
      >
        {sort === undefined ? (
          columnContent(column, children)
        ) : (
          <button
            type="button"
            className="eds-table-sort"
            onClick={(event) => {
              if (keyed) {
                const label = (event.currentTarget.textContent ?? '').replace(/\s+/g, ' ').trim();
                table.requestSort(sortKey, label);
              }
              onSort?.();
            }}
          >
            {children} <SortGlyph />
          </button>
        )}
      </th>
    );
  },
);
TableHeaderCell.displayName = 'TableHeaderCell';

export interface TableEmptyProps extends Omit<TdHTMLAttributes<HTMLTableCellElement>, 'colSpan'> {
  /** Número de colunas da tabela. */
  colSpan: number;
}

/** Linha de estado vazio: `<tr><td colspan class="eds-table-empty">…</td></tr>` (use com `<EmptyState>`). */
export const TableEmpty = forwardRef<HTMLTableCellElement, TableEmptyProps>(function TableEmpty(
  { className, ...rest },
  ref,
) {
  return (
    <tr>
      <td {...rest} ref={ref} className={cx('eds-table-empty', className)} />
    </tr>
  );
});
TableEmpty.displayName = 'TableEmpty';

export type TableToolbarProps = HTMLAttributes<HTMLDivElement>;

/** Barra acima da tabela (busca, filtros, ações). Fica fora do `<Table>`. */
export const TableToolbar = forwardRef<HTMLDivElement, TableToolbarProps>(function TableToolbar(
  { className, ...rest },
  ref,
) {
  return <div {...rest} ref={ref} className={cx('eds-table-toolbar', className)} />;
});
TableToolbar.displayName = 'TableToolbar';

export type TableFooterProps = HTMLAttributes<HTMLDivElement>;

/** Rodapé abaixo da tabela (resumo + `<Pagination>`). */
export const TableFooter = forwardRef<HTMLDivElement, TableFooterProps>(function TableFooter(
  { className, ...rest },
  ref,
) {
  return <div {...rest} ref={ref} className={cx('eds-table-footer', className)} />;
});
TableFooter.displayName = 'TableFooter';
