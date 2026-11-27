import {
  forwardRef,
  useEffect,
  useRef,
  type FormEvent,
  type FormHTMLAttributes,
  type ReactNode,
} from 'react';
import { cx } from '../../utils/cx';
import { mergeTexts } from '../../utils/texts';
import { mergeRefs } from '../../internal/refs-d';

export interface FilterBarActiveFilter {
  /** Chave estável do filtro (também a `key` do chip). */
  key: string;
  /** Texto do chip, já com o rótulo: "Situação: Ativo". */
  label: string;
  /** Chamado ao remover o chip; atualize o estado dos campos e refaça a busca. */
  onRemove: () => void;
}

export interface FilterBarTexts {
  filter: string;
  clear: string;
  more: string;
  /** Texto oculto do chip: " — remover". */
  remove: string;
  /** Nome da lista de chips. */
  chips: string;
}

const defaultFilterBarTexts: FilterBarTexts = {
  filter: 'Filtrar',
  clear: 'Limpar',
  more: 'Mais filtros',
  remove: ' — remover',
  chips: 'Filtros ativos',
};

export interface FilterBarProps extends Omit<
  FormHTMLAttributes<HTMLFormElement>,
  'onSubmit' | 'onReset' | 'children'
> {
  /** Nome da região de busca (ex.: "Filtrar pedidos"). */
  'aria-label': string;
  /** Envio (Enter ou "Filtrar"). O envio nativo é impedido: refaça a busca aqui. */
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  /** "Limpar": zere os campos e refaça a busca. */
  onClear?: () => void;
  /** Filtros aplicados, um chip cada. */
  active?: readonly FilterBarActiveFilter[];
  /** Campos principais (a busca leva `.eds-filter-bar-search` no `<Field>`). */
  children?: ReactNode;
  /** Campos extras: dentro de "Mais filtros" (`<details>`). */
  more?: ReactNode;
  /** Quantos campos extras estão preenchidos: aparece como "(2)" no resumo. */
  moreCount?: number;
  texts?: Partial<FilterBarTexts>;
}

/**
 * Barra de filtros (`<form role="search">`): campos em linha que quebra, ações, "Mais filtros"
 * e a lista de chips dos filtros ativos. Depois de remover um chip o foco vai ao próximo chip
 * (ou ao primeiro campo).
 */
export const FilterBar = forwardRef<HTMLFormElement, FilterBarProps>(function FilterBar(
  { onSubmit, onClear, active = [], more, moreCount, texts, className, children, ...rest },
  ref,
) {
  const t = mergeTexts(defaultFilterBarTexts, texts);
  const formRef = useRef<HTMLFormElement>(null);
  const pendingFocus = useRef<number | null>(null);

  useEffect(() => {
    const index = pendingFocus.current;
    if (index === null) return;
    pendingFocus.current = null;
    const form = formRef.current;
    if (!form) return;
    const chips = Array.from(form.querySelectorAll<HTMLElement>('.eds-filter-chips button'));
    const target =
      chips[Math.min(index, chips.length - 1)] ??
      form.querySelector<HTMLElement>(
        '.eds-filter-bar-fields input, .eds-filter-bar-fields select',
      );
    target?.focus();
  }, [active]);

  return (
    <form
      {...rest}
      ref={mergeRefs(formRef, ref)}
      role="search"
      className={cx('eds-filter-bar', className)}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.(event);
      }}
      onReset={() => {
        onClear?.();
      }}
    >
      <div className="eds-filter-bar-fields">{children}</div>
      <div className="eds-filter-bar-actions">
        <button type="submit" className="eds-button eds-button-primary">
          {t.filter}
        </button>
        <button type="reset" className="eds-button eds-button-secondary">
          {t.clear}
        </button>
      </div>
      {more !== undefined && (
        <details className="eds-filter-bar-more">
          <summary>
            {t.more}
            {moreCount !== undefined && moreCount > 0 && (
              <>
                {' '}
                <span className="eds-filter-bar-count">({moreCount})</span>
              </>
            )}
          </summary>
          {more}
        </details>
      )}
      <ul className="eds-filter-chips" aria-label={t.chips}>
        {active.map((filter, index) => (
          <li key={filter.key}>
            <button
              type="button"
              className="eds-chip"
              onClick={() => {
                pendingFocus.current = index;
                filter.onRemove();
              }}
            >
              {filter.label}
              <svg viewBox="0 0 16 16" focusable="false" aria-hidden="true">
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
              <span className="eds-visually-hidden">{t.remove}</span>
            </button>
          </li>
        ))}
      </ul>
    </form>
  );
});
FilterBar.displayName = 'FilterBar';
