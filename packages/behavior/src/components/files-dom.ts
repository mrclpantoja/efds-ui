import { uid } from '../core/dom';
import { FILES_ICONS, type FilesIcon } from '../files/icons';
import type { FilesController } from '../files/controller';
import { ancestorsOf, baseName, isInside } from '../files/logic';

/** Construtores de DOM do Gerenciador de arquivos (HTML). Só `textContent`: nunca HTML do usuário. */

const SVG_NS = 'http://www.w3.org/2000/svg';

type Attr = string | number | boolean | null | undefined;
export type Child = Node | string | null | undefined | false;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, Attr> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) {
    if (value === false || value === null || value === undefined) continue;
    el.setAttribute(name, value === true ? '' : String(value));
  }
  append(el, children);
  return el;
}

export function append(el: Element, children: Child[]): void {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    el.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
}

export function icon(name: FilesIcon, className = 'eds-files-icon'): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '1em');
  svg.setAttribute('height', '1em');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  if (className) svg.setAttribute('class', className);
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', FILES_ICONS[name]);
  svg.append(path);
  return svg;
}

export function sortIcon(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'eds-table-sort-icon');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  for (const [cls, d] of [
    ['eds-table-sort-up', 'M4.5 6.5 8 3l3.5 3.5'],
    ['eds-table-sort-down', 'M4.5 9.5 8 13l3.5-3.5'],
  ] as const) {
    const p = document.createElementNS(SVG_NS, 'path');
    p.setAttribute('class', cls);
    p.setAttribute('d', d);
    svg.append(p);
  }
  return svg;
}

export function button(
  label: string,
  attrs: Record<string, Attr> = {},
  iconName?: FilesIcon,
  iconOnly = false,
): HTMLButtonElement {
  const btn = h('button', { type: 'button', ...attrs });
  if (iconName) btn.append(icon(iconName, ''));
  if (iconOnly) btn.setAttribute('aria-label', label);
  else btn.append(label);
  return btn;
}

// ---- diálogo -------------------------------------------------------------------------------

export interface DialogHandle<T> {
  dialog: HTMLDialogElement;
  body: HTMLElement;
  footer: HTMLElement;
  /** Fecha e resolve `result` (sem argumento: `undefined`). */
  close(result?: T): void;
  closed: Promise<T | undefined>;
}

/**
 * `<dialog>` modal (ou Drawer) dentro de `host` (herda tema e modo). Esc fecha (nativo); o clique
 * no fundo não fecha, para não perder o que foi digitado.
 */
export function openDialog<T = undefined>(
  host: HTMLElement,
  options: {
    title: string;
    drawer?: boolean;
    size?: 'sm' | 'lg';
    closeLabel: string;
    returnFocus?: HTMLElement | null;
  },
): DialogHandle<T> {
  const titleId = uid('files-title');
  const kind = options.drawer ? 'drawer' : 'modal';
  const dialog = h('dialog', {
    class: `eds-${kind}${options.drawer ? ' eds-drawer-start' : options.size ? ` eds-modal-${options.size}` : ''}`,
    'aria-labelledby': titleId,
    'data-eds-backdrop': 'static',
    'data-files-dialog': '',
  });
  const closeBtn = button(
    options.closeLabel,
    { class: 'eds-button eds-button-ghost eds-button-icon', 'data-eds-close': '' },
    'close',
    true,
  );
  const body = h('div', { class: `eds-${kind}-body` });
  const footer = h('footer', { class: `eds-${kind}-footer` });
  dialog.append(
    h(
      'header',
      { class: `eds-${kind}-header` },
      h('h2', { class: `eds-${kind}-title`, id: titleId }, options.title),
      closeBtn,
    ),
    body,
    footer,
  );
  host.append(dialog);
  let result: T | undefined;
  const closed = new Promise<T | undefined>((resolve) => {
    dialog.addEventListener('close', () => {
      dialog.remove();
      const back = options.returnFocus;
      if (back?.isConnected) back.focus();
      else host.querySelector<HTMLElement>('[data-files-focus-fallback]')?.focus();
      resolve(result);
    });
  });
  dialog.showModal();
  return {
    dialog,
    body,
    footer,
    close(value) {
      result = value;
      if (dialog.open) dialog.close();
    },
    closed,
  };
}

// ---- árvore de pastas ----------------------------------------------------------------------

export interface FolderTreeOptions {
  controller: FilesController;
  /** Caminho "atual" (selecionado). */
  current: () => string;
  label: string;
  expandLabel: (name: string) => string;
  collapseLabel: (name: string) => string;
  onPick: (path: string) => void;
  /** Pastas que não podem ser escolhidas (origem e descendentes). */
  disabledPaths?: () => string[];
  /** Marca pastas como alvo de soltar. */
  droppable?: boolean;
}

export interface FolderTree {
  el: HTMLElement;
  render(): void;
  /** Abre os ancestrais de `path` na árvore. */
  reveal(path: string): void;
  focusCurrent(): void;
}

