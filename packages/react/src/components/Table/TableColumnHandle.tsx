import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Glyph } from '../../internal/Glyph';
import { useTableContext } from './tableContext';
import type { TableColumnDef, TableColumnState } from './useTableColumns';

const STEP = 16;
const STEP_LARGE = 64;
const DRAG_THRESHOLD = 4;

const groupOf = (c: TableColumnDef) => c.pin ?? 'free';

/**
 * Alça de ajuste de uma coluna (um tab stop por coluna): Espaço pega, setas movem, Shift+setas
 * redimensionam, Espaço solta, Esc cancela (padrão do Sortable). Arrastar a alça reordena e
 * arrastar a borda (`.eds-table-resize`) redimensiona. Dentro de `.eds-table-th`.
 */
export function TableColumnHandle({ def }: { def: TableColumnDef }) {
  const ctx = useTableContext();
  const controller = ctx?.columns;
  const [grabbed, setGrabbed] = useState(false);
  const snapshot = useRef<TableColumnState | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const dragged = useRef(false);

  // Mover a coluna reordena o DOM e o navegador solta o foco: ele volta para a alça.
  useEffect(() => {
    const el = button.current;
    if (grabbed && el && el.ownerDocument.activeElement !== el) el.focus();
  });

  if (!ctx || !controller) return null;
  const { texts, announce, resizable, reorderable } = ctx;

  const rtl = () => (button.current ? getComputedStyle(button.current).direction === 'rtl' : false);
  const peers = () => controller.columns.filter((c) => !c.locked && groupOf(c) === groupOf(def));
  const thWidth = () => button.current?.closest('th')?.offsetWidth ?? def.defaultWidth ?? 0;

  const moveTo = (target: TableColumnDef | undefined) => {
    if (!target || target.id === def.id) return;
    controller.move(def.id, controller.state.order.indexOf(target.id));
    announce(
      texts.columnMoved(
        def.label,
        controller.position(target.id).pos,
        controller.position(target.id).total,
      ),
    );
  };

  const release = (restore: boolean) => {
    if (restore && snapshot.current) controller.setState(snapshot.current, 'move');
    snapshot.current = null;
    setGrabbed(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const { key } = event;
    if (!grabbed) {
      if (key === ' ' || key === 'Enter') {
        event.preventDefault();
        snapshot.current = controller.state;
        setGrabbed(true);
        announce(texts.columnGrab(def.label));
      }
      return;
    }
    if (key === ' ' || key === 'Enter') {
      event.preventDefault();
      const { pos, total } = controller.position(def.id);
      release(false);
      announce(texts.columnDrop(def.label, pos, total));
    } else if (key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      release(true);
      announce(texts.columnCancel);
    } else if (key === 'Tab') {
      // Como no Sortable: cancela e o foco segue.
      release(true);
      announce(texts.columnCancel);
    } else if (key === 'ArrowLeft' || key === 'ArrowRight') {
      event.preventDefault();
      const direction = (key === 'ArrowRight' ? 1 : -1) * (rtl() ? -1 : 1);
      if (event.shiftKey) {
        if (!resizable) return;
        const next =
          (controller.state.widths[def.id] ?? thWidth()) +
          direction * (event.ctrlKey ? STEP_LARGE : STEP);
        controller.resize(def.id, next);
        const min = def.minWidth ?? 64;
        const max = def.maxWidth ?? 640;
        announce(texts.columnResized(def.label, Math.round(Math.min(Math.max(next, min), max))));
      } else if (reorderable) {
        const list = peers();
        moveTo(list[list.findIndex((c) => c.id === def.id) + direction]);
      }
    } else if ((key === 'Home' || key === 'End') && reorderable) {
      event.preventDefault();
      const list = peers();
      moveTo(key === 'Home' ? list[0] : list[list.length - 1]);
    }
  };

  // Ponteiro: arrastar a alça reordena (a coluna sob o ponteiro, do mesmo grupo).
  const onHandlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (!reorderable || event.button !== 0) return;
    const startX = event.clientX;
    dragged.current = false;
    const move = (e: globalThis.PointerEvent) => {
      if (!dragged.current && Math.abs(e.clientX - startX) < DRAG_THRESHOLD) return;
      dragged.current = true;
      const over = button.current?.ownerDocument
        .elementFromPoint(e.clientX, e.clientY)
        ?.closest('th[data-eds-col]');
      const id = over?.getAttribute('data-eds-col');
      const target = controller.columns.find((c) => c.id === id);
      if (target && !target.locked && groupOf(target) === groupOf(def)) moveTo(target);
    };
    const end = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  };

  // Ponteiro: arrastar a borda redimensiona; duplo clique volta à largura automática.
  const onResizePointerDown = (event: PointerEvent<HTMLSpanElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = controller.state.widths[def.id] ?? thWidth();
    const sign = rtl() ? -1 : 1;
    let last = startWidth;
    const move = (e: globalThis.PointerEvent) => {
      last = startWidth + sign * (e.clientX - startX);
      controller.resize(def.id, last);
    };
    const end = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      if (last !== startWidth) {
        const min = def.minWidth ?? 64;
        const max = def.maxWidth ?? 640;
        announce(texts.columnResized(def.label, Math.round(Math.min(Math.max(last, min), max))));
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  };

  return (
    <>
      <button
        ref={button}
        type="button"
        className="eds-table-colhandle"
        aria-pressed={grabbed}
        aria-label={texts.columnHandleLabel(def.label)}
        aria-describedby={ctx.helpId}
        onKeyDown={onKeyDown}
        onPointerDown={onHandlePointerDown}
      >
        <Glyph d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" />
      </button>
      {resizable && (
        <span
          className="eds-table-resize"
          aria-hidden="true"
          onPointerDown={onResizePointerDown}
          onDoubleClick={() => {
            const widths = { ...controller.state.widths };
            delete widths[def.id];
            controller.setState({ ...controller.state, widths }, 'resize');
          }}
        />
      )}
    </>
  );
}
