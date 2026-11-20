import { format, getMessages } from '../core/config';
import { createDragEngine, scrollParents, type DragSession } from '../core/drag';
import { emit, uid } from '../core/dom';
import { bindAll, type Behavior } from '../core/registry';
import { createAnnouncer } from '../core/status';

/**
 * Sortable: reordenar itens (e trocá-los entre contêineres do mesmo `data-eds-group`) com
 * mouse/toque (Pointer Events, via `core/drag.ts`) e com teclado (WCAG 2.5.7: o arrasto sempre
 * tem alternativa). Markup: `[data-eds-sortable] > .eds-sortable-item[data-id]` com um
 * `.eds-sortable-handle` opcional em cada item. Ver `docs/architecture/behavior.md`.
 */

const ITEM = '.eds-sortable-item';
const HANDLE = '.eds-sortable-handle';
const CONTAINER = '[data-eds-sortable]';
const INTERACTIVE = 'button, a[href], input, select, textarea, label, [contenteditable="true"]';

type Orientation = 'vertical' | 'horizontal' | 'grid';

interface Grab {
  item: HTMLElement;
  /** Quem tem o foco (o handle ou o próprio item). */
  focus: HTMLElement;
  from: HTMLElement;
  fromIndex: number;
  /** Anuncia no status do contêiner de origem (um só ouvinte por movimento). */
  say: (text: string) => void;
}

/** Só um item pode estar "pego" por teclado de cada vez, em qualquer contêiner do grupo. */
let grab: Grab | null = null;

const flag = (el: Element, name: string): boolean => {
  const value = el.getAttribute(name);
  return value !== null && value !== 'false';
};

const itemsOf = (container: HTMLElement): HTMLElement[] =>
  Array.from(container.children).filter((c): c is HTMLElement => c.matches(ITEM));

const handleOf = (item: HTMLElement): HTMLElement | null => {
  const handle = item.querySelector<HTMLElement>(HANDLE);
  return handle && handle.closest(ITEM) === item ? handle : null;
};

/** Pego por teclado: `aria-pressed` só no <button> (handle); sem handle, `data-grabbed`. */
function setGrabbed(item: HTMLElement, on: boolean): void {
  const handle = handleOf(item);
  if (handle) handle.setAttribute('aria-pressed', String(on));
  else if (on) item.setAttribute('data-grabbed', '');
  else item.removeAttribute('data-grabbed');
}

const orientationOf = (container: HTMLElement): Orientation => {
  const value = container.getAttribute('data-eds-orientation');
  return value === 'horizontal' || value === 'grid' ? value : 'vertical';
};

const isDisabled = (container: HTMLElement, item?: HTMLElement): boolean =>
  flag(container, 'data-eds-disabled') || (item ? flag(item, 'data-eds-disabled') : false);

/** Contêineres que trocam itens com `container` (ele mesmo, se não houver grupo), em ordem de DOM. */
function groupMembers(container: HTMLElement): HTMLElement[] {
  const group = container.getAttribute('data-eds-group');
  if (!group) return [container];
  return Array.from(container.ownerDocument.querySelectorAll<HTMLElement>(CONTAINER)).filter(
    (c) => c.getAttribute('data-eds-group') === group && !isDisabled(c),
  );
}

function listName(container: HTMLElement): string {
  const label = container.getAttribute('aria-label');
  if (label) return label;
  const ids = container.getAttribute('aria-labelledby');
  if (ids) {
    const text = ids
      .split(/\s+/)
      .map((id) => container.ownerDocument.getElementById(id)?.textContent?.trim() ?? '')
      .filter(Boolean)
      .join(' ');
    if (text) return text;
  }
  return getMessages().sortableListDefault;
}

function itemLabel(item: HTMLElement): string {
  const explicit = item.getAttribute('data-eds-label');
  if (explicit) return explicit;
  const clone = item.cloneNode(true) as HTMLElement;
  clone
    .querySelectorAll(`${HANDLE}, input, [aria-hidden="true"], .eds-visually-hidden`)
    .forEach((n) => n.remove());
  const text = (clone.textContent ?? '').replace(/\s+/g, ' ').trim();
  if (text) return text.length > 80 ? `${text.slice(0, 79)}…` : text;
  return item.getAttribute('data-id') ?? '';
}

