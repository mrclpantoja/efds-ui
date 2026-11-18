import {
  forwardRef,
  useId,
  useRef,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
  type TdHTMLAttributes,
  type ThHTMLAttributes,
} from 'react';
import { cx } from '../../utils/cx';
import { SortGlyph } from '../../internal/glyphs-d';
import { mergeRefs } from '../../internal/refs-d';
import { useScrollRegion } from '../../internal/useScrollRegion';

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
    className,
    children,
    ...rest
  },
  ref,
) {
  const captionId = useId();
  const innerWrap = useRef<HTMLDivElement>(null);
  useScrollRegion(innerWrap, captionId);
  return (
    <div ref={mergeRefs(innerWrap, wrapRef)} className={cx('eds-table-wrap', wrapClassName)}>
      <table
        {...rest}
        ref={ref}
        className={cx('eds-table', sticky && 'eds-table-sticky', className)}
      >
        <caption
          id={captionId}
          className={cx('eds-table-caption', captionHidden && 'eds-visually-hidden')}
        >
          {caption}
        </caption>
        {children}
      </table>
    </div>
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

export interface TableCellProps extends TdHTMLAttributes<HTMLTableCellElement>, ColumnProps {}

export const TableCell = forwardRef<HTMLTableCellElement, TableCellProps>(function TableCell(
  { numeric, column, className, ...rest },
  ref,
) {
  return (
    <td
      {...rest}
      ref={ref}
      className={cx(columnClass({ numeric, column }), className) || undefined}
    />
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
  /** Chamado ao acionar o botão de ordenação (o consumidor decide a próxima direção). */
  onSort?: () => void;
}

export const TableHeaderCell = forwardRef<HTMLTableCellElement, TableHeaderCellProps>(
  function TableHeaderCell(
    { numeric, column, sort, onSort, scope = 'col', className, children, ...rest },
    ref,
  ) {
    return (
      <th
        {...rest}
        ref={ref}
        scope={scope}
        aria-sort={sort}
        className={cx(columnClass({ numeric, column }), className) || undefined}
      >
        {sort === undefined ? (
          children
        ) : (
          <button type="button" className="eds-table-sort" onClick={onSort}>
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
