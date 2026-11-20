import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type Ref,
} from 'react';
import { cx } from '../../utils/cx';
import { useAnnouncer } from '../../internal/announcer';
import { beginPointerDrag, findScrollParent, type DragPoint } from '../../internal/drag';
import { useControllable } from '../../internal/useControllable';
import { useOptionalDialog } from '../Dialog/Dialog';
import { useOptionalToast } from '../Toast/Toast';
import { TreeActions, type TreeActionHandlers } from './TreeActions';
import { RenameInput } from './RenameInput';
import { defaultTreeTexts, type TreeTexts } from './texts';
import {
  applyLoaded,
  containsId,
  descendantCount,
  flatten,
  idsWithChildren,
  insertNode,
  isLazy,
  isParent,
  locate,
  mapNode,
  removeNode,
  toJson,
  type TreeNodeData,
} from './tree-ops';

export type { TreeNodeData, TreeTexts };

export type TreeAction = 'add' | 'rename' | 'move' | 'delete' | 'wrap';

export interface TreeChange {
  action: TreeAction;
  /** Nó afetado (já no estado novo; no `delete`, o nó removido). */
  node: TreeNodeData;
  /** Pai do nó depois da mudança (`null` = raiz). */
  parent: TreeNodeData | null;
  /** Posição entre os irmãos depois da mudança. */
  index: number;
}

type DropZone = 'before' | 'inside' | 'after';
interface DropState {
  id: string;
  zone: DropZone;
  invalid: boolean;
}

export interface TreeProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'onChange' | 'onSelect' | 'children'
> {
  /** Nós (controlado). Use com `onChange`. */
  items?: TreeNodeData[];
  /** Nós iniciais (não controlado). */
  defaultItems?: TreeNodeData[];
  /** Chamado a cada mudança (add, rename, move, delete, wrap) com a nova estrutura. */
  onChange?: (items: TreeNodeData[], change: TreeChange) => void;
  /** Devolver `false` cancela a mudança (validação no servidor). */
  onBeforeChange?: (change: TreeChange, next: TreeNodeData[]) => boolean | void;
  /** Nome falado da árvore (`aria-label`). */
  label: string;
  /** Renomear, adicionar, excluir, mover e arrastar. */
  editable?: boolean;
  /** Seleção múltipla (Ctrl/Shift + clique). */
  multiselect?: boolean;
  /** Ids selecionados (controlado). */
  selected?: string[];
  defaultSelected?: string[];
  onSelect?: (ids: string[]) => void;
  /** Enter no nó. */
  onActivate?: (node: TreeNodeData) => void;
  /** Ids expandidos (controlado). */
  expanded?: string[];
  /** Ids expandidos de início, ou `'all'`. */
  defaultExpanded?: string[] | 'all';
  onExpandedChange?: (ids: string[]) => void;
  /** Com `name`, um hidden com o JSON da árvore, para formulário. */
  name?: string;
  /**
   * Carrega os filhos de um nó com `hasChildren` ao expandir pela primeira vez. Enquanto
   * espera, o item fica com `aria-busy`; se rejeitar, anuncia o erro e uma nova expansão tenta de novo.
   */
  loadChildren?: (node: TreeNodeData) => Promise<TreeNodeData[]>;
  /** Gera o id de um nó novo. Padrão: contador local. */
  createId?: () => string;
  texts?: Partial<TreeTexts>;
}

const normalize = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

const HOVER_EXPAND_MS = 600;
const UNDO_MS = 8000;
const TOUCH_HOLD_MS = 400;

/**
 * Árvore (APG Treeview) com edição opcional: renomear (F2/duplo clique), adicionar filho, irmão e
 * pai, excluir com confirmação, mover por Alt+setas ou arrastando, e menu "⋯" (Shift+F10).
 * Controlada (`items` + `onChange`) ou não (`defaultItems`).
 */
