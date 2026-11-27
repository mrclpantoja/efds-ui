import {
  forwardRef,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
  type RefObject,
  type TdHTMLAttributes,
  type ThHTMLAttributes,
} from 'react';
import { cx } from '../../utils/cx';
import { mergeTexts } from '../../utils/texts';
import { useAnnouncer } from '../../internal/announcer';
import { SortGlyph } from '../../internal/glyphs-d';
import { mergeRefs } from '../../internal/refs-d';
import { useScrollRegion } from '../../internal/useScrollRegion';
import { Spinner } from '../Spinner';
import { Skeleton } from '../Skeleton';
import {
  TableContext,
  defaultTableTexts,
  useTableContext,
  type TableContextValue,
  type TableSortDirection,
  type TableSortState,
  type TableTexts,
} from './tableContext';
import { TableColumnHandle } from './TableColumnHandle';
import type { TableColumnsController } from './useTableColumns';

export type { TableSortDirection, TableSortState, TableTexts };

interface TableBaseProps extends Omit<HTMLAttributes<HTMLTableElement>, 'children'> {
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
  /**
   * Estado das colunas (`useTableColumns`): a tabela renderiza `<colgroup>`, as larguras, as
   * colunas fixas e anuncia os ajustes. Mapeie `controller.columns` nos cabeçalhos e nas células.
   */
  columnsController?: TableColumnsController;
  /** Alça e borda para redimensionar as colunas (exige `columnsController`). */
  resizable?: boolean;
  /** Alça para reordenar as colunas (exige `columnsController`). */
  reorderable?: boolean;
  /** Textos internos (padrões em pt-BR). */
  texts?: Partial<TableTexts>;
  /** `<TableHead>`, `<TableBody>`. */
  children?: ReactNode;
}

/** Ordenação de uma coluna por vez (o padrão). */
interface SingleSortProps {
  multiSort?: false;
  sortMax?: undefined;
  /**
   * Ordenação controlada, no padrão do behavior: com `onSortChange`, os `<TableHeaderCell sortKey>`
   * derivam `aria-sort` daqui e pedem a nova ordem ao serem acionados (primeiro crescente, depois
   * alternando). Ordene os dados com `sortTableData`.
   */
  sort?: TableSortState | null;
  onSortChange?: (sort: TableSortState) => void;
}

/**
 * Ordenação múltipla: `true`/`'shift'` (clique substitui; Shift+clique ou Shift+Enter acrescenta)
 * ou `'add'` (todo clique acrescenta, para toque). `sort` e `onSortChange` passam a ser listas.
 */
interface MultiSortProps {
  multiSort: true | 'shift' | 'add';
  /** Máximo de colunas na ordenação. Padrão: 3. */
  sortMax?: number;
  sort?: TableSortState[] | null;
  onSortChange?: (sort: TableSortState[]) => void;
}

export type TableProps = TableBaseProps & (SingleSortProps | MultiSortProps);

/** Classes de fixação (`pin-start`/`pin-end`/`pin-edge`) da coluna `id` e se está oculta. */
function columnTraits(
  ctx: TableContextValue | null,
  id: string | undefined,
  pinProp: 'start' | 'end' | undefined,
) {
  const controller = ctx?.columns;
  const def = id && controller ? controller.all.find((c) => c.id === id) : undefined;
  const pin = pinProp ?? def?.pin;
  let edge = false;
  if (pin && controller && id) {
    const peers = controller.columns.filter((c) => c.pin === pin);
    edge = pin === 'start' ? peers[peers.length - 1]?.id === id : peers[0]?.id === id;
  }
  const hidden = !!def && !controller?.columns.some((c) => c.id === id);
  return {
    def,
    hidden,
    className: pin ? cx(`eds-table-pin-${pin}`, edge && 'eds-table-pin-edge') : undefined,
  };
}

