import { useEffect, useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react';
import { format, getMessages } from '@efds-ui/behavior/export';
import { useAnnouncer } from '../../internal/announcer';
import { mergeTexts } from '../../utils/texts';
import { Button } from '../Button';

export interface TableBulkBarTexts {
  /** Nome do grupo. */
  label: string;
  count: (count: number) => string;
  /** "Selecionar todos os {total}". */
  allResults: (total: number) => string;
  /** "Todos os {total} selecionados." */
  allSelected: (total: number) => string;
  clear: string;
}

const defaultTexts = (): TableBulkBarTexts => {
  const m = getMessages();
  return {
    label: m.bulkLabel,
    count: (count) => (count === 1 ? m.bulkCountOne : format(m.bulkCount, { count })),
    allResults: (total) => format(m.bulkAllResults, { total }),
    allSelected: (total) => format(m.bulkAllSelected, { total }),
    clear: m.bulkClear,
  };
};

export interface TableBulkBarProps {
  /** Linhas selecionadas na página; a barra só aparece com `count > 0`. */
  count: number;
  /** Total de resultados (tabela remota): habilita "Selecionar todos os N". */
  total?: number;
  /** `all` = todos os resultados, não só a página. Padrão: `page`. */
  scope?: 'page' | 'all';
  onClear: () => void;
  /** Pedido de "Selecionar todos os N resultados" (a seleção entre páginas é do app). */
  onSelectAllResults?: () => void;
  /** Para onde o foco vai se a barra se esconder com o foco dentro (ex.: o "selecionar todos"). */
  returnFocusTo?: RefObject<HTMLElement | null>;
  texts?: Partial<TableBulkBarTexts>;
  /** As ações: botões. */
  children?: ReactNode;
}

/** Se a barra se escondeu com o foco dentro, devolve o foco a um lugar que continua existindo. */
function returnFocus(
  bar: HTMLElement | null,
  state: { had: boolean },
  returnTo: RefObject<HTMLElement | null> | undefined,
) {
  if (!bar || !state.had) return;
  state.had = false;
  const active = bar.ownerDocument.activeElement;
  if (active && active !== bar.ownerDocument.body && !bar.contains(active)) return;
  const sibling = bar.previousElementSibling;
  const target =
    returnTo?.current ??
    sibling?.querySelector<HTMLElement>('thead input[type="checkbox"]') ??
    (sibling instanceof HTMLElement ? sibling : null);
  if (!target) return;
  if (!target.matches('input, button, a[href], [tabindex]')) target.tabIndex = -1;
  target.focus({ preventScroll: true });
}

/**
 * Barra de ações em lote, depois do `.eds-table-wrap`. Fica sempre montada (`hidden` sem seleção);
 * a contagem é texto comum e o anúncio sai pela região de status própria (uma só leitura).
 */
export function TableBulkBar({
  count,
  total,
  scope = 'page',
  onClear,
  onSelectAllResults,
  returnFocusTo,
  texts,
  children,
}: TableBulkBarProps) {
  const t = mergeTexts(defaultTexts(), texts);
  const group = useRef<HTMLDivElement>(null);
  const focusState = useRef({ had: false });
  const { text: status, announce } = useAnnouncer();
  const first = useRef(true);
  const allResults = scope === 'all' && total !== undefined;
  const offerAll =
    scope === 'page' && onSelectAllResults !== undefined && total !== undefined && total > count;

  // Anuncia a seleção (não na montagem).
  const message = count === 0 ? '' : allResults ? t.allSelected(total) : t.count(count);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (message !== '') announce(message);
  }, [message, announce]);

  // A barra some com o foco dentro: o foco vai para o "selecionar todos" (ou o wrap).
  useLayoutEffect(() => {
    if (count === 0) returnFocus(group.current, focusState.current, returnFocusTo);
  }, [count, returnFocusTo]);

  return (
    <>
      <div
        ref={group}
        className="eds-table-bulk"
        role="group"
        aria-label={t.label}
        hidden={count === 0}
        onFocus={() => {
          focusState.current.had = true;
        }}
        onBlur={(event) => {
          if (event.relatedTarget) focusState.current.had = false;
        }}
      >
        <p className="eds-table-bulk-count">
          <span>{allResults ? t.allSelected(total) : t.count(count)}</span>
        </p>
        {offerAll && (
          <Button variant="ghost" size="sm" onClick={onSelectAllResults}>
            {t.allResults(total)}
          </Button>
        )}
        <div className="eds-table-bulk-actions">{children}</div>
        <Button variant="ghost" size="sm" onClick={onClear}>
          {t.clear}
        </Button>
      </div>
      <span className="eds-visually-hidden" role="status">
        {status}
      </span>
    </>
  );
}
