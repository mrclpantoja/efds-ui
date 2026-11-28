import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import {
  ancestorsOf,
  isInside,
  pathBaseName,
  type FilesController,
} from '@efds-ui/behavior/internal';
import { FilesGlyph } from './FilesGlyph';

export interface FolderTreeProps {
  controller: FilesController;
  /** Pasta "atual" (selecionada). */
  current: string;
  label: string;
  onPick: (path: string) => void;
  /** Pastas que não podem ser escolhidas (origem e descendentes). */
  disabledPaths?: readonly string[];
  /** Marca as linhas como alvo de soltar (`data-drop-path`). */
  droppable?: boolean;
  /** Foca o item atual ao montar. */
  focusOnMount?: boolean;
}

/** Árvore de pastas somente leitura (APG Tree View), com carga sob demanda. Markup do Tree do core. */
export function FolderTree({
  controller,
  current,
  label,
  onPick,
  disabledPaths = [],
  droppable = false,
  focusOnMount = false,
}: FolderTreeProps) {
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getState,
    controller.getState,
  );
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(
    () => new Set(['/', ...ancestorsOf(current).slice(0, -1)]),
  );
  const [focusPath, setFocusPath] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // A pasta atual fica sempre visível na árvore (ajuste de estado durante a renderização).
  const [seen, setSeen] = useState(current);
  if (seen !== current) {
    setSeen(current);
    setExpanded((prev) => new Set([...prev, ...ancestorsOf(current).slice(0, -1)]));
  }

  useEffect(() => {
    for (const p of expanded) void controller.ensureTree(p);
  }, [controller, expanded]);

  useEffect(() => {
    if (!focusOnMount) return;
    ref.current?.querySelector<HTMLElement>('li[aria-selected="true"], li')?.focus();
  }, [focusOnMount]);

  const disabled = (path: string) => disabledPaths.some((d) => isInside(path, d));

  const toggle = useCallback((path: string, open: boolean) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (open) next.add(path);
      else next.delete(path);
      return next;
    });
  }, []);

  const items = (): HTMLElement[] =>
    Array.from(ref.current?.querySelectorAll<HTMLElement>('li[role="treeitem"]') ?? []);

  const focusItem = (li: HTMLElement | null | undefined) => {
    if (!li) return;
    setFocusPath(li.getAttribute('data-path'));
    li.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const li = event.target as HTMLElement;
    if (li.getAttribute('role') !== 'treeitem') return;
    const path = li.getAttribute('data-path') ?? '/';
    const visible = items();
    const i = visible.indexOf(li);
    const open = li.getAttribute('aria-expanded');
    switch (event.key) {
      case 'ArrowDown':
        focusItem(visible[i + 1]);
        break;
      case 'ArrowUp':
        focusItem(visible[i - 1]);
        break;
      case 'Home':
        focusItem(visible[0]);
        break;
      case 'End':
        focusItem(visible[visible.length - 1]);
        break;
      case 'ArrowRight':
        if (open === 'false') toggle(path, true);
        else if (open === 'true') focusItem(li.querySelector<HTMLElement>(':scope > ul > li'));
        break;
      case 'ArrowLeft':
        if (open === 'true') toggle(path, false);
        else focusItem(li.parentElement?.closest<HTMLElement>('li[role="treeitem"]'));
        break;
      case 'Enter':
      case ' ':
        if (!disabled(path)) onPick(path);
        break;
      default:
        return;
    }
    event.preventDefault();
    event.stopPropagation();
  };

  const rovingPath = focusPath ?? current;

  const node = (path: string, name: string, level: number): ReactNode => {
    const children = state.tree[path];
    const loading = state.treeLoading.includes(path);
    const isOpen = expanded.has(path);
    const leaf = children !== undefined && children.length === 0;
    return (
      // O teclado é tratado no contêiner da árvore, por delegação.
      // eslint-disable-next-line jsx-a11y/click-events-have-key-events
      <li
        key={path}
        role="treeitem"
        aria-level={level}
        aria-selected={path === current}
        aria-expanded={leaf ? undefined : isOpen}
        aria-busy={loading || undefined}
        aria-disabled={disabled(path) || undefined}
        data-path={path}
        tabIndex={rovingPath === path ? 0 : -1}
        onFocus={(e) => {
          if (e.target === e.currentTarget) setFocusPath(path);
        }}
        onClick={(e) => {
          // Cliques nos filhos são do item de baixo.
          if ((e.target as Element).closest('li[role="treeitem"]') !== e.currentTarget) return;
          e.currentTarget.focus();
          if ((e.target as Element).closest('.eds-tree-toggle')) {
            if (!leaf) toggle(path, !isOpen);
            return;
          }
          if (!disabled(path)) onPick(path);
        }}
      >
        <div className="eds-tree-row" data-drop-path={droppable ? path : undefined}>
          <span className="eds-tree-toggle" aria-hidden="true" />
          <FilesGlyph name="folder" className="eds-tree-icon" />
          <span className="eds-tree-label">{name}</span>
        </div>
        {isOpen && children && children.length > 0 ? (
          <ul role="group">
            {children.map((c) => node(c.path, c.name || pathBaseName(c.path), level + 1))}
          </ul>
        ) : null}
      </li>
    );
  };

  return (
    // O teclado da árvore (APG) é tratado aqui, por delegação, nos itens `treeitem`.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div className="eds-tree eds-files-tree-view" ref={ref} onKeyDown={onKeyDown}>
      <ul role="tree" aria-label={label}>
        {node('/', controller.rootLabel, 1)}
      </ul>
    </div>
  );
}
