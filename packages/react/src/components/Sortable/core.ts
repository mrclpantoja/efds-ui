import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useAnnouncer } from '../../internal/announcer';
import {
  beginPointerDrag,
  containsPoint,
  findScrollParent,
  type DragPoint,
} from '../../internal/drag';

export interface SortableItemData {
  id: string;
  /** Nome falado nas instruções e anúncios. Padrão: o `id`. */
  label?: string;
  /** Desliga o arrasto deste item. */
  disabled?: boolean;
}

export type SortableOrientation = 'vertical' | 'horizontal' | 'grid';

export interface SortableChange {
  id: string;
  /** Chave da lista de origem e de destino (iguais quando só reordenou). */
  from: string;
  to: string;
  fromIndex: number;
  toIndex: number;
}

export interface SortableTexts {
  /** Instrução ligada ao pegador por `aria-describedby`. */
  help: string;
  handleLabel: (label: string) => string;
  grabbed: (label: string, position: number, size: number, list: string) => string;
  moved: (position: number, size: number) => string;
  movedToList: (list: string, position: number, size: number) => string;
  dropped: (label: string, position: number, size: number, list: string) => string;
  cancelled: string;
  /** Não há lista vizinha na direção pedida. */
  noList: string;
  /** Nome da lista sem rótulo. */
  listDefault: string;
}

export const defaultSortableTexts: SortableTexts = {
  help: 'Espaço pega o item; setas movem; Espaço solta; Esc cancela.',
  handleLabel: (label) => `Mover ${label}`,
  grabbed: (label, position, size, list) =>
    `${label} pego. Posição ${position} de ${size} em ${list}. Use as setas para mover, Espaço para soltar, Esc para cancelar.`,
  moved: (position, size) => `Posição ${position} de ${size}.`,
  movedToList: (list, position, size) => `Em ${list}, posição ${position} de ${size}.`,
  dropped: (label, position, size, list) =>
    `${label} solto na posição ${position} de ${size} em ${list}.`,
  cancelled: 'Movimento cancelado.',
  noList: 'Não há outra lista nessa direção.',
  listDefault: 'esta lista',
};

export type SortableLists = Record<string, SortableItemData[]>;

export interface ListMeta {
  el: HTMLElement | null;
  label: string;
  orientation: SortableOrientation;
  disabled: boolean;
}

interface Active {
  id: string;
  label: string;
  from: string;
  fromIndex: number;
  mode: 'keyboard' | 'pointer';
}

export interface SortableUi {
  /** Listas com o item já movido (só no teclado; o ponteiro mostra o espaço reservado). */
  draft: SortableLists | null;
  active: Active | null;
  /** Posição do espaço reservado durante o arrasto por ponteiro. */
  placeholder: { key: string; index: number; width: number; height: number } | null;
  dropKey: string | null;
}

const emptyUi: SortableUi = { draft: null, active: null, placeholder: null, dropKey: null };

function locate(lists: SortableLists, id: string): { key: string; index: number } | null {
  for (const key of Object.keys(lists)) {
    const index = lists[key]!.findIndex((item) => item.id === id);
    if (index >= 0) return { key, index };
  }
  return null;
}

/** Move `id` para `toIndex` de `toKey` (índice na lista já sem o item). Puro. */
export function moveItem(
  lists: SortableLists,
  id: string,
  toKey: string,
  toIndex: number,
): SortableLists {
  const from = locate(lists, id);
  if (!from) return lists;
  const item = lists[from.key]![from.index]!;
  const next: SortableLists = { ...lists, [from.key]: lists[from.key]!.filter((i) => i.id !== id) };
  const target = [...next[toKey]!];
  target.splice(Math.max(0, Math.min(toIndex, target.length)), 0, item);
  next[toKey] = target;
  return next;
}

/** Índice de inserção entre os itens (sem o arrastado) para o ponto dado. */
export function indexAt(
  container: HTMLElement,
  draggedId: string,
  x: number,
  y: number,
  orientation: SortableOrientation,
): number {
  const items = Array.from(container.children).filter(
    (child): child is HTMLElement =>
      child instanceof HTMLElement &&
      child.classList.contains('eds-sortable-item') &&
      child.dataset.id !== draggedId,
  );
  for (let i = 0; i < items.length; i += 1) {
    const r = items[i]!.getBoundingClientRect();
    const midX = r.left + r.width / 2;
    const midY = r.top + r.height / 2;
    const before =
      orientation === 'horizontal'
        ? x < midX
        : orientation === 'grid'
          ? y < r.top || (y <= r.bottom && x < midX)
          : y < midY;
    if (before) return i;
  }
  return items.length;
}