/** Mantém um `<input type="hidden">` por item, na ordem, quando há `data-eds-name`. */
function syncInputs(container: HTMLElement): void {
  const name = container.getAttribute('data-eds-name');
  const existing = Array.from(container.children).filter((c): c is HTMLInputElement =>
    c.matches('input[data-eds-sortable-input]'),
  );
  const ids = name
    ? itemsOf(container)
        .map((item) => item.getAttribute('data-id'))
        .filter((id): id is string => id !== null)
    : [];
  const same =
    existing.length === ids.length &&
    existing.every((input, i) => input.value === ids[i] && input.name === name);
  if (same) return;
  existing.forEach((input) => input.remove());
  for (const id of ids) {
    const input = container.ownerDocument.createElement('input');
    input.type = 'hidden';
    input.name = name ?? '';
    input.value = id;
    input.setAttribute('data-eds-sortable-input', '');
    container.append(input);
  }
}

/** Insere `item` na posição `index` (entre os itens, sem contar o próprio). */
function placeAt(container: HTMLElement, item: HTMLElement, index: number): void {
  const others = itemsOf(container).filter((i) => i !== item);
  const at = Math.max(0, Math.min(index, others.length));
  const ref = others[at];
  if (ref) container.insertBefore(item, ref);
  else if (others.length > 0) others[others.length - 1]?.after(item);
  else container.prepend(item);
}

/** Quantas colunas tem a grade (itens na mesma linha do primeiro). */
function gridColumns(container: HTMLElement): number {
  const items = itemsOf(container);
  const first = items[0];
  if (!first) return 1;
  const top = first.getBoundingClientRect().top;
  return Math.max(1, items.filter((i) => Math.abs(i.getBoundingClientRect().top - top) < 2).length);
}

/** Posição de inserção do ponteiro entre os itens de `container` (sem contar `source`). */
function insertionIndex(container: HTMLElement, x: number, y: number, source: HTMLElement): number {
  const items = itemsOf(container).filter((i) => i !== source);
  const orientation = orientationOf(container);
  for (let i = 0; i < items.length; i += 1) {
    const r = items[i]?.getBoundingClientRect();
    if (!r) continue;
    const midX = r.left + r.width / 2;
    const midY = r.top + r.height / 2;
    if (orientation === 'horizontal') {
      if (x < midX) return i;
    } else if (orientation === 'grid') {
      if (y < r.top || (y <= r.bottom && x < midX)) return i;
    } else if (y < midY) return i;
  }
  return items.length;
}

const inside = (r: DOMRect, x: number, y: number): boolean =>
  x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;

