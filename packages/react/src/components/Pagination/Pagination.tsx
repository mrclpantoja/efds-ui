import { forwardRef, type HTMLAttributes, type MouseEvent, type ReactNode } from 'react';
import { cx } from '../../utils/cx';
import { ChevronLeftGlyph, ChevronRightGlyph } from '../../internal/glyphs';

export interface PaginationLabels {
  /** `aria-label` do `<nav>`. */
  nav: string;
  previous: string;
  next: string;
  /** Nome acessível do botão/link de cada página. */
  page: (page: number) => string;
  /** Resumo visível ("Página 3 de 25"). */
  info: (page: number, pageCount: number) => string;
}

const defaultLabels: PaginationLabels = {
  nav: 'Paginação',
  previous: 'Anterior',
  next: 'Próxima',
  page: (page) => `Página ${page}`,
  info: (page, pageCount) => `Página ${page} de ${pageCount}`,
};

export interface PaginationProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  /** Página atual (1-based). */
  page: number;
  pageCount: number;
  onPageChange?: (page: number) => void;
  /** Com `getHref`, os controles são links (`<a href>`); sem ele, botões. */
  getHref?: (page: number) => string;
  /** Mostra "Página X de Y". Padrão: `true`. */
  showInfo?: boolean;
  /** Textos (padrão pt-BR). */
  labels?: Partial<PaginationLabels>;
}

type Slot = number | 'start-ellipsis' | 'end-ellipsis';

/** Até 7 posições: primeira, última, vizinhas da atual e reticências. */
export function getPaginationSlots(page: number, pageCount: number): Slot[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
  if (page <= 4) return [1, 2, 3, 4, 5, 'end-ellipsis', pageCount];
  if (page >= pageCount - 3) {
    return [1, 'start-ellipsis', ...Array.from({ length: 5 }, (_, i) => pageCount - 4 + i)];
  }
  return [1, 'start-ellipsis', page - 1, page, page + 1, 'end-ellipsis', pageCount];
}

/** Paginação controlada. Prev/next no limite ficam `aria-disabled` (focáveis; a ação é ignorada). */
export const Pagination = forwardRef<HTMLElement, PaginationProps>(function Pagination(
  {
    page,
    pageCount,
    onPageChange,
    getHref,
    showInfo = true,
    labels: labelsProp,
    className,
    ...rest
  },
  ref,
) {
  const labels = { ...defaultLabels, ...labelsProp };
  const total = Math.max(1, Math.floor(pageCount));
  const current = Math.min(Math.max(1, Math.floor(page)), total);

  const control = (
    target: number,
    props: { className: string; label?: string; disabled?: boolean; isCurrent?: boolean },
    children: ReactNode,
  ) => {
    const { disabled = false, isCurrent = false } = props;
    const onClick = (event: MouseEvent<HTMLElement>) => {
      if (disabled || isCurrent) {
        if (disabled) event.preventDefault();
        return;
      }
      onPageChange?.(target);
    };
    const common = {
      className: props.className,
      'aria-label': props.label,
      'aria-current': isCurrent ? ('page' as const) : undefined,
      'aria-disabled': disabled || undefined,
      onClick,
    };
    return getHref ? (
      <a {...common} href={getHref(target)}>
        {children}
      </a>
    ) : (
      <button {...common} type="button">
        {children}
      </button>
    );
  };

  const prevTarget = Math.max(1, current - 1);
  const nextTarget = Math.min(total, current + 1);

  return (
    <nav {...rest} ref={ref} aria-label={labels.nav} className={cx('eds-pagination', className)}>
      <ul className="eds-pagination-list">
        <li>
          {control(
            prevTarget,
            { className: 'eds-pagination-prev', disabled: current <= 1 },
            <>
              <ChevronLeftGlyph />
              <span>{labels.previous}</span>
            </>,
          )}
        </li>
        {getPaginationSlots(current, total).map((slot) =>
          typeof slot === 'number' ? (
            <li key={slot}>
              {control(
                slot,
                {
                  className: 'eds-pagination-item',
                  label: labels.page(slot),
                  isCurrent: slot === current,
                },
                slot,
              )}
            </li>
          ) : (
            <li key={slot}>
              <span className="eds-pagination-ellipsis" aria-hidden="true">
                …
              </span>
            </li>
          ),
        )}
        {showInfo ? (
          <li>
            <span className="eds-pagination-info">{labels.info(current, total)}</span>
          </li>
        ) : null}
        <li>
          {control(
            nextTarget,
            { className: 'eds-pagination-next', disabled: current >= total },
            <>
              <span>{labels.next}</span>
              <ChevronRightGlyph />
            </>,
          )}
        </li>
      </ul>
    </nav>
  );
});
Pagination.displayName = 'Pagination';