/** Define `--_pin-inset` nas células fixas e os tamanhos dos grupos no wrap (só variáveis CSS). */
function usePinInsets(
  wrap: RefObject<HTMLDivElement | null>,
  table: RefObject<HTMLTableElement | null>,
  controller: TableColumnsController | undefined,
) {
  const signature = controller
    ? controller.columns
        .map((c) => `${c.id}:${c.pin ?? ''}:${controller.state.widths[c.id] ?? ''}`)
        .join('|')
    : '';
  useLayoutEffect(() => {
    const wrapEl = wrap.current;
    const tableEl = table.current;
    const headRow = tableEl?.tHead?.rows[0];
    const pinned = signature.includes(':start:') || signature.includes(':end:');
    if (!wrapEl || !tableEl || !headRow || !pinned) return undefined;
    const apply = () => {
      const cells = Array.from(headRow.cells);
      const insets = new Map<number, string>();
      let start = 0;
      cells.forEach((cell, i) => {
        if (!cell.classList.contains('eds-table-pin-start')) return;
        insets.set(i, `${start}px`);
        start += cell.offsetWidth;
      });
      let end = 0;
      for (let i = cells.length - 1; i >= 0; i -= 1) {
        const cell = cells[i] as HTMLTableCellElement;
        if (!cell.classList.contains('eds-table-pin-end')) continue;
        insets.set(i, `${end}px`);
        end += cell.offsetWidth;
      }
      for (const row of Array.from(tableEl.rows)) {
        if (row.cells.length !== cells.length) continue;
        for (const [i, inset] of insets) row.cells[i]?.style.setProperty('--_pin-inset', inset);
      }
      wrapEl.style.setProperty('--_pin-start-size', `${start}px`);
      wrapEl.style.setProperty('--_pin-end-size', `${end}px`);
      // Reflow (1.4.10): fixas demais deixam pouco espaço para o resto.
      const width = wrapEl.clientWidth;
      if (width > 0 && start + end > width * 0.6) wrapEl.setAttribute('data-pin-disabled', '');
      else wrapEl.removeAttribute('data-pin-disabled');
    };
    apply();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(apply);
    observer.observe(wrapEl);
    for (const cell of Array.from(headRow.cells)) observer.observe(cell);
    return () => observer.disconnect();
  }, [wrap, table, signature]);
}