export const sortableBehavior: Behavior = {
  name: 'sortable',
  selector: CONTAINER,
  bind(container) {
    const doc = container.ownerDocument;
    const announce = (text: string) => announcer.say(text);

    // Região de status e instruções criadas ao lado do contêiner (a lista não pode ter filhos
    // que não sejam itens). Só o que o JS criou é removido no destroy.
    const created: HTMLElement[] = [];
    const status = doc.createElement('span');
    status.className = 'eds-visually-hidden';
    status.setAttribute('role', 'status');
    created.push(status);
    const announcer = createAnnouncer(status);

    const helpId = container.getAttribute('data-eds-help') ?? 'eds-sortable-help';
    let help = doc.getElementById(helpId);
    if (!help) {
      help = doc.createElement('p');
      help.id = helpId === 'eds-sortable-help' ? uid('sortable-help') : helpId;
      help.hidden = true;
      help.textContent = getMessages().sortableHelp;
      created.push(help);
    }
    container.after(...created);
    const describedBy = help.id;

    const addedRole = !container.hasAttribute('role') && !/^(UL|OL)$/.test(container.tagName);
    if (addedRole) container.setAttribute('role', 'list');

    let moving = false;

    // Atributos que o JS pôs nos itens: o destroy os remove (senão um novo bind herdaria
    // aria-describedby apontando para uma ajuda que já não existe).
    const added: Array<[Element, string]> = [];
    const addAttr = (el: Element, name: string, value: string) => {
      if (el.hasAttribute(name)) return;
      el.setAttribute(name, value);
      added.push([el, name]);
    };

    const sync = () => {
      for (const item of itemsOf(container)) {
        if (addedRole) addAttr(item, 'role', 'listitem');
        const handle = handleOf(item);
        const control = handle ?? item;
        if (!handle) addAttr(item, 'tabindex', '0');
        addAttr(control, 'aria-describedby', describedBy);
        if (handle) {
          if (isDisabled(container, item)) {
            if (!handle.hasAttribute('aria-disabled')) addAttr(handle, 'aria-disabled', 'true');
          } else if (added.some(([e, n]) => e === handle && n === 'aria-disabled')) {
            handle.removeAttribute('aria-disabled');
          }
        }
      }
      syncInputs(container);
    };
    sync();

    const observer = new MutationObserver(sync);
    observer.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-eds-disabled'],
    });

    // ---- teclado ------------------------------------------------------------------------

    const position = (item: HTMLElement) => {
      const owner = item.parentElement ?? container;
      const items = itemsOf(owner);
      return { pos: items.indexOf(item) + 1, total: items.length, list: listName(owner) };
    };

    const relocate = (g: Grab, to: HTMLElement, index: number) => {
      const previous = g.item.parentElement;
      moving = true;
      placeAt(to, g.item, index);
      g.focus.focus();
      moving = false;
      syncInputs(to);
      if (previous && previous !== to) syncInputs(previous as HTMLElement);
    };

    const clearGrab = (g: Grab) => {
      setGrabbed(g.item, false);
      grab = null;
    };

    const finishDrop = (g: Grab) => {
      const to = g.item.parentElement as HTMLElement;
      const toIndex = itemsOf(to).indexOf(g.item);
      const { pos, total, list } = position(g.item);
      clearGrab(g);
      g.say(format(getMessages().sortableDropped, { label: itemLabel(g.item), pos, total, list }));
      if (to !== g.from || toIndex !== g.fromIndex) {
        emitSort(g.item, g.from, to, g.fromIndex, toIndex);
      }
    };

    const cancelGrab = (g: Grab, say = true) => {
      relocate(g, g.from, g.fromIndex);
      clearGrab(g);
      if (say) g.say(getMessages().sortableCancelled);
    };

    const emitSort = (
      item: HTMLElement,
      from: HTMLElement,
      to: HTMLElement,
      fromIndex: number,
      toIndex: number,
    ) => {
      emit(to, 'sortable-change', {
        id: item.getAttribute('data-id') ?? '',
        from,
        to,
        fromIndex,
        toIndex,
        order: itemsOf(to)
          .map((i) => i.getAttribute('data-id'))
          .filter((id): id is string => id !== null),
      });
    };

    const isControl = (item: HTMLElement, target: Element) =>
      target === item || target === handleOf(item);

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const item = target.closest<HTMLElement>(ITEM);
      if (!item || item.parentElement !== container || !isControl(item, target)) return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const { key } = event;

      if (!grab) {
        if (key !== ' ' && key !== 'Enter') return;
        event.preventDefault();
        if (isDisabled(container, item)) return;
        grab = {
          item,
          focus: target,
          from: container,
          fromIndex: itemsOf(container).indexOf(item),
          say: announce,
        };
        setGrabbed(item, true);
        const { pos, total, list } = position(item);
        announce(
          format(getMessages().sortableGrabbed, { label: itemLabel(item), pos, total, list }),
        );
        return;
      }
      if (grab.item !== item) return;
      const g = grab;

      if (key === ' ' || key === 'Enter') {
        event.preventDefault();
        finishDrop(g);
        return;
      }
      if (key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        cancelGrab(g);
        return;
      }

      const orientation = orientationOf(container);
      const items = itemsOf(container);
      const index = items.indexOf(item);
      let along = 0;
      let across = 0;
      let jump: number | null = null;
      if (orientation === 'horizontal') {
        along = key === 'ArrowRight' ? 1 : key === 'ArrowLeft' ? -1 : 0;
        across = key === 'ArrowDown' ? 1 : key === 'ArrowUp' ? -1 : 0;
      } else if (orientation === 'grid') {
        along = key === 'ArrowRight' ? 1 : key === 'ArrowLeft' ? -1 : 0;
        const columns = gridColumns(container);
        if (columns < items.length) {
          if (key === 'ArrowDown') jump = columns;
          else if (key === 'ArrowUp') jump = -columns;
        } else if (key === 'ArrowDown' || key === 'ArrowUp') jump = 0;
      } else {
        along = key === 'ArrowDown' ? 1 : key === 'ArrowUp' ? -1 : 0;
        across = key === 'ArrowRight' ? 1 : key === 'ArrowLeft' ? -1 : 0;
      }
      if (key === 'PageDown') across = 1;
      else if (key === 'PageUp') across = -1;

      if (key === 'Home' || key === 'End') {
        event.preventDefault();
        relocate(g, container, key === 'Home' ? 0 : items.length - 1);
        g.say(format(getMessages().sortablePosition, position(item)));
        return;
      }
      if (across !== 0) {
        event.preventDefault();
        const members = groupMembers(container);
        const next = members[members.indexOf(container) + across];
        if (!next) {
          g.say(getMessages().sortableNoList);
          return;
        }
        relocate(g, next, index);
        g.say(format(getMessages().sortableMovedList, position(item)));
        return;
      }
      if (along !== 0 || jump !== null) {
        event.preventDefault();
        const step = jump ?? along;
        const target2 = Math.max(0, Math.min(items.length - 1, index + step));
        if (target2 !== index) relocate(g, container, target2);
        g.say(format(getMessages().sortablePosition, position(item)));
      }
    };

    // Espaço num <button> gera `click` no keyup (Firefox ignora o preventDefault do keydown).
    const onKeyUp = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const item = target.closest<HTMLElement>(ITEM);
      if (
        event.key === ' ' &&
        item &&
        item.parentElement === container &&
        isControl(item, target)
      ) {
        event.preventDefault();
      }
    };

    // Sair do item pego (Tab, clique fora) cancela: nada muda sem querer.
    const onFocusOut = (event: FocusEvent) => {
      if (!grab || moving || grab.item.parentElement !== container) return;
      const next = event.relatedTarget as Node | null;
      if (next && grab.item.contains(next)) return;
      if (event.target !== grab.focus) return;
      cancelGrab(grab);
    };

    container.addEventListener('keydown', onKeyDown);
    container.addEventListener('keyup', onKeyUp);
    container.addEventListener('focusout', onFocusOut);

    // ---- mouse e toque -------------------------------------------------------------------

    let placeholder: HTMLElement | null = null;
    let origin: { container: HTMLElement; index: number } | null = null;
    let lastTarget: HTMLElement | null = null;
    let lastIndex = -1;
    let hadFocus = false;

    const clearTargets = () => {
      for (const c of groupMembers(container)) c.removeAttribute('data-drop-target');
    };

    const restoreSource = (source: HTMLElement) => {
      source.removeAttribute('data-dragging');
    };

    const engine = createDragEngine(container, {
      grab(event) {
        const t = event.target as Element | null;
        const item = t?.closest<HTMLElement>(ITEM);
        if (!t || !item || item.parentElement !== container) return null;
        if (grab || isDisabled(container, item)) return null;
        const handle = handleOf(item);
        if (handle) return handle.contains(t) ? item : null;
        const control = t.closest(INTERACTIVE);
        return control && item.contains(control) ? null : item;
      },
      start(session: DragSession) {
        const source = session.source;
        const rect = source.getBoundingClientRect();
        origin = { container, index: itemsOf(container).indexOf(source) };
        hadFocus = source.contains(doc.activeElement);
        placeholder = doc.createElement(/^(UL|OL)$/.test(container.tagName) ? 'li' : 'div');
        placeholder.className = 'eds-sortable-placeholder';
        placeholder.setAttribute('aria-hidden', 'true');
        placeholder.style.blockSize = `${rect.height}px`;
        if (orientationOf(container) !== 'vertical') {
          placeholder.style.inlineSize = `${rect.width}px`;
        }
        container.insertBefore(placeholder, source);
        source.setAttribute('data-dragging', '');
        lastTarget = container;
        lastIndex = origin.index;
        container.setAttribute('data-drop-target', '');
      },
      move(session) {
        if (!placeholder) return;
        const members = groupMembers(container);
        let target = lastTarget ?? container;
        let best = Infinity;
        for (const c of members) {
          const r = c.getBoundingClientRect();
          const area = r.width * r.height;
          if (inside(r, session.x, session.y) && area < best) {
            best = area;
            target = c;
          }
        }
        for (const c of members) {
          if (c === target) c.setAttribute('data-drop-target', '');
          else c.removeAttribute('data-drop-target');
        }
        const index = insertionIndex(target, session.x, session.y, session.source);
        if (target === lastTarget && index === lastIndex && placeholder.parentElement === target) {
          return;
        }
        lastTarget = target;
        lastIndex = index;
        const others = itemsOf(target).filter((i) => i !== session.source);
        const ref = others[index] ?? null;
        if (ref) target.insertBefore(placeholder, ref);
        else if (others.length > 0) others[others.length - 1]?.after(placeholder);
        else target.prepend(placeholder);
      },
      drop(session) {
        const source = session.source;
        const from = origin?.container ?? container;
        const fromIndex = origin?.index ?? 0;
        const to = (placeholder?.parentElement as HTMLElement | null) ?? container;
        placeholder?.replaceWith(source);
        placeholder = null;
        restoreSource(source);
        clearTargets();
        const toIndex = itemsOf(to).indexOf(source);
        syncInputs(to);
        if (from !== to) syncInputs(from);
        if (hadFocus) (handleOf(source) ?? source).focus();
        const { pos, total, list } = position(source);
        announce(
          format(getMessages().sortableDropped, { label: itemLabel(source), pos, total, list }),
        );
        if (to !== from || toIndex !== fromIndex) emitSort(source, from, to, fromIndex, toIndex);
        origin = null;
      },
      cancel(session) {
        placeholder?.remove();
        placeholder = null;
        restoreSource(session.source);
        clearTargets();
        if (hadFocus) (handleOf(session.source) ?? session.source).focus();
        origin = null;
        announce(getMessages().sortableCancelled);
      },
      /** Toque sem handle: só arrasta depois de segurar parado (antes, a página rola). */
      hold(event) {
        const item = (event.target as Element).closest<HTMLElement>(ITEM);
        return !item || !handleOf(item);
      },
      scrollers() {
        const set = new Set<HTMLElement>();
        for (const c of groupMembers(container)) {
          set.add(c);
          scrollParents(c).forEach((p) => set.add(p));
        }
        return [...set];
      },
    });

    return () => {
      engine.destroy();
      observer.disconnect();
      container.removeEventListener('keydown', onKeyDown);
      container.removeEventListener('keyup', onKeyUp);
      container.removeEventListener('focusout', onFocusOut);
      if (grab && (grab.item.parentElement === container || grab.from === container)) {
        setGrabbed(grab.item, false);
        grab = null;
      }
      announcer.dispose();
      for (const el of created) el.remove();
      Array.from(container.children)
        .filter((c) => c.matches('input[data-eds-sortable-input]'))
        .forEach((c) => c.remove());
      if (addedRole) container.removeAttribute('role');
      for (const [el, name] of added) el.removeAttribute(name);
      added.length = 0;
    };
  },
};

export function initSortable(root: ParentNode = document): () => void {
  return bindAll(root, [sortableBehavior]);
}