export const Tree = forwardRef<HTMLDivElement, TreeProps>(function Tree(
  {
    items: itemsProp,
    defaultItems,
    onChange,
    onBeforeChange,
    label,
    editable = false,
    multiselect = false,
    selected: selectedProp,
    defaultSelected,
    onSelect,
    onActivate,
    expanded: expandedProp,
    defaultExpanded,
    onExpandedChange,
    name,
    createId,
    loadChildren,
    texts: textsIn,
    className,
    ...rest
  },
  ref,
) {
  const texts: TreeTexts = { ...defaultTreeTexts, ...textsIn };
  const idPrefix = useId();
  const counter = useRef(0);
  const dialog = useOptionalDialog();
  const toast = useOptionalToast();
  const announcer = useAnnouncer();
  const rootRef = useRef<HTMLDivElement | null>(null);
  useImperativeHandle(ref, () => rootRef.current as HTMLDivElement);

  const [inner, setInner] = useState<TreeNodeData[]>(defaultItems ?? []);
  const [loaded, setLoaded] = useState<Record<string, TreeNodeData[]>>({});
  const [busy, setBusy] = useState<ReadonlySet<string>>(new Set());
  const mounted = useRef(true);
  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set());
  /** Itens recém-criados ainda sem nome dado pelo usuário: o 1º nome fala "adicionado". */
  const fresh = useRef(new Set<string>());
  /** Exclusões ainda desfazíveis (o toast com "Desfazer" segue na tela): Ctrl+Z desfaz a última. */
  const undoStack = useRef<
    Array<{ id: number; node: TreeNodeData; parentId: string | null; index: number }>
  >([]);
  const items = applyLoaded(itemsProp ?? inner, loaded);
  const [expandedList, setExpanded] = useControllable<string[]>(
    expandedProp,
    defaultExpanded === 'all'
      ? idsWithChildren(itemsProp ?? defaultItems ?? [])
      : (defaultExpanded ?? []),
    onExpandedChange,
  );
  const expandedSet = new Set(expandedList);
  const [selectedList, setSelected] = useControllable<string[]>(
    selectedProp,
    defaultSelected ?? [],
    onSelect,
  );
  const selectedSet = new Set(selectedList);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [drop, setDrop] = useState<DropState | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const flat = flatten(items, expandedSet);
  const tabId =
    focusedId && flat.some((f) => f.node.id === focusedId)
      ? focusedId
      : (flat.find((f) => selectedSet.has(f.node.id))?.node.id ?? flat[0]?.node.id ?? null);

  // Último estado visto pelos handlers assíncronos (depois do confirm, por exemplo).
  const latest = useRef({ items, flat });
  useLayoutEffect(() => {
    latest.current = { items, flat };
  });

  const latestExpanded = useRef(expandedList);
  useLayoutEffect(() => {
    latestExpanded.current = expandedList;
  });
  const pendingFocus = useRef<string | null>(null);
  const menuFocus = useRef<string | null>(null);
  const anchor = useRef<string | null>(null);
  const typed = useRef({ text: '', timer: 0 as unknown as ReturnType<typeof setTimeout> });
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelDrag = useRef<(() => void) | null>(null);

  const findLi = useCallback((id: string): HTMLElement | null => {
    const lis = rootRef.current?.querySelectorAll<HTMLElement>('[role="treeitem"]');
    return Array.from(lis ?? []).find((li) => li.dataset.id === id) ?? null;
  }, []);

  const focusNode = useCallback(
    (id: string) => {
      setFocusedId(id);
      const li = findLi(id);
      if (li) li.focus();
      else pendingFocus.current = id;
    },
    [findLi],
  );

  useLayoutEffect(() => {
    const id = pendingFocus.current;
    if (!id || editingId) return;
    const li = findLi(id);
    if (li) {
      pendingFocus.current = null;
      li.focus();
    }
  });

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(
    () => () => {
      cancelDrag.current?.();
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
      clearTimeout(typed.current.timer);
    },
    [],
  );

  const newId = () => (createId ? createId() : `${idPrefix}-novo-${(counter.current += 1)}`);

  /** Aplica uma mudança (respeitando `onBeforeChange`). */
  const emit = (next: TreeNodeData[], change: TreeChange): boolean => {
    if (onBeforeChange?.(change, next) === false) return false;
    if (itemsProp === undefined) setInner(next);
    onChange?.(next, change);
    return true;
  };

  const expand = (id: string) => {
    if (!expandedSet.has(id)) setExpanded([...expandedList, id]);
  };

  const positionText = (id: string, from: TreeNodeData[]) => {
    const loc = locate(from, id);
    if (!loc) return '';
    return texts.position(
      loc.node.label,
      loc.level,
      loc.index + 1,
      loc.siblings.length,
      loc.parent?.label,
    );
  };

  // --- operações de edição ---------------------------------------------------------------------

  const announceAdded = (id: string, from: TreeNodeData[]) => {
    const loc = locate(from, id);
    if (loc) {
      announcer.announce(
        texts.added(loc.node.label, loc.level, loc.index + 1, loc.siblings.length),
      );
    }
  };

  const addAt = (parentId: string | null, index: number) => {
    const node: TreeNodeData = { id: newId(), label: texts.newItem };
    const next = insertNode(items, parentId, index, node);
    const parent = parentId ? (locate(next, parentId)?.node ?? null) : null;
    if (!emit(next, { action: 'add', node, parent, index })) return;
    if (parentId) expand(parentId);
    fresh.current.add(node.id);
    setEditingId(node.id);
    setFocusedId(node.id);
    pendingFocus.current = node.id;
    announceAdded(node.id, next);
  };

  const addChild = (id: string) => {
    const loc = locate(items, id);
    if (loc) addAt(id, loc.node.children?.length ?? 0);
  };

  const addSibling = (id: string) => {
    const loc = locate(items, id);
    if (loc) addAt(loc.parent?.id ?? null, loc.index + 1);
  };

  const addParent = (id: string) => {
    const loc = locate(items, id);
    if (!loc) return;
    const wrapper: TreeNodeData = { id: newId(), label: texts.newItem, children: [loc.node] };
    const next = mapNode(items, id, () => wrapper);
    if (!emit(next, { action: 'wrap', node: wrapper, parent: loc.parent, index: loc.index }))
      return;
    expand(wrapper.id);
    fresh.current.add(wrapper.id);
    setEditingId(wrapper.id);
    setFocusedId(wrapper.id);
    pendingFocus.current = wrapper.id;
    announceAdded(wrapper.id, next);
  };

  const startEdit = (id: string) => {
    if (!editable) return;
    setFocusedId(id);
    setEditingId(id);
  };

  const finishEdit = (id: string, value: string | null, refocus: boolean) => {
    setEditingId(null);
    if (refocus) pendingFocus.current = id;
    const wasFresh = fresh.current.delete(id);
    if (value === null) {
      if (refocus) focusNode(id);
      return;
    }
    const loc = locate(items, id);
    if (!loc) return;
    const trimmed = value.trim();
    if (trimmed === '') {
      announcer.announce(texts.emptyName(loc.node.label));
    } else if (trimmed === loc.node.label) {
      if (wasFresh) announcer.announce(texts.addedNamed(trimmed));
    } else {
      const node = { ...loc.node, label: trimmed };
      const next = mapNode(items, id, () => node);
      if (emit(next, { action: 'rename', node, parent: loc.parent, index: loc.index })) {
        announcer.announce(wasFresh ? texts.addedNamed(trimmed) : texts.renamed(trimmed));
      }
    }
    if (refocus) focusNode(id);
  };

  const applyMove = (id: string, parentId: string | null, index: number, base = items) => {
    const loc = locate(base, id);
    if (!loc) return false;
    const next = insertNode(removeNode(base, id), parentId, index, loc.node);
    const after = locate(next, id)!;
    if (
      !emit(next, { action: 'move', node: after.node, parent: after.parent, index: after.index })
    ) {
      return false;
    }
    if (parentId) expand(parentId);
    announcer.announce(positionText(id, next));
    return true;
  };

  const moveUp = (id: string) => {
    const loc = locate(items, id);
    if (loc && loc.index > 0) applyMove(id, loc.parent?.id ?? null, loc.index - 1);
    else announcer.announce(texts.cannotMove);
    pendingFocus.current = id;
  };
  const moveDown = (id: string) => {
    const loc = locate(items, id);
    if (loc && loc.index < loc.siblings.length - 1) {
      applyMove(id, loc.parent?.id ?? null, loc.index + 1);
    } else announcer.announce(texts.cannotMove);
    pendingFocus.current = id;
  };
  /** Alt+→: vira filho do irmão de cima. */
  const indent = (id: string) => {
    const loc = locate(items, id);
    const prev = loc && loc.index > 0 ? loc.siblings[loc.index - 1] : undefined;
    if (loc && prev) applyMove(id, prev.id, prev.children?.length ?? 0);
    else announcer.announce(texts.cannotMove);
    pendingFocus.current = id;
  };
  /** Alt+←: vira irmão do pai, logo abaixo dele. */
  const outdent = (id: string) => {
    const loc = locate(items, id);
    const parent = loc?.parent ? locate(items, loc.parent.id) : null;
    if (loc && parent) applyMove(id, parent.parent?.id ?? null, parent.index + 1);
    else announcer.announce(texts.cannotMove);
    pendingFocus.current = id;
  };

  const deleteNode = async (id: string) => {
    const loc = locate(items, id);
    if (!loc) return;
    const count = descendantCount(loc.node);
    if (count > 0) {
      const message = texts.confirmDelete(loc.node.label, count);
      const ok = dialog
        ? await dialog.confirm(message, texts.deleteTitle, 'danger', { okText: texts.deleteTitle })
        : window.confirm(message);
      if (!ok) {
        focusNode(id);
        return;
      }
    }
    // Estado de agora (o confirm é assíncrono).
    const current = latest.current;
    const now = locate(current.items, id);
    if (!now) return;
    const visible = current.flat.map((f) => f.node.id);
    const at = visible.indexOf(id);
    const skip = new Set<string>();
    const collect = (n: TreeNodeData) => {
      skip.add(n.id);
      n.children?.forEach(collect);
    };
    collect(now.node);
    const neighbor =
      visible.slice(at + 1).find((v) => !skip.has(v)) ??
      [...visible.slice(0, at)].reverse().find((v) => !skip.has(v)) ??
      null;
    const next = removeNode(current.items, id);
    if (!emit(next, { action: 'delete', node: now.node, parent: now.parent, index: now.index })) {
      return;
    }
    setSelected(selectedList.filter((s) => !skip.has(s)));
    const removed = now.node;
    const parentId = now.parent?.id ?? null;
    const removedCount = descendantCount(removed);
    const spoken = `${texts.deleted(removed.label, removedCount)} ${texts.undoHint}`;
    announcer.announce(spoken);
    if (neighbor) focusNode(neighbor);
    if (toast) {
      const toastId = toast.show({
        message: spoken,
        duration: UNDO_MS,
        action: {
          label: texts.undo,
          onClick: () => restoreRef.current(removed, parentId, now.index),
        },
        onClose: () => {
          undoStack.current = undoStack.current.filter((u) => u.id !== toastId);
        },
      });
      undoStack.current.push({ id: toastId, node: removed, parentId, index: now.index });
    }
  };

  /** Ctrl+Z: desfaz a última exclusão cujo toast ainda está na tela. */
  const undoLast = () => {
    const last = undoStack.current.pop();
    if (!last) return false;
    toast?.dismiss(last.id);
    restoreRef.current(last.node, last.parentId, last.index);
    return true;
  };

  /** Desfaz a exclusão (chamado pelo toast; lê o estado de agora). */
  const restore = (node: TreeNodeData, parentId: string | null, index: number) => {
    const cur = latest.current.items;
    if (locate(cur, node.id)) return;
    const where = parentId && locate(cur, parentId) ? parentId : null;
    const next = insertNode(cur, where, index, node);
    const at = locate(next, node.id)!;
    if (!emit(next, { action: 'add', node, parent: at.parent, index: at.index })) return;
    if (where) expand(where);
    focusNode(node.id);
    announcer.announce(texts.restored(node.label));
  };
  const restoreRef = useRef(restore);
  useLayoutEffect(() => {
    restoreRef.current = restore;
  });

  const handlers: TreeActionHandlers = {
    addChild,
    addSibling,
    addParent,
    rename: startEdit,
    moveUp,
    moveDown,
    indent,
    outdent,
    remove: (id) => void deleteNode(id),
  };

  // --- seleção, expansão e teclado -------------------------------------------------------------

  const select = (
    id: string,
    event?: { ctrlKey: boolean; metaKey: boolean; shiftKey: boolean },
  ) => {
    if (multiselect && event && (event.ctrlKey || event.metaKey)) {
      setSelected(
        selectedSet.has(id) ? selectedList.filter((s) => s !== id) : [...selectedList, id],
      );
      anchor.current = id;
    } else if (multiselect && event?.shiftKey && anchor.current) {
      const ids = flat.map((f) => f.node.id);
      const a = ids.indexOf(anchor.current);
      const b = ids.indexOf(id);
      if (a >= 0 && b >= 0) setSelected(ids.slice(Math.min(a, b), Math.max(a, b) + 1));
    } else {
      setSelected([id]);
      anchor.current = id;
    }
  };

  const loadNode = async (node: TreeNodeData) => {
    if (!loadChildren || busy.has(node.id)) return;
    setBusy((prev) => new Set(prev).add(node.id));
    setFailed((prev) => {
      if (!prev.has(node.id)) return prev;
      const next = new Set(prev);
      next.delete(node.id);
      return next;
    });
    announcer.announce(texts.loading);
    try {
      const children = await loadChildren(node);
      if (!mounted.current) return;
      setLoaded((prev) => ({ ...prev, [node.id]: children }));
      setExpanded([...new Set([...latestExpanded.current, node.id])]);
    } catch {
      if (mounted.current) {
        setFailed((prev) => new Set(prev).add(node.id));
        announcer.announce(texts.loadError(node.label));
      }
    } finally {
      if (mounted.current) {
        setBusy((prev) => {
          const next = new Set(prev);
          next.delete(node.id);
          return next;
        });
      }
    }
  };

  /** Shift+setas: seleciona do âncora (o item de onde partiu) até o novo foco. */
  const extendTo = (to: string, from: string) => {
    if (!anchor.current) anchor.current = from;
    select(to, { ctrlKey: false, metaKey: false, shiftKey: true });
  };

  const toggle = (id: string) => {
    const node = locate(items, id)?.node;
    if (node && isLazy(node) && !expandedSet.has(id)) {
      void loadNode(node);
      return;
    }
    setExpanded(expandedSet.has(id) ? expandedList.filter((e) => e !== id) : [...expandedList, id]);
  };

  const openMenu = (id: string) => {
    const li = findLi(id);
    const menu = li?.querySelector<HTMLElement>(':scope > .eds-tree-row .eds-dropdown');
    if (!menu) return;
    menuFocus.current = id;
    try {
      menu.showPopover();
    } catch {
      /* sem suporte à Popover API */
    }
  };

  const typeAhead = (key: string, fromId: string) => {
    clearTimeout(typed.current.timer);
    typed.current.text += key;
    typed.current.timer = setTimeout(() => {
      typed.current.text = '';
    }, 500);
    const text = normalize(typed.current.text);
    const repeated = text.split('').every((c) => c === text[0]);
    const needle = repeated ? text[0]! : text;
    const start = flat.findIndex((f) => f.node.id === fromId);
    const order = [...flat.slice(start + (repeated ? 1 : 0)), ...flat.slice(0, start + 1)];
    const hit = order.find((f) => normalize(f.node.label).startsWith(needle));
    if (hit) focusNode(hit.node.id);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (target instanceof HTMLInputElement || target.closest('.eds-dropdown')) return;
    const li = target.closest<HTMLElement>('[role="treeitem"]');
    const id = li?.dataset.id;
    if (!li || !id) return;
    const index = flat.findIndex((f) => f.node.id === id);
    const entry = flat[index];
    if (!entry) return;
    const node = entry.node;
    const hasChildren = isParent(node);
    const open = expandedSet.has(id);
    const { key } = event;
    const plain = !event.ctrlKey && !event.metaKey && !event.altKey;
    const handled = () => {
      event.preventDefault();
      event.stopPropagation();
    };

    if (event.altKey && !event.ctrlKey && !event.metaKey) {
      if (!editable) return;
      if (key === 'ArrowUp') moveUp(id);
      else if (key === 'ArrowDown') moveDown(id);
      else if (key === 'ArrowRight') indent(id);
      else if (key === 'ArrowLeft') outdent(id);
      else return;
      return handled();
    }
    if (
      editable &&
      (event.ctrlKey || event.metaKey) &&
      !event.shiftKey &&
      !event.altKey &&
      key.toLowerCase() === 'z' &&
      undoStack.current.length > 0
    ) {
      handled();
      undoLast();
      return;
    }
    if ((key === 'F10' && event.shiftKey) || key === 'ContextMenu') {
      if (!editable) return;
      handled();
      return openMenu(id);
    }
    if (editable && key === 'Enter' && event.ctrlKey) {
      handled();
      return addChild(id);
    }
    if (editable && key === 'Enter' && event.shiftKey) {
      handled();
      return addSibling(id);
    }
    if (!plain && !event.shiftKey && !(key === ' ' && (event.ctrlKey || event.metaKey))) return;

    switch (key) {
      case 'ArrowDown':
        handled();
        if (flat[index + 1]) {
          focusNode(flat[index + 1]!.node.id);
          if (multiselect && event.shiftKey) extendTo(flat[index + 1]!.node.id, id);
        }
        return;
      case 'ArrowUp':
        handled();
        if (index > 0) {
          focusNode(flat[index - 1]!.node.id);
          if (multiselect && event.shiftKey) extendTo(flat[index - 1]!.node.id, id);
        }
        return;
      case 'ArrowRight':
        handled();
        if (hasChildren && !open) toggle(id);
        else if (node.children?.length) focusNode(node.children[0]!.id);
        return;
      case 'ArrowLeft':
        handled();
        if (hasChildren && open) toggle(id);
        else if (entry.parent) focusNode(entry.parent.id);
        return;
      case 'Home':
        handled();
        focusNode(flat[0]!.node.id);
        return;
      case 'End':
        handled();
        focusNode(flat[flat.length - 1]!.node.id);
        return;
      case '*': {
        handled();
        const siblings = entry.parent ? (entry.parent.children ?? []) : items;
        const add = siblings.filter((s) => isParent(s) && !expandedSet.has(s.id));
        const eager = add.filter((s) => !isLazy(s));
        if (eager.length) setExpanded([...expandedList, ...eager.map((s) => s.id)]);
        add.filter(isLazy).forEach((s) => void loadNode(s));
        return;
      }
      case 'Enter':
        handled();
        onActivate?.(node);
        if (!editable && hasChildren) toggle(id);
        return;
      case ' ':
        handled();
        select(id, event);
        return;
      case 'F2':
        if (editable) {
          handled();
          startEdit(id);
        }
        return;
      case 'Insert':
        if (editable) {
          handled();
          addChild(id);
        }
        return;
      case 'Delete':
        if (editable) {
          handled();
          void deleteNode(id);
        }
        return;
      default:
        if (key.length === 1 && plain && key !== ' ') typeAhead(key, id);
    }
  };

  const onRowClick = (event: ReactMouseEvent<HTMLElement>, node: TreeNodeData) => {
    const target = event.target as HTMLElement;
    if (target.closest('.eds-tree-actions, input')) return;
    if (target.closest('.eds-tree-toggle')) {
      if (isParent(node)) toggle(node.id);
      return;
    }
    select(node.id, event);
    focusNode(node.id);
  };

  const onRowDoubleClick = (event: ReactMouseEvent<HTMLElement>, node: TreeNodeData) => {
    if (!editable) return;
    if ((event.target as HTMLElement).closest('.eds-tree-actions, .eds-tree-toggle, input')) return;
    startEdit(node.id);
  };

  // --- arrastar e soltar -----------------------------------------------------------------------

  const clearHover = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = null;
  };

  const dropTargetAt = (point: DragPoint, dragged: TreeNodeData): DropState | null => {
    const rows = rootRef.current?.querySelectorAll<HTMLElement>('.eds-tree-row') ?? [];
    for (const row of Array.from(rows)) {
      const r = row.getBoundingClientRect();
      if (point.y < r.top || point.y > r.bottom) continue;
      const id = row.parentElement?.dataset.id;
      if (!id) return null;
      const ratio = r.height > 0 ? (point.y - r.top) / r.height : 0.5;
      const zone: DropZone = ratio < 1 / 3 ? 'before' : ratio > 2 / 3 ? 'after' : 'inside';
      return { id, zone, invalid: containsId(dragged, id) };
    }
    return null;
  };

  const onRowPointerDown = (event: ReactPointerEvent<HTMLElement>, node: TreeNodeData) => {
    if (!editable || editingId || event.button !== 0) return;
    if ((event.target as HTMLElement).closest('.eds-tree-actions, .eds-tree-toggle, input')) return;
    const row = event.currentTarget;
    let last: DropState | null = null;
    cancelDrag.current = beginPointerDrag(
      {
        pointerId: event.pointerId,
        clientX: event.clientX,
        clientY: event.clientY,
        pointerType: event.pointerType,
      },
      {
        source: row,
        touchHoldMs: TOUCH_HOLD_MS,
        ghostClassName: 'eds-sortable-ghost eds-tree-ghost',
        scrollParent: () => findScrollParent(rootRef.current),
        onStart: () => setDraggingId(node.id),
        onMove: (point) => {
          const state = dropTargetAt(
            point,
            latest.current.items ? (locate(latest.current.items, node.id)?.node ?? node) : node,
          );
          if (state?.id !== last?.id || state?.zone !== last?.zone) {
            clearHover();
            const target = state && !state.invalid && state.zone === 'inside' ? state.id : null;
            const t = target ? locate(latest.current.items, target)?.node : null;
            if (t && isParent(t) && !expandedSet.has(t.id)) {
              hoverTimer.current = setTimeout(() => {
                if (isLazy(t)) void loadNode(t);
                else expand(t.id);
              }, HOVER_EXPAND_MS);
            }
          }
          last = state;
          setDrop(state);
          if (state?.invalid) announcer.set(texts.dropInvalid);
        },
        onEnd: (_point, outcome) => {
          clearHover();
          cancelDrag.current = null;
          setDraggingId(null);
          setDrop(null);
          if (outcome !== 'drop' || !last || last.invalid) return;
          const { id: targetId, zone } = last;
          if (targetId === node.id) return;
          const base = latest.current.items;
          const stripped = removeNode(base, node.id);
          const target = locate(stripped, targetId);
          const moving = locate(base, node.id);
          if (!target || !moving) return;
          const parentId = zone === 'inside' ? target.node.id : (target.parent?.id ?? null);
          const index =
            zone === 'inside'
              ? (target.node.children?.length ?? 0)
              : target.index + (zone === 'after' ? 1 : 0);
          if (parentId === (moving.parent?.id ?? null) && index === moving.index) return;
          applyMove(node.id, parentId, index, base);
          focusNode(node.id);
        },
      },
    );
  };

  // --- desenho ---------------------------------------------------------------------------------

  const renderNodes = (nodes: TreeNodeData[], level: number): ReactNode =>
    nodes.map((node, i) => {
      const hasChildren = isParent(node);
      const open = hasChildren && expandedSet.has(node.id);
      const editing = editingId === node.id;
      const dropHere = drop?.id === node.id ? drop : null;
      return (
        <li
          key={node.id}
          role="treeitem"
          data-id={node.id}
          aria-label={node.label}
          aria-level={level}
          aria-setsize={nodes.length}
          aria-posinset={i + 1}
          aria-expanded={hasChildren ? open : undefined}
          aria-selected={selectedSet.has(node.id)}
          aria-busy={busy.has(node.id) || undefined}
          aria-describedby={failed.has(node.id) ? `${idPrefix}-err-${node.id}` : undefined}
          data-error={failed.has(node.id) ? '' : undefined}
          tabIndex={tabId === node.id ? 0 : -1}
          data-dragging={draggingId === node.id ? '' : undefined}
          onFocus={(event) => {
            if (event.target === event.currentTarget) setFocusedId(node.id);
          }}
        >
          {/* A linha só amplia o alvo do mouse; o teclado é do treeitem (<ul role="tree">). */}
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
          <div
            className="eds-tree-row"
            data-drop={dropHere && !dropHere.invalid ? dropHere.zone : undefined}
            data-drop-invalid={dropHere?.invalid ? '' : undefined}
            onClick={(event) => onRowClick(event, node)}
            onDoubleClick={(event) => onRowDoubleClick(event, node)}
            onPointerDown={(event) => onRowPointerDown(event, node)}
          >
            <span className="eds-tree-toggle" aria-hidden="true" />
            {node.icon ? (
              <span className="eds-tree-icon" aria-hidden="true">
                {node.icon}
              </span>
            ) : null}
            {editing ? (
              <RenameInput
                initial={node.label}
                label={texts.renameLabel(node.label)}
                onFinish={(value, refocus) => finishEdit(node.id, value, refocus)}
              />
            ) : (
              <span className="eds-tree-label">{node.label}</span>
            )}
            {failed.has(node.id) ? (
              <span className="eds-tree-error" id={`${idPrefix}-err-${node.id}`} aria-hidden="true">
                <span className="eds-tree-error-icon">!</span>
                <span>{texts.loadErrorInline}</span>
              </span>
            ) : null}
            {editable && !editing ? (
              <span className="eds-tree-actions">
                <TreeActions
                  node={node}
                  texts={texts}
                  handlers={handlers}
                  first={i === 0}
                  last={i === nodes.length - 1}
                  level={level}
                  takeMenuFocus={(id) => {
                    const mine = menuFocus.current === id;
                    if (mine) menuFocus.current = null;
                    return mine;
                  }}
                  onClosed={() => {
                    if (document.activeElement?.closest('.eds-tree-action')) focusNode(node.id);
                  }}
                />
              </span>
            ) : null}
          </div>
          {open && node.children?.length ? (
            <ul role="group">{renderNodes(node.children, level + 1)}</ul>
          ) : null}
        </li>
      );
    });

  return (
    <div {...rest} ref={rootRef} className={cx('eds-tree', className)}>
      {/* O foco fica nos treeitems; as teclas chegam por delegação no <ul role="tree">. */}
      <ul
        role="tree"
        aria-label={label}
        aria-multiselectable={multiselect || undefined}
        onKeyDown={onKeyDown}
      >
        {renderNodes(items, 1)}
      </ul>
      {name ? <input type="hidden" name={name} value={JSON.stringify(toJson(items))} /> : null}
      <span className="eds-visually-hidden" role="status">
        {announcer.text}
      </span>
    </div>
  );
}) as ((props: TreeProps & { ref?: Ref<HTMLDivElement> }) => ReactNode) & { displayName?: string };
Tree.displayName = 'Tree';