/**
 * Colunas da grade: itens na mesma linha do primeiro. A folga é meia altura do item: o item pego
 * fica "levantado" alguns pixels pelo CSS e não pode contar como outra linha.
 */
function gridColumns(container: HTMLElement | null): number {
  const items = Array.from(container?.children ?? []).filter((c) =>
    c.classList.contains('eds-sortable-item'),
  );
  const first = items[0];
  if (!first) return 1;
  const rect = first.getBoundingClientRect();
  const slack = Math.max(2, rect.height / 2);
  return Math.max(
    1,
    items.filter((i) => Math.abs(i.getBoundingClientRect().top - rect.top) < slack).length,
  );
}

export interface SortableCore {
  helpId: string;
  status: string;
  texts: SortableTexts;
  ui: SortableUi;
  /** Itens a desenhar na lista (com o item movido no teclado). */
  itemsOf: (key: string, fallback: SortableItemData[]) => SortableItemData[];
  register: (key: string, meta: ListMeta) => () => void;
  onKeyDown: (
    event: ReactKeyboardEvent<HTMLElement>,
    key: string,
    item: SortableItemData,
    label: string,
  ) => void;
  onPointerDown: (
    event: ReactPointerEvent<HTMLElement>,
    key: string,
    item: SortableItemData,
    label: string,
    itemEl: HTMLElement,
    /** Toque: segurar 400 ms antes de arrastar (item sem pegador). */
    holdOnTouch?: boolean,
  ) => void;
  onBlur: (event: ReactFocusEvent<HTMLElement>, item: SortableItemData) => void;
}

export const SortableContext = createContext<{
  core: SortableCore;
  lists: SortableLists | null;
  group: string;
} | null>(null);

export function useSortableContext() {
  return useContext(SortableContext);
}

/**
 * Estado e comportamento compartilhados por Sortable (uma lista) e SortableGroup (várias):
 * teclado (pegar, mover, trocar de lista, soltar, cancelar), ponteiro e anúncios.
 */