/** Nome do botão de ordenação sem o número de prioridade nem o texto oculto do critério. */
const labelOf = (button: HTMLElement): string =>
  Array.from(button.childNodes)
    .filter(
      (node) =>
        !(
          node instanceof Element &&
          (node.classList.contains('eds-table-sort-order') ||
            node.classList.contains('eds-table-sort-text'))
        ),
    )
    .map((node) => node.textContent ?? '')
    .join('')
    .replace(/\s+/g, ' ')
    .trim();

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
    multiSort,
    sortMax = 3,
    status,
    loading,
    loadingOverlay = false,
    columnsController,
    resizable = false,
    reorderable = false,
    texts,
    className,
    children,
    ...rest
  },
  ref,
) {
  const captionId = useId();
  const hintId = useId();
  const helpId = useId();
  const { text: statusText, announce } = useAnnouncer();
  const t = mergeTexts(defaultTableTexts, texts);
  const multi: TableContextValue['multi'] = multiSort === true ? 'shift' : multiSort || false;
  const list = useMemo<TableSortState[]>(
    () =>
      multi
        ? ((sort as TableSortState[] | null | undefined) ?? [])
        : sort
          ? [sort as TableSortState]
          : [],
    [multi, sort],
  );
  const [labels] = useState(() => new Map<string, string>());
  const latest = useRef({ list, onSortChange, announce, t, multi, sortMax });
  useEffect(() => {
    latest.current = { list, onSortChange, announce, t, multi, sortMax };
  });
  const context = useMemo<TableContextValue>(
    () => ({
      sort: list,
      controlled: onSortChange !== undefined,
      multi,
      labels,
      hintId,
      helpId,
      requestSort: (column, label, additive) => {
        const cur = latest.current;
        const change = cur.onSortChange as ((next: unknown) => void) | undefined;
        const index = cur.list.findIndex((c) => c.column === column);
        const first = cur.list[0];
        const replace = (): TableSortState => ({
          column,
          direction:
            first?.column === column && first.direction === 'ascending'
              ? 'descending'
              : 'ascending',
        });
        if (!cur.multi) {
          const next = replace();
          change?.(next);
          cur.announce(cur.t.sortedBy(label, next.direction));
          return;
        }
        let next: TableSortState[];
        if (!additive && cur.multi === 'shift') next = [replace()];
        else if (index < 0) {
          if (cur.list.length >= cur.sortMax) {
            cur.announce(cur.t.sortMaxReached(cur.sortMax));
            return;
          }
          next = [...cur.list, { column, direction: 'ascending' }];
        } else if (cur.list[index]?.direction === 'ascending') {
          next = cur.list.map((c, i) => (i === index ? { ...c, direction: 'descending' } : c));
        } else {
          next = cur.list.filter((_, i) => i !== index);
          change?.(next);
          cur.announce(cur.t.sortRemoved(label));
          return;
        }
        change?.(next);
        cur.announce(
          next.length === 1
            ? cur.t.sortedBy(label, (next[0] as TableSortState).direction)
            : cur.t.sortedByMany(
                next.map((c) => ({
                  column: c.column === column ? label : (labels.get(c.column) ?? c.column),
                  direction: c.direction,
                })),
              ),
        );
      },
      announce,
      // Os textos mudam a cada render (mergeTexts); o último valor vem de `latest`.
      texts: t,
      columns: columnsController ?? null,
      resizable: resizable && !!columnsController,
      reorderable: reorderable && !!columnsController,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      list,
      onSortChange,
      multi,
      hintId,
      helpId,
      announce,
      columnsController,
      resizable,
      reorderable,
      labels,
      texts,
    ],
  );
  useEffect(() => {
    if (status) announce(status);
  }, [status, announce]);
  const message = columnsController?.message;
  useEffect(() => {
    if (message?.text) announce(message.text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message?.seq]);
  const innerWrap = useRef<HTMLDivElement>(null);
  const innerTable = useRef<HTMLTableElement>(null);
  useScrollRegion(innerWrap, captionId);
  usePinInsets(innerWrap, innerTable, columnsController);
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
  const fixed = columnsController
    ? columnsController.columns.some((c) => !c.locked && columnsController.state.widths[c.id])
    : false;
  return (
    <TableContext.Provider value={context}>
      <div ref={mergeRefs(innerWrap, wrapRef)} className={cx('eds-table-wrap', wrapClassName)}>
        <table
          {...rest}
          ref={mergeRefs(innerTable, ref)}
          className={cx(
            'eds-table',
            sticky && 'eds-table-sticky',
            fixed && 'eds-table-fixed',
            className,
          )}
          aria-busy={loading || undefined}
        >
          <caption
            id={captionId}
            className={cx('eds-table-caption', captionHidden && 'eds-visually-hidden')}
          >
            {caption}
          </caption>
          {columnsController && fixed && (
            <colgroup>
              {columnsController.columns.map((c) => {
                const width = c.locked ? undefined : columnsController.state.widths[c.id];
                // Única exceção a "sem estilo no React": a largura em px de uma coluna ajustada pelo
                // usuário é dado de execução, não aparência do tema.
                return <col key={c.id} data-eds-col={c.id} style={width ? { width } : undefined} />;
              })}
            </colgroup>
          )}
          {children}
        </table>
        {multi === 'shift' && (
          <p id={hintId} className="eds-visually-hidden">
            {t.sortHint}
          </p>
        )}
        {columnsController && (resizable || reorderable) ? (
          <p id={helpId} className="eds-visually-hidden">
            {t.columnHandleHelp}
          </p>
        ) : null}
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
      {onSortChange !== undefined || status !== undefined || columnsController ? (
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

export interface TableCellProps extends TdHTMLAttributes<HTMLTableCellElement>, ColumnProps {
  /**
   * Coluna do `useTableColumns` a que a célula pertence: aplica a fixação (`pin`) e oculta a
   * célula se a coluna estiver oculta.
   */
  columnId?: string;
}

export const TableCell = forwardRef<HTMLTableCellElement, TableCellProps>(function TableCell(
  { numeric, column, columnId, className, children, ...rest },
  ref,
) {
  const traits = columnTraits(useTableContext(), columnId, undefined);
  return (
    <td
      {...rest}
      ref={ref}
      data-eds-col={columnId}
      hidden={traits.hidden || rest.hidden}
      className={cx(columnClass({ numeric, column }), traits.className, className) || undefined}
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
  /** Coluna do `useTableColumns`: `data-eds-col`, fixação, alça de ajuste e oculta se for o caso. */
  columnId?: string;
  /** Fixa a coluna sem `useTableColumns` (com ele, vale `pin` da definição). */
  pin?: 'start' | 'end';
  /** Filtro da coluna, ao lado do botão de ordenação: `<TableColumnFilter />`. */
  filter?: ReactNode;
}

export const TableHeaderCell = forwardRef<HTMLTableCellElement, TableHeaderCellProps>(
  function TableHeaderCell(
    {
      numeric,
      column,
      sort: sortProp,
      sortKey,
      onSort,
      columnId,
      pin,
      filter,
      scope = 'col',
      className,
      children,
      ...rest
    },
    ref,
  ) {
    const table = useTableContext();
    const traits = columnTraits(table, columnId, pin);
    const keyed = sortKey !== undefined && table?.controlled === true;
    const position = keyed ? table.sort.findIndex((c) => c.column === sortKey) : -1;
    const criterion = position >= 0 ? table?.sort[position] : undefined;
    // Só o critério primário leva `aria-sort`; o secundário é dito pelo texto oculto do botão.
    const derived: TableSort | undefined = keyed
      ? position === 0
        ? criterion?.direction
        : position > 0
          ? undefined
          : 'none'
      : undefined;
    const sortable = sortProp !== undefined || keyed;
    const sort = sortProp ?? derived;
    const sortButton = useRef<HTMLButtonElement>(null);
    // O nome da coluna fica registrado para o anúncio da ordenação múltipla.
    useEffect(() => {
      if (keyed && sortButton.current) table.labels.set(sortKey, labelOf(sortButton.current));
    });
    const hintId = table?.multi === 'shift' ? table.hintId : undefined;
    // Shift+Enter/Espaço acrescenta a coluna; o click gerado pelo teclado é descartado.
    const keySorted = useRef(false);
    const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
      if (!keyed || table.multi !== 'shift' || !event.shiftKey) return;
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      keySorted.current = true;
      table.requestSort(sortKey, labelOf(event.currentTarget), true);
      onSort?.();
    };
    const showHandle =
      !!table?.columns &&
      !!traits.def &&
      !traits.def.locked &&
      (table.reorderable || table.resizable);
    const wrapped = filter !== undefined || showHandle;
    const content = !sortable ? (
      columnContent(column, children)
    ) : (
      <button
        ref={sortButton}
        type="button"
        className="eds-table-sort"
        aria-describedby={hintId}
        onKeyDown={onKeyDown}
        onKeyUp={() => {
          setTimeout(() => {
            keySorted.current = false;
          }, 0);
        }}
        onClick={(event) => {
          if (keySorted.current) {
            keySorted.current = false;
            return;
          }
          if (keyed) {
            table.requestSort(
              sortKey,
              labelOf(event.currentTarget),
              table.multi === 'add' || (table.multi === 'shift' && event.shiftKey),
            );
          }
          onSort?.();
        }}
      >
        {children} <SortGlyph />
        {criterion && table && table.sort.length > 1 && (
          <span className="eds-table-sort-order" aria-hidden="true">
            {position + 1}
          </span>
        )}
        {criterion && position > 0 && table && (
          <span className="eds-visually-hidden eds-table-sort-text">
            {table.texts.sortOrderLabel(position + 1, criterion.direction)}
          </span>
        )}
      </button>
    );
    return (
      <th
        {...rest}
        ref={ref}
        scope={scope}
        aria-sort={sort}
        data-eds-col={columnId}
        data-eds-sort-dir={criterion?.direction}
        data-eds-sort-order={criterion ? position + 1 : undefined}
        hidden={traits.hidden || rest.hidden}
        className={cx(columnClass({ numeric, column }), traits.className, className) || undefined}
      >
        {wrapped ? (
          <div className="eds-table-th">
            {content}
            {filter}
            {showHandle && traits.def && <TableColumnHandle def={traits.def} />}
          </div>
        ) : (
          content
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
