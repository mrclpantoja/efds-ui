import { useEffect, useId, useRef, useState } from 'react';
import { format, getMessages } from '@efds-ui/behavior/export';
import { Glyph } from '../../internal/Glyph';
import { mergeTexts } from '../../utils/texts';
import { Button } from '../Button';
import { Popover } from '../Popover';
import type { TableColumnsController } from './useTableColumns';

export interface TableColumnsMenuTexts {
  /** Botão que abre o painel. */
  button: string;
  title: string;
  restore: string;
  restored: string;
  hidden: (column: string, visible: number, total: number) => string;
  shown: (column: string, visible: number, total: number) => string;
  lastVisible: string;
  moveBefore: (column: string) => string;
  moveAfter: (column: string) => string;
  narrow: (column: string) => string;
  widen: (column: string) => string;
}

const defaultTexts = (): TableColumnsMenuTexts => {
  const m = getMessages();
  return {
    button: m.columnsButton,
    title: m.columnsTitle,
    restore: m.columnsRestore,
    restored: m.columnsRestored,
    hidden: (column, visible, total) => format(m.columnHidden, { column, visible, total }),
    shown: (column, visible, total) => format(m.columnShown, { column, visible, total }),
    lastVisible: m.columnLastVisible,
    moveBefore: (column) => format(m.columnMoveBefore, { column }),
    moveAfter: (column) => format(m.columnMoveAfter, { column }),
    narrow: (column) => format(m.columnNarrow, { column }),
    widen: (column) => format(m.columnWiden, { column }),
  };
};

export interface TableColumnsMenuProps {
  controller: TableColumnsController;
  /** Botões de mover (alternativa ao arrasto, WCAG 2.5.7). Padrão: `true`. */
  reorderable?: boolean;
  /** Botões de estreitar e alargar (passo de 16 px). Padrão: `false`. */
  resizable?: boolean;
  texts?: Partial<TableColumnsMenuTexts>;
}

const STEP = 16;
const group = (pin: 'start' | 'end' | undefined) => pin ?? 'free';

/**
 * Painel "Colunas": mostrar e ocultar, mover e redimensionar por botões (alternativa ao arrasto) e
 * "Restaurar padrão". Os anúncios saem pela região de status da `<Table columnsController>`.
 */
export function TableColumnsMenu({
  controller,
  reorderable = true,
  resizable = false,
  texts,
}: TableColumnsMenuProps) {
  const t = mergeTexts(defaultTexts(), texts);
  const titleId = useId();
  const list = useRef<HTMLUListElement>(null);
  const [refocus, setRefocus] = useState<{ id: string; action: string } | null>(null);
  const movable = controller.all.filter((c) => !c.locked);

  // Mover reordena o DOM da lista e o navegador solta o foco: ele volta ao botão acionado.
  useEffect(() => {
    if (!refocus) return;
    list.current
      ?.querySelector<HTMLElement>(`[data-col="${refocus.id}"][data-act="${refocus.action}"]`)
      ?.focus();
  }, [refocus]);

  const total = movable.length;
  const visibleCount = movable.filter((c) => controller.columns.includes(c)).length;

  const toggle = (id: string, label: string, show: boolean) => {
    if (!show && !controller.canHide(id)) {
      controller.announce(t.lastVisible);
      return;
    }
    controller.toggle(id, show);
    const visible = visibleCount + (show ? 1 : -1);
    controller.announce(show ? t.shown(label, visible, total) : t.hidden(label, visible, total));
  };

  const moveBy = (id: string, delta: number, label: string) => {
    const def = controller.all.find((c) => c.id === id);
    if (!def) return;
    const peers = movable.filter((c) => group(c.pin) === group(def.pin));
    const target = peers[peers.findIndex((c) => c.id === id) + delta];
    setRefocus({ id, action: delta < 0 ? 'before' : 'after' });
    if (!target) return;
    controller.move(id, controller.state.order.indexOf(target.id));
    const visible = controller.columns.filter((c) => !c.locked);
    const at = visible.findIndex((c) => c.id === id);
    const pos = at + 1 + (at >= 0 && visible.some((c) => c.id === target.id) ? delta : 0);
    controller.announce(
      format(getMessages().columnMoved, { column: label, pos, total: visible.length }),
    );
  };

  const resizeBy = (id: string, delta: number, label: string, fallback: number) => {
    const def = controller.all.find((c) => c.id === id);
    const measured = document.querySelector<HTMLElement>(`th[data-eds-col="${id}"]`)?.offsetWidth;
    const current = controller.state.widths[id] ?? measured ?? def?.defaultWidth ?? fallback;
    setRefocus({ id, action: delta < 0 ? 'narrow' : 'widen' });
    controller.resize(id, current + delta);
    const width = Math.min(Math.max(current + delta, def?.minWidth ?? 64), def?.maxWidth ?? 640);
    controller.announce(format(getMessages().columnResized, { column: label, width }));
  };

  const iconButton = (
    id: string,
    action: string,
    label: string,
    d: string,
    onClick: () => void,
    disabled = false,
  ) => (
    <Button
      variant="ghost"
      size="sm"
      iconOnly
      aria-label={label}
      aria-disabled={disabled || undefined}
      data-col={id}
      data-act={action}
      onClick={() => {
        if (!disabled) onClick();
      }}
    >
      <Glyph d={d} />
    </Button>
  );

  return (
    <Popover
      className="eds-table-columns"
      aria-label={t.title}
      trigger={
        <Button variant="secondary" size="sm">
          {t.button}
        </Button>
      }
    >
      <p className="eds-table-columns-title" id={titleId}>
        {t.title}
      </p>
      <ul className="eds-table-columns-list" ref={list}>
        {movable.map((c) => {
          const shown = controller.columns.includes(c);
          const peers = movable.filter((p) => group(p.pin) === group(c.pin));
          const at = peers.findIndex((p) => p.id === c.id);
          return (
            <li key={c.id} className="eds-table-columns-item">
              <label className="eds-check">
                <input
                  type="checkbox"
                  className="eds-checkbox"
                  checked={shown}
                  aria-disabled={shown && !controller.canHide(c.id) ? true : undefined}
                  onChange={(e) => toggle(c.id, c.label, e.target.checked)}
                />
                {c.label}
              </label>
              {reorderable &&
                iconButton(
                  c.id,
                  'before',
                  t.moveBefore(c.label),
                  'M12 19V5M5 12l7-7 7 7',
                  () => moveBy(c.id, -1, c.label),
                  at <= 0,
                )}
              {reorderable &&
                iconButton(
                  c.id,
                  'after',
                  t.moveAfter(c.label),
                  'M12 5v14M19 12l-7 7-7-7',
                  () => moveBy(c.id, 1, c.label),
                  at >= peers.length - 1,
                )}
              {resizable &&
                iconButton(c.id, 'narrow', t.narrow(c.label), 'M5 12h14', () =>
                  resizeBy(c.id, -STEP, c.label, 160),
                )}
              {resizable &&
                iconButton(c.id, 'widen', t.widen(c.label), 'M12 5v14M5 12h14', () =>
                  resizeBy(c.id, STEP, c.label, 160),
                )}
            </li>
          );
        })}
      </ul>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          controller.reset();
          controller.announce(t.restored);
        }}
      >
        {t.restore}
      </Button>
    </Popover>
  );
}