/** Árvore de pastas somente leitura (padrão APG Tree View), com carga sob demanda. */
export function createFolderTree(options: FolderTreeOptions): FolderTree {
  const { controller } = options;
  const expanded = new Set<string>(['/']);
  const el = h('div', { class: 'eds-tree eds-files-tree-view' });
  let focusPath: string | null = null;

  const reveal = (path: string) => {
    for (const p of ancestorsOf(path).slice(0, -1)) expanded.add(p);
  };

  const isDisabled = (path: string) =>
    (options.disabledPaths?.() ?? []).some((d) => isInside(path, d));

  const visible = (): HTMLElement[] =>
    Array.from(el.querySelectorAll<HTMLElement>('li[role="treeitem"]')).filter((li) => {
      for (
        let p = li.parentElement?.closest('li[role="treeitem"]');
        p;
        p = p.parentElement?.closest('li[role="treeitem"]') ?? null
      ) {
        if (p.getAttribute('aria-expanded') !== 'true') return false;
      }
      return true;
    });

  const focusItem = (li: HTMLElement | null | undefined) => {
    if (!li) return;
    focusPath = li.getAttribute('data-path');
    for (const other of el.querySelectorAll<HTMLElement>('li[role="treeitem"]')) {
      other.tabIndex = other === li ? 0 : -1;
    }
    li.focus();
  };

  const toggle = (path: string, open: boolean) => {
    if (open) {
      expanded.add(path);
      void controller.ensureTree(path);
    } else expanded.delete(path);
    render();
  };

  const node = (path: string, name: string, level: number, current: string): HTMLElement => {
    const state = controller.getState();
    const children = state.tree[path];
    const loading = state.treeLoading.includes(path);
    const isOpen = expanded.has(path);
    const leaf = children !== undefined && children.length === 0;
    const li = h('li', {
      role: 'treeitem',
      'aria-level': level,
      'aria-selected': path === current ? 'true' : 'false',
      'aria-expanded': leaf ? null : isOpen ? 'true' : 'false',
      'aria-busy': loading ? 'true' : null,
      'aria-disabled': isDisabled(path) ? 'true' : null,
      'data-path': path,
      tabindex: (focusPath ?? current) === path ? 0 : -1,
    });
    const row = h(
      'div',
      {
        class: 'eds-tree-row',
        'data-files-tree-row': '',
        'data-drop-path': options.droppable ? path : null,
      },
      h('span', { class: 'eds-tree-toggle', 'aria-hidden': 'true', 'data-files-toggle': '' }),
      icon('folder', 'eds-tree-icon'),
      h('span', { class: 'eds-tree-label' }, name),
    );
    li.append(row);
    if (isOpen && children && children.length > 0) {
      const group = h('ul', { role: 'group' });
      for (const child of children) group.append(node(child.path, child.name, level + 1, current));
      li.append(group);
    }
    return li;
  };

  function render() {
    const active = document.activeElement;
    const hadFocus = active instanceof HTMLElement && el.contains(active);
    const current = options.current();
    const ul = h('ul', { role: 'tree', 'aria-label': options.label });
    ul.append(node('/', controller.rootLabel, 1, current));
    el.replaceChildren(ul);
    // Garante um tab stop mesmo se o item focado sumiu.
    if (!ul.querySelector('[tabindex="0"]')) {
      (ul.querySelector('li[aria-selected="true"]') ?? ul.querySelector('li'))?.setAttribute(
        'tabindex',
        '0',
      );
    }
    if (hadFocus && focusPath) {
      const target = Array.from(ul.querySelectorAll<HTMLElement>('li')).find(
        (li) => li.getAttribute('data-path') === focusPath,
      );
      target?.focus();
    }
  }

  el.addEventListener('click', (event) => {
    const target = event.target as Element;
    const li = target.closest<HTMLElement>('li[role="treeitem"]');
    if (!li || !el.contains(li)) return;
    const path = li.getAttribute('data-path') ?? '/';
    if (target.closest('[data-files-toggle]')) {
      if (li.hasAttribute('aria-expanded'))
        toggle(path, li.getAttribute('aria-expanded') !== 'true');
      focusItem(li);
      return;
    }
    if (li.getAttribute('aria-disabled') === 'true') return;
    focusItem(li);
    options.onPick(path);
  });

  el.addEventListener('keydown', (event) => {
    const li = (event.target as Element).closest<HTMLElement>('li[role="treeitem"]');
    if (!li || event.target !== li) return;
    const path = li.getAttribute('data-path') ?? '/';
    const items = visible();
    const i = items.indexOf(li);
    const open = li.getAttribute('aria-expanded');
    switch (event.key) {
      case 'ArrowDown':
        focusItem(items[i + 1]);
        break;
      case 'ArrowUp':
        focusItem(items[i - 1]);
        break;
      case 'Home':
        focusItem(items[0]);
        break;
      case 'End':
        focusItem(items[items.length - 1]);
        break;
      case 'ArrowRight':
        if (open === 'false') toggle(path, true);
        else if (open === 'true') focusItem(li.querySelector<HTMLElement>(':scope > ul > li'));
        break;
      case 'ArrowLeft':
        if (open === 'true') toggle(path, false);
        else focusItem(li.parentElement?.closest<HTMLElement>('li[role=treeitem]') ?? undefined);
        break;
      case 'Enter':
      case ' ':
        if (li.getAttribute('aria-disabled') !== 'true') options.onPick(path);
        break;
      default:
        return;
    }
    event.preventDefault();
    event.stopPropagation();
  });

  return {
    el,
    render,
    reveal,
    focusCurrent() {
      const current = options.current();
      const li = Array.from(el.querySelectorAll<HTMLElement>('li')).find(
        (x) => x.getAttribute('data-path') === current,
      );
      focusItem(li ?? el.querySelector<HTMLElement>('li') ?? undefined);
    },
  };
}

export function nameOfPath(path: string, rootLabel: string): string {
  return path === '/' ? rootLabel : baseName(path);
}