export function useSortableCore(
  lists: SortableLists,
  textsIn: Partial<SortableTexts> | undefined,
  commit: (next: SortableLists, change: SortableChange) => void,
): SortableCore {
  const texts: SortableTexts = { ...defaultSortableTexts, ...textsIn };
  const helpId = `${useId()}-help`;
  const announcer = useAnnouncer();
  const metas = useRef(new Map<string, ListMeta>());
  const [ui, setUi] = useState<SortableUi>(emptyUi);
  const uiRef = useRef<SortableUi>(emptyUi);
  const latest = useRef({ lists, texts, commit });
  const pendingFocus = useRef<string | null>(null);
  const cancelPointer = useRef<(() => void) | null>(null);

  useLayoutEffect(() => {
    latest.current = { lists, texts, commit };
  });

  const setState = useCallback((next: SortableUi) => {
    uiRef.current = next;
    setUi(next);
  }, []);

  const display = (): SortableLists => uiRef.current.draft ?? latest.current.lists;
  const listLabel = (key: string) =>
    metas.current.get(key)?.label || latest.current.texts.listDefault;

  /** Chaves das listas habilitadas, na ordem do documento. */
  const orderedKeys = () =>
    Array.from(metas.current.entries())
      .filter(([, meta]) => meta.el && !meta.disabled)
      .sort(([, a], [, b]) =>
        a.el!.compareDocumentPosition(b.el!) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
      )
      .map(([key]) => key);

  // Depois de uma troca de lista o item remonta: devolve o foco ao pegador.
  useLayoutEffect(() => {
    const id = pendingFocus.current;
    if (!id) return;
    pendingFocus.current = null;
    for (const meta of metas.current.values()) {
      const item = Array.from(meta.el?.children ?? []).find(
        (child): child is HTMLElement => child instanceof HTMLElement && child.dataset.id === id,
      );
      if (item) {
        (item.querySelector<HTMLElement>('.eds-sortable-handle') ?? item).focus();
        return;
      }
    }
  });

  const register = useCallback((key: string, meta: ListMeta) => {
    metas.current.set(key, meta);
    return () => {
      if (metas.current.get(key) === meta) metas.current.delete(key);
    };
  }, []);

  const clear = (focusId: string | null) => {
    cancelPointer.current = null;
    pendingFocus.current = focusId;
    setState(emptyUi);
  };

  const finishDrop = () => {
    const state = uiRef.current;
    const active = state.active;
    if (!active) return;
    const base = latest.current.lists;
    let next: SortableLists;
    if (active.mode === 'keyboard') {
      next = state.draft ?? base;
    } else {
      const p = state.placeholder;
      next = p ? moveItem(base, active.id, p.key, p.index) : base;
    }
    const to = locate(next, active.id) ?? { key: active.from, index: active.fromIndex };
    const changed = to.key !== active.from || to.index !== active.fromIndex;
    clear(active.id);
    if (changed) {
      latest.current.commit(next, {
        id: active.id,
        from: active.from,
        to: to.key,
        fromIndex: active.fromIndex,
        toIndex: to.index,
      });
    }
    announcer.announce(
      latest.current.texts.dropped(
        active.label,
        to.index + 1,
        next[to.key]!.length,
        listLabel(to.key),
      ),
    );
  };

  /** `refocus: false` quando o usuário saiu do item (Tab): o foco fica onde ele o pôs. */
  const cancel = (refocus = true) => {
    const active = uiRef.current.active;
    if (!active) return;
    clear(refocus ? active.id : null);
    announcer.announce(latest.current.texts.cancelled);
  };

  // Desmontar no meio de um arrasto: solta o motor.
  useEffect(
    () => () => {
      cancelPointer.current?.();
    },
    [],
  );

  const grab = (key: string, item: SortableItemData, label: string) => {
    const lists0 = latest.current.lists;
    const index = lists0[key]!.findIndex((i) => i.id === item.id);
    if (index < 0) return;
    setState({
      ...emptyUi,
      draft: lists0,
      active: { id: item.id, label, from: key, fromIndex: index, mode: 'keyboard' },
    });
    announcer.announce(
      latest.current.texts.grabbed(label, index + 1, lists0[key]!.length, listLabel(key)),
    );
  };

  const keyboardMove = (delta: number) => {
    const state = uiRef.current;
    const active = state.active!;
    const lists0 = display();
    const at = locate(lists0, active.id)!;
    const size = lists0[at.key]!.length;
    const index = Math.max(0, Math.min(size - 1, at.index + delta));
    if (index !== at.index) {
      setState({ ...state, draft: moveItem(lists0, active.id, at.key, index) });
      pendingFocus.current = active.id;
      announcer.announce(latest.current.texts.moved(index + 1, size));
    } else {
      announcer.announce(latest.current.texts.moved(at.index + 1, size));
    }
  };

  const keyboardSwitch = (delta: number) => {
    const state = uiRef.current;
    const active = state.active!;
    const lists0 = display();
    const at = locate(lists0, active.id)!;
    const keys = orderedKeys();
    const target = keys[keys.indexOf(at.key) + delta];
    if (target === undefined) {
      announcer.announce(latest.current.texts.noList);
      return;
    }
    const index = Math.min(at.index, lists0[target]!.length);
    setState({ ...state, draft: moveItem(lists0, active.id, target, index) });
    pendingFocus.current = active.id;
    announcer.announce(
      latest.current.texts.movedToList(listLabel(target), index + 1, lists0[target]!.length + 1),
    );
  };

  const onKeyDown: SortableCore['onKeyDown'] = (event, key, item, label) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const state = uiRef.current;
    const meta = metas.current.get(key);
    if (!state.active) {
      if (event.key !== ' ' && event.key !== 'Enter') return;
      event.preventDefault();
      if (!meta || meta.disabled || item.disabled) return;
      grab(key, item, label);
      return;
    }
    if (state.active.mode !== 'keyboard' || state.active.id !== item.id) return;
    const at = locate(display(), item.id);
    const orientation = (at && metas.current.get(at.key)?.orientation) ?? 'vertical';
    const k = event.key;
    if (k === ' ' || k === 'Enter') {
      event.preventDefault();
      finishDrop();
    } else if (k === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      cancel();
    } else if (k === 'PageUp' || k === 'PageDown') {
      event.preventDefault();
      keyboardSwitch(k === 'PageUp' ? -1 : 1);
    } else if (k === 'Home' || k === 'End') {
      event.preventDefault();
      const size = display()[at!.key]!.length;
      keyboardMove(k === 'Home' ? -size : size);
    } else if (k.startsWith('Arrow')) {
      event.preventDefault();
      const along = k === 'ArrowUp' || k === 'ArrowDown' ? 'v' : 'h';
      const sign = k === 'ArrowUp' || k === 'ArrowLeft' ? -1 : 1;
      if (orientation === 'grid') {
        if (along === 'h') keyboardMove(sign);
        else {
          const el = metas.current.get(at!.key)?.el ?? null;
          const columns = gridColumns(el);
          const size = display()[at!.key]!.length;
          keyboardMove(columns < size ? sign * columns : 0);
        }
      } else if (orientation === 'horizontal') {
        if (along === 'h') keyboardMove(sign);
        else keyboardSwitch(sign);
      } else if (along === 'v') keyboardMove(sign);
      else keyboardSwitch(sign);
    }
  };

  const onBlur: SortableCore['onBlur'] = (event, item) => {
    const active = uiRef.current.active;
    if (!active || active.mode !== 'keyboard' || active.id !== item.id) return;
    // Sem destino, o foco caiu porque o React moveu o item no DOM: o efeito acima o devolve.
    const next = event.relatedTarget;
    if (!(next instanceof Node)) return;
    // Sair do item pego (Tab, clique em outro controle) cancela, mesmo para outro item da lista.
    const itemEl = event.currentTarget.closest('.eds-sortable-item');
    if (itemEl?.contains(next)) return;
    cancel(false);
  };

  const pointerMove = (point: DragPoint) => {
    const state = uiRef.current;
    const active = state.active;
    if (!active) return;
    let key: string | null = null;
    for (const [k, meta] of metas.current) {
      if (meta.el && !meta.disabled && containsPoint(meta.el, point.x, point.y)) {
        key = k;
        break;
      }
    }
    if (key === null) {
      if (state.dropKey !== null || state.placeholder) {
        setState({ ...state, dropKey: null });
      }
      return;
    }
    const meta = metas.current.get(key)!;
    const index = indexAt(meta.el!, active.id, point.x, point.y, meta.orientation);
    const prev = state.placeholder;
    if (prev && prev.key === key && prev.index === index && state.dropKey === key) return;
    setState({
      ...state,
      dropKey: key,
      placeholder: { key, index, width: prev?.width ?? 0, height: prev?.height ?? 0 },
    });
  };

  const onPointerDown: SortableCore['onPointerDown'] = (
    event,
    key,
    item,
    label,
    itemEl,
    holdOnTouch,
  ) => {
    if (uiRef.current.active || event.button !== 0) return;
    const meta = metas.current.get(key);
    if (!meta || meta.disabled || item.disabled) return;
    const rect = itemEl.getBoundingClientRect();
    const index = latest.current.lists[key]!.findIndex((i) => i.id === item.id);
    cancelPointer.current = beginPointerDrag(
      {
        pointerId: event.pointerId,
        clientX: event.clientX,
        clientY: event.clientY,
        pointerType: event.pointerType,
      },
      {
        source: itemEl,
        touchHoldMs: holdOnTouch ? 400 : undefined,
        scrollParent: () => findScrollParent(meta.el),
        onStart: () => {
          setState({
            draft: null,
            active: { id: item.id, label, from: key, fromIndex: index, mode: 'pointer' },
            placeholder: { key, index, width: rect.width, height: rect.height },
            dropKey: key,
          });
        },
        onMove: pointerMove,
        onEnd: (_point, outcome) => (outcome === 'drop' ? finishDrop() : cancel()),
      },
    );
  };

  const itemsOf: SortableCore['itemsOf'] = (key, fallback) => ui.draft?.[key] ?? fallback;

  return {
    helpId,
    status: announcer.text,
    texts,
    ui,
    itemsOf,
    register,
    onKeyDown,
    onPointerDown,
    onBlur,
  };
}
