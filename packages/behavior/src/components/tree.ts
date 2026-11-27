import { format, getMessages } from '../core/config';
import { cloneGhost, createDragEngine, type DragSession } from '../core/drag';
import { emit, ensureId, hidePopover, normalizeText, showPopover, uid } from '../core/dom';
import { placeMenuFallback } from '../core/position';
import { bindAll, type Behavior } from '../core/registry';
import { createAnnouncer } from '../core/status';
import { confirm } from './dialogs';
import { toast } from './toast';

/**
 * Tree: árvore navegável e editável (APG Tree View + edição). O markup é o do core
 * (`.eds-tree > ul[role=tree] > li[role=treeitem] > .eds-tree-row + ul[role=group]`), pronto do
 * servidor ou montado de `data-eds-source` (JSON `[{ id, label, children?, hasChildren? }]`).
 * Edição só com `data-eds-editable`. Ver `docs/architecture/behavior.md`.
 */

const ITEM = 'li[role="treeitem"]';
const ROW = '.eds-tree-row';
const NAV_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End']);

export interface TreeNodeData {
  id: string;
  label: string;
  children?: TreeNodeData[];
  /** Filhos sob demanda (`data-eds-children-url`). */
  hasChildren?: boolean;
  expanded?: boolean;
}

export type TreeChangeAction = 'add' | 'rename' | 'move' | 'delete' | 'wrap';

type FetchInit = RequestInit & { edsLoader?: false };
type DropZone = 'before' | 'inside' | 'after';

const flag = (el: Element, name: string): boolean => {
  const value = el.getAttribute(name);
  return value !== null && value !== 'false';
};

// ---- navegação na estrutura ------------------------------------------------------------------

const isItem = (el: Element): el is HTMLElement => el.matches(ITEM);
const itemsIn = (list: Element | null): HTMLElement[] =>
  list ? Array.from(list.children).filter(isItem) : [];
const groupOf = (li: HTMLElement): HTMLElement | null =>
  Array.from(li.children).find((c): c is HTMLElement => c.matches('ul[role="group"]')) ?? null;
const childItems = (li: HTMLElement): HTMLElement[] => itemsIn(groupOf(li));
const rowOf = (li: HTMLElement): HTMLElement | null =>
  Array.from(li.children).find((c): c is HTMLElement => c.matches(ROW)) ?? null;
const parentItem = (li: HTMLElement): HTMLElement | null =>
  li.parentElement?.closest<HTMLElement>(ITEM) ?? null;
const siblingsOf = (li: HTMLElement): HTMLElement[] => itemsIn(li.parentElement);
const labelEl = (li: HTMLElement): HTMLElement | null =>
  rowOf(li)?.querySelector<HTMLElement>(':scope > .eds-tree-label') ?? null;
const isLazy = (li: HTMLElement): boolean => li.hasAttribute('data-eds-lazy');
const isParent = (li: HTMLElement): boolean => childItems(li).length > 0 || isLazy(li);
const isExpanded = (li: HTMLElement): boolean => li.getAttribute('aria-expanded') === 'true';
const descendantsOf = (li: HTMLElement): HTMLElement[] =>
  childItems(li).flatMap((c) => [c, ...descendantsOf(c)]);

function labelOf(li: HTMLElement): string {
  const el = li.querySelector<HTMLElement>(`:scope > ${ROW} > .eds-tree-label`);
  const input = li.querySelector<HTMLInputElement>(`:scope > ${ROW} > .eds-input`);
  return (el?.textContent ?? input?.dataset.edsOriginal ?? '').trim();
}

function visibleItems(list: Element | null): HTMLElement[] {
  const out: HTMLElement[] = [];
  for (const li of itemsIn(list)) {
    out.push(li);
    if (isExpanded(li)) out.push(...visibleItems(groupOf(li)));
  }
  return out;
}

function toJson(list: Element | null): TreeNodeData[] {
  return itemsIn(list).map((li) => {
    const node: TreeNodeData = { id: li.getAttribute('data-id') ?? '', label: labelOf(li) };
    const kids = toJson(groupOf(li));
    if (kids.length > 0) node.children = kids;
    else if (isLazy(li)) node.hasChildren = true;
    return node;
  });
}

export const treeBehavior: Behavior = {
  name: 'tree',
  selector: '[data-eds-tree]',
  bind(tree) {
    const doc = tree.ownerDocument;
    const createdNodes: HTMLElement[] = [];
    const editable = () => flag(tree, 'data-eds-editable');
    const multiselect = () => flag(tree, 'data-eds-multiselect');
    const rootList = (): HTMLElement | null =>
      Array.from(tree.children).find((c): c is HTMLElement => c.matches('ul[role="tree"]')) ?? null;
    const aborts = new Set<AbortController>();

    // Região de status
    let status = tree.querySelector<HTMLElement>(':scope > [role="status"]');
    if (!status) {
      status = doc.createElement('span');
      status.className = 'eds-visually-hidden';
      status.setAttribute('role', 'status');
      tree.append(status);
      createdNodes.push(status);
    }
    const announcer = createAnnouncer(status);
    const say = (text: string) => announcer.say(text);

    // JSON para formulário
    let jsonInput: HTMLInputElement | null = null;
    const treeName = tree.getAttribute('data-eds-name');
    if (treeName) {
      jsonInput = doc.createElement('input');
      jsonInput.type = 'hidden';
      jsonInput.name = treeName;
      jsonInput.setAttribute('data-eds-tree-input', '');
      tree.append(jsonInput);
      createdNodes.push(jsonInput);
    }

    let anchor: HTMLElement | null = null;

    // Lista de itens visíveis em cache: invalidada por qualquer mudança de estrutura ou de
    // `aria-expanded` (observador abaixo, `setExpanded`, `refresh` e teclas que alteram a árvore).
    let visibleCache: HTMLElement[] | null = null;
    const invalidate = () => {
      visibleCache = null;
    };
    const cachedVisible = (): HTMLElement[] => (visibleCache ??= visibleItems(rootList()));
    let observer: MutationObserver | null = null;
    let refreshQueued = false;

    // ---- estrutura e atributos --------------------------------------------------------------

    const ensureActions = (li: HTMLElement) => {
      const row = rowOf(li);
      if (!row || !editable()) return;
      let box = row.querySelector<HTMLElement>(':scope > .eds-tree-actions');
      if (!box) {
        box = doc.createElement('span');
        box.className = 'eds-tree-actions';
        const button = doc.createElement('button');
        button.type = 'button';
        button.className = 'eds-tree-action';
        button.tabIndex = -1;
        button.textContent = '⋯';
        button.setAttribute('aria-expanded', 'false');
        box.append(button);
        row.append(box);
      }
      const button = box.querySelector<HTMLElement>('.eds-tree-action');
      button?.setAttribute('aria-label', format(getMessages().treeActions, { label: labelOf(li) }));
    };

    const numberList = (list: Element, level: number) => {
      const items = itemsIn(list);
      items.forEach((li, i) => {
        li.setAttribute('aria-level', String(level));
        li.setAttribute('aria-setsize', String(items.length));
        li.setAttribute('aria-posinset', String(i + 1));
        const group = groupOf(li);
        const kids = itemsIn(group);
        if (kids.length === 0 && !isLazy(li)) {
          li.removeAttribute('aria-expanded');
          if (group && group.children.length === 0) group.remove();
        } else if (!li.hasAttribute('aria-expanded')) li.setAttribute('aria-expanded', 'false');
        if (!li.hasAttribute('aria-selected')) li.setAttribute('aria-selected', 'false');
        ensureActions(li);
        if (group) numberList(group, level + 1);
      });
    };

    const ensureRoving = () => {
      const list = rootList();
      if (!list) return;
      const visible = visibleItems(list);
      const current = visible.find((li) => li.getAttribute('tabindex') === '0');
      const active =
        current ?? visible.find((li) => li.getAttribute('aria-selected') === 'true') ?? visible[0];
      for (const li of Array.from(list.querySelectorAll<HTMLElement>(ITEM))) {
        li.tabIndex = li === active ? 0 : -1;
      }
    };

    const refresh = () => {
      const list = rootList();
      if (!list) return;
      list.setAttribute('role', 'tree');
      if (multiselect()) list.setAttribute('aria-multiselectable', 'true');
      else list.removeAttribute('aria-multiselectable');
      if (!list.hasAttribute('aria-label') && tree.hasAttribute('aria-label')) {
        list.setAttribute('aria-label', tree.getAttribute('aria-label') ?? '');
      }
      numberList(list, 1);
      ensureRoving();
      if (jsonInput) jsonInput.value = JSON.stringify(toJson(list));
      invalidate();
      // As mudanças que o próprio refresh fez (botões de ação, aria-*) não pedem outro refresh.
      observer?.takeRecords();
    };

    /** Vários lotes de mutação no mesmo instante viram um só refresh (microtask). */
    const scheduleRefresh = () => {
      if (refreshQueued) return;
      refreshQueued = true;
      queueMicrotask(() => {
        if (!refreshQueued) return;
        refreshQueued = false;
        refresh();
      });
    };

    // ---- foco e seleção -----------------------------------------------------------------------

    const focusItem = (li: HTMLElement | null | undefined) => {
      if (!li || !li.isConnected) return;
      // Só quem hoje está no tab stop precisa mudar (sem percorrer todos os itens).
      for (const other of Array.from(
        rootList()?.querySelectorAll<HTMLElement>(`${ITEM}[tabindex="0"]`) ?? [],
      )) {
        if (other !== li) other.tabIndex = -1;
      }
      li.tabIndex = 0;
      li.focus();
    };

    const selectedIds = () =>
      Array.from(tree.querySelectorAll<HTMLElement>(`${ITEM}[aria-selected="true"]`)).map(
        (li) => li.getAttribute('data-id') ?? '',
      );

    const emitSelect = (li: HTMLElement) =>
      emit(tree, 'tree-select', {
        node: li,
        id: li.getAttribute('data-id') ?? '',
        selected: selectedIds(),
      });

    const selectOnly = (li: HTMLElement) => {
      let changed = li.getAttribute('aria-selected') !== 'true';
      for (const other of Array.from(tree.querySelectorAll<HTMLElement>(ITEM))) {
        const on = other === li;
        if ((other.getAttribute('aria-selected') === 'true') !== on) changed = true;
        other.setAttribute('aria-selected', String(on));
      }
      anchor = li;
      if (changed) emitSelect(li);
    };

    const toggleSelected = (li: HTMLElement) => {
      li.setAttribute('aria-selected', String(li.getAttribute('aria-selected') !== 'true'));
      anchor = li;
      emitSelect(li);
    };

    const selectRange = (to: HTMLElement) => {
      const visible = visibleItems(rootList());
      const a = visible.indexOf(anchor ?? to);
      const b = visible.indexOf(to);
      if (a < 0 || b < 0) return selectOnly(to);
      const [from, until] = a < b ? [a, b] : [b, a];
      visible.forEach((li, i) => li.setAttribute('aria-selected', String(i >= from && i <= until)));
      emitSelect(to);
    };

    const pick = (
      li: HTMLElement,
      event: { ctrlKey: boolean; metaKey: boolean; shiftKey: boolean },
    ) => {
      if (multiselect() && event.shiftKey) selectRange(li);
      else if (multiselect() && (event.ctrlKey || event.metaKey)) toggleSelected(li);
      else selectOnly(li);
    };

    // ---- expandir e recolher ------------------------------------------------------------------

    /**
     * Falha de carga visível no nó: `<span class="eds-tree-error" aria-hidden="true">` na linha
     * (ícone + texto) e `data-error` no item; o nome do item não muda e `aria-describedby` o liga
     * ao texto. Sai ao tentar de novo.
     */
    const clearNodeError = (li: HTMLElement) => {
      rowOf(li)?.querySelector(':scope > .eds-tree-error')?.remove();
      li.removeAttribute('data-error');
      li.removeAttribute('aria-describedby');
    };
    const showNodeError = (li: HTMLElement) => {
      const row = rowOf(li);
      if (!row) return;
      clearNodeError(li);
      const box = doc.createElement('span');
      box.className = 'eds-tree-error';
      box.setAttribute('aria-hidden', 'true');
      const icon = doc.createElement('span');
      icon.className = 'eds-tree-error-icon';
      icon.textContent = '!';
      const text = doc.createElement('span');
      text.textContent = getMessages().treeNodeLoadErrorInline;
      box.append(icon, text);
      row.append(box);
      li.setAttribute('data-error', '');
      li.setAttribute('aria-describedby', ensureId(box, 'tree-error'));
    };

    const loadChildren = async (li: HTMLElement) => {
      const template = tree.getAttribute('data-eds-children-url');
      const id = li.getAttribute('data-id');
      if (!template || !id || li.getAttribute('aria-busy') === 'true') return;
      const url = template.includes('{id}')
        ? template.replace('{id}', encodeURIComponent(id))
        : `${template}${encodeURIComponent(id)}`;
      const control = new AbortController();
      aborts.add(control);
      clearNodeError(li);
      li.setAttribute('aria-busy', 'true');
      say(getMessages().treeLoading);
      try {
        const init: FetchInit = {
          headers: { Accept: 'application/json' },
          signal: control.signal,
          edsLoader: false,
        };
        const response = await fetch(url, init);
        if (!response.ok) throw new Error(String(response.status));
        const data = (await response.json()) as TreeNodeData[];
        if (!Array.isArray(data)) throw new Error('formato');
        li.removeAttribute('data-eds-lazy');
        const group = groupOf(li) ?? ensureGroup(li);
        group.replaceChildren(...data.map((d) => buildNode(d)));
        li.setAttribute('aria-expanded', 'true');
        refresh();
      } catch {
        if (!control.signal.aborted) {
          li.setAttribute('aria-expanded', 'false');
          showNodeError(li);
          say(format(getMessages().treeNodeLoadError, { label: labelOf(li) }));
        }
      } finally {
        aborts.delete(control);
        li.removeAttribute('aria-busy');
      }
    };

    const setExpanded = (li: HTMLElement, open: boolean) => {
      if (!isParent(li) || isExpanded(li) === open) return;
      li.setAttribute('aria-expanded', String(open));
      invalidate();
      if (!open) {
        const active = doc.activeElement;
        if (active && active !== li && li.contains(active)) focusItem(li);
        for (const d of descendantsOf(li)) if (d.tabIndex === 0) d.tabIndex = -1;
        if (!visibleItems(rootList()).some((v) => v.tabIndex === 0)) li.tabIndex = 0;
      } else if (isLazy(li)) void loadChildren(li);
      emit(tree, 'tree-toggle', { node: li, id: li.getAttribute('data-id') ?? '', expanded: open });
    };

    // ---- construção de nós --------------------------------------------------------------------

    function ensureGroup(li: HTMLElement): HTMLElement {
      let group = groupOf(li);
      if (!group) {
        group = doc.createElement('ul');
        group.setAttribute('role', 'group');
        li.append(group);
      }
      return group;
    }

    function buildNode(data: {
      id?: string;
      label: string;
      children?: TreeNodeData[];
      hasChildren?: boolean;
      expanded?: boolean;
    }): HTMLElement {
      const li = doc.createElement('li');
      li.setAttribute('role', 'treeitem');
      li.setAttribute('data-id', data.id ?? uid('tree'));
      li.tabIndex = -1;
      const row = doc.createElement('div');
      row.className = 'eds-tree-row';
      const toggle = doc.createElement('span');
      toggle.className = 'eds-tree-toggle';
      toggle.setAttribute('aria-hidden', 'true');
      const label = doc.createElement('span');
      label.className = 'eds-tree-label';
      label.textContent = data.label;
      row.append(toggle, label);
      li.append(row);
      if (data.children && data.children.length > 0) {
        const group = ensureGroup(li);
        group.append(...data.children.map((c) => buildNode(c)));
        li.setAttribute('aria-expanded', String(data.expanded === true));
      } else if (data.hasChildren) {
        li.setAttribute('data-eds-lazy', '');
        li.setAttribute('aria-expanded', 'false');
      }
      return li;
    }

    // ---- mudanças -----------------------------------------------------------------------------

    const indexIn = (li: HTMLElement) => siblingsOf(li).indexOf(li);

    /** `eds:tree-beforechange` cancelável: `false` se algum ouvinte cancelou. */
    const allow = (
      action: TreeChangeAction,
      node: HTMLElement,
      parent: HTMLElement | null,
      index: number,
      extra: object = {},
    ) => emit(tree, 'tree-beforechange', { action, node, parent, index, ...extra }, true);

    const changed = (
      action: TreeChangeAction,
      node: HTMLElement,
      parent: HTMLElement | null,
      index: number,
    ) => {
      refresh();
      emit(tree, 'tree-change', {
        action,
        node,
        parent,
        index,
        id: node.getAttribute('data-id') ?? '',
        label: labelOf(node),
        tree: toJson(rootList()),
      });
    };

    const announceMove = (li: HTMLElement) => {
      const parent = parentItem(li);
      const values = {
        label: labelOf(li),
        level: li.getAttribute('aria-level') ?? '1',
        pos: li.getAttribute('aria-posinset') ?? '1',
        size: li.getAttribute('aria-setsize') ?? '1',
        parent: parent ? labelOf(parent) : '',
      };
      say(format(parent ? getMessages().treeMovedIn : getMessages().treeMoved, values));
    };

    /**
     * Move `li` para dentro de `newParent` (ou a raiz) antes de `ref` (ou no fim).
     * `false` se não é permitido, se não muda nada ou se `beforechange` foi cancelado.
     */
    const moveTo = (
      li: HTMLElement,
      newParent: HTMLElement | null,
      ref: HTMLElement | null,
    ): boolean => {
      if (newParent && (newParent === li || li.contains(newParent))) return false;
      const list = newParent ? groupOf(newParent) : rootList();
      const others = itemsIn(list).filter((i) => i !== li);
      const index = ref ? others.indexOf(ref) : others.length;
      if (parentItem(li) === newParent && index === indexIn(li)) return false;
      if (!allow('move', li, newParent, index)) return false;
      const dest = newParent ? ensureGroup(newParent) : (rootList() as HTMLElement);
      dest.insertBefore(li, ref);
      if (newParent) newParent.setAttribute('aria-expanded', 'true');
      changed('move', li, newParent, index);
      focusItem(li);
      announceMove(li);
      return true;
    };

    const moveUp = (li: HTMLElement) => {
      const sib = siblingsOf(li);
      const prev = sib[sib.indexOf(li) - 1];
      if (!prev) return say(getMessages().treeCannotMove);
      moveTo(li, parentItem(li), prev);
    };
    const moveDown = (li: HTMLElement) => {
      const sib = siblingsOf(li);
      const next = sib[sib.indexOf(li) + 1];
      if (!next) return say(getMessages().treeCannotMove);
      moveTo(li, parentItem(li), sib[sib.indexOf(li) + 2] ?? null);
    };
    const indent = (li: HTMLElement) => {
      const sib = siblingsOf(li);
      const prev = sib[sib.indexOf(li) - 1];
      if (!prev) return say(getMessages().treeCannotMove);
      moveTo(li, prev, null);
    };
    const outdent = (li: HTMLElement) => {
      const parent = parentItem(li);
      if (!parent) return say(getMessages().treeCannotMove);
      const sib = siblingsOf(parent);
      moveTo(li, parentItem(parent), sib[sib.indexOf(parent) + 1] ?? null);
    };

    // ---- edição inline ------------------------------------------------------------------------

    let editing: { li: HTMLElement; finish: (save: boolean, refocus: boolean) => void } | null =
      null;

    /** Itens recém-criados ainda sem nome dado pelo usuário: o 1º nome fala "adicionado". */
    const fresh = new WeakSet<HTMLElement>();

    const startEdit = (li: HTMLElement) => {
      editing?.finish(true, false);
      const row = rowOf(li);
      const label = labelEl(li);
      if (!row || !label || !editable()) return;
      const previous = labelOf(li);
      const input = doc.createElement('input');
      input.type = 'text';
      input.className = 'eds-input eds-input-sm';
      input.value = previous;
      input.dataset.edsOriginal = previous;
      input.setAttribute('aria-label', format(getMessages().treeRenameLabel, { label: previous }));
      label.replaceWith(input);
      li.setAttribute('data-editing', '');
      let done = false;
      const finish = (save: boolean, refocus: boolean) => {
        if (done) return;
        done = true;
        editing = null;
        const next = input.value.trim();
        input.removeEventListener('keydown', onKey);
        input.removeEventListener('focusout', onBlur);
        label.textContent = previous;
        input.replaceWith(label);
        li.removeAttribute('data-editing');
        const wasFresh = fresh.has(li);
        fresh.delete(li);
        if (save) {
          if (next === '') say(format(getMessages().treeNameEmpty, { label: previous }));
          else if (next === previous) {
            if (wasFresh) say(format(getMessages().treeAddedNamed, { label: next }));
          } else {
            if (
              allow('rename', li, parentItem(li), indexIn(li), {
                label: next,
                previousLabel: previous,
              })
            ) {
              label.textContent = next;
              changed('rename', li, parentItem(li), indexIn(li));
              say(
                format(wasFresh ? getMessages().treeAddedNamed : getMessages().treeRenamed, {
                  label: next,
                }),
              );
            }
          }
        }
        refresh();
        if (refocus) focusItem(li);
      };
      const onKey = (event: KeyboardEvent) => {
        event.stopPropagation();
        if (event.key === 'Enter') {
          event.preventDefault();
          finish(true, true);
        } else if (event.key === 'Escape') {
          event.preventDefault();
          finish(false, true);
        }
      };
      const onBlur = () => finish(true, false);
      input.addEventListener('keydown', onKey);
      input.addEventListener('focusout', onBlur);
      editing = { li, finish };
      input.focus();
      input.select();
    };

    // ---- adicionar ----------------------------------------------------------------------------

    const addNode = (kind: 'child' | 'sibling' | 'wrap', target: HTMLElement) => {
      const node = buildNode({ label: getMessages().treeNewItem });
      let parent: HTMLElement | null;
      let ref: HTMLElement | null;
      let index: number;
      if (kind === 'child') {
        parent = target;
        ref = null;
        index = childItems(target).length;
      } else if (kind === 'sibling') {
        parent = parentItem(target);
        const sib = siblingsOf(target);
        ref = sib[sib.indexOf(target) + 1] ?? null;
        index = sib.indexOf(target) + 1;
      } else {
        parent = parentItem(target);
        ref = target;
        index = indexIn(target);
      }
      if (!allow(kind === 'wrap' ? 'wrap' : 'add', node, parent, index)) return;
      if (kind === 'wrap') {
        const dest = target.parentElement as HTMLElement;
        dest.insertBefore(node, target);
        ensureGroup(node).append(target);
        node.setAttribute('aria-expanded', 'true');
      } else {
        const dest = parent ? ensureGroup(parent) : (rootList() as HTMLElement);
        dest.insertBefore(node, ref);
        if (parent) parent.setAttribute('aria-expanded', 'true');
      }
      changed(kind === 'wrap' ? 'wrap' : 'add', node, parent, index);
      focusItem(node);
      say(
        format(getMessages().treeAdded, {
          label: labelOf(node),
          level: node.getAttribute('aria-level') ?? '1',
          pos: node.getAttribute('aria-posinset') ?? '1',
          size: node.getAttribute('aria-setsize') ?? '1',
        }),
      );
      fresh.add(node);
      startEdit(node);
    };

    // ---- excluir e desfazer ---------------------------------------------------------------------

    const remove = async (li: HTMLElement) => {
      const m = getMessages();
      const label = labelOf(li);
      const count = descendantsOf(li).length;
      if (count > 0) {
        const text = format(count === 1 ? m.treeDeleteConfirmOne : m.treeDeleteConfirmMany, {
          label,
          count,
        });
        const ok = await confirm(text, m.treeDeleteTitle, 'danger', { okText: m.treeDeleteTitle });
        if (!ok) {
          focusItem(li);
          return;
        }
      }
      if (!li.isConnected) return;
      const parent = parentItem(li);
      const index = indexIn(li);
      if (!allow('delete', li, parent, index)) {
        focusItem(li);
        return;
      }
      const sib = siblingsOf(li);
      const next = sib[sib.indexOf(li) + 1] ?? sib[sib.indexOf(li) - 1] ?? parent;
      li.remove();
      changed('delete', li, parent, index);
      focusItem(next ?? visibleItems(rootList())[0]);
      const base =
        count === 0 ? m.treeDeleted : count === 1 ? m.treeDeletedOneChild : m.treeDeletedChildren;
      const id = toast({
        variant: 'info',
        message: `${format(base, { label, count })} ${m.treeUndoHint}`,
        duration: 8000,
        action: { label: m.treeUndo, onClick: () => restore(li, parent, index) },
      });
      undoStack.push({ id, li, parent, index });
    };

    /** Exclusões ainda desfazíveis (o toast com "Desfazer" continua na tela): Ctrl+Z desfaz a última. */
    const undoStack: Array<{
      id: number;
      li: HTMLElement;
      parent: HTMLElement | null;
      index: number;
    }> = [];
    const onToastClose = (event: Event) => {
      const id = (event as CustomEvent<{ id: number }>).detail?.id;
      const at = undoStack.findIndex((u) => u.id === id);
      if (at >= 0) undoStack.splice(at, 1);
    };
    doc.addEventListener('eds:toast-close', onToastClose);
    const undoLast = (): boolean => {
      const last = undoStack.pop();
      if (!last) return false;
      toast.dismiss(last.id);
      restore(last.li, last.parent, last.index);
      return true;
    };

    const restore = (li: HTMLElement, parent: HTMLElement | null, index: number) => {
      if (li.isConnected) return;
      const target = parent && tree.contains(parent) ? parent : null;
      const list = target ? ensureGroup(target) : rootList();
      if (!list) return;
      if (!allow('add', li, target, index, { restored: true })) return;
      list.insertBefore(li, itemsIn(list)[index] ?? null);
      if (target) target.setAttribute('aria-expanded', 'true');
      changed('add', li, target, index);
      focusItem(li);
      say(format(getMessages().treeRestored, { label: labelOf(li) }));
    };

    // ---- menu "⋯" -------------------------------------------------------------------------------

    let menu: HTMLElement | null = null;
    let menuItem: HTMLElement | null = null;
    let menuButton: HTMLElement | null = null;

    const ensureMenu = (): HTMLElement => {
      if (menu) return menu;
      menu = doc.createElement('div');
      menu.className = 'eds-dropdown';
      menu.setAttribute('popover', 'auto');
      menu.setAttribute('role', 'group');
      ensureId(menu, 'tree-menu');
      tree.append(menu);
      createdNodes.push(menu);
      menu.addEventListener('toggle', onMenuToggle);
      menu.addEventListener('click', onMenuClick);
      menu.addEventListener('focusout', onMenuFocusOut);
      return menu;
    };

    const fillMenu = (li: HTMLElement) => {
      const m = getMessages();
      const el = ensureMenu();
      const sib = siblingsOf(li);
      const idx = sib.indexOf(li);
      const entries: Array<{
        action: string;
        label: string;
        disabled?: boolean;
        danger?: boolean;
        separator?: boolean;
      }> = [
        { action: 'child', label: m.treeMenuAddChild },
        { action: 'sibling', label: m.treeMenuAddSibling },
        { action: 'wrap', label: m.treeMenuAddParent },
        { action: 'rename', label: m.treeMenuRename },
        { action: 'up', label: m.treeMenuMoveUp, disabled: idx <= 0 },
        { action: 'down', label: m.treeMenuMoveDown, disabled: idx >= sib.length - 1 },
        { action: 'indent', label: m.treeMenuIndent, disabled: idx <= 0 },
        { action: 'outdent', label: m.treeMenuOutdent, disabled: !parentItem(li) },
        { action: 'delete', label: m.treeMenuDelete, danger: true, separator: true },
      ];
      el.setAttribute('aria-label', format(m.treeActions, { label: labelOf(li) }));
      el.replaceChildren(
        ...entries.flatMap((entry) => {
          const button = doc.createElement('button');
          button.type = 'button';
          button.className = `eds-dropdown-item${entry.danger ? ' eds-dropdown-item-danger' : ''}`;
          button.textContent = entry.label;
          button.setAttribute('data-action', entry.action);
          if (entry.disabled) button.setAttribute('aria-disabled', 'true');
          if (entry.separator) {
            const hr = doc.createElement('hr');
            hr.className = 'eds-dropdown-separator';
            return [hr, button];
          }
          return [button];
        }),
      );
      menuItem = li;
    };

    const runAction = (action: string, li: HTMLElement) => {
      switch (action) {
        case 'child':
          return addNode('child', li);
        case 'sibling':
          return addNode('sibling', li);
        case 'wrap':
          return addNode('wrap', li);
        case 'rename':
          return startEdit(li);
        case 'up':
          return moveUp(li);
        case 'down':
          return moveDown(li);
        case 'indent':
          return indent(li);
        case 'outdent':
          return outdent(li);
        case 'delete':
          return void remove(li);
      }
    };

    // Sem anchor positioning (Firefox), o JS coloca o menu junto ao gatilho (ver dropdown.css).
    let stopPlacing: () => void = () => undefined;

    function onMenuToggle(event: Event) {
      const open = (event as Partial<ToggleEvent>).newState === 'open';
      menuButton?.setAttribute('aria-expanded', String(open));
      stopPlacing();
      stopPlacing = () => undefined;
      if (open && menu && menuButton) stopPlacing = placeMenuFallback(menu, menuButton);
      if (open) {
        menu?.querySelector<HTMLElement>('.eds-dropdown-item:not([aria-disabled="true"])')?.focus();
        return;
      }
      const active = doc.activeElement;
      if (
        menuItem &&
        (!active || active === doc.body || menu?.contains(active) || active === menuButton)
      ) {
        focusItem(menuItem);
      }
    }

    function onMenuClick(event: Event) {
      const button = (event.target as Element).closest<HTMLElement>('[data-action]');
      if (!button || !menuItem) return;
      if (button.getAttribute('aria-disabled') === 'true') {
        event.preventDefault();
        return;
      }
      const li = menuItem;
      const action = button.getAttribute('data-action') ?? '';
      if (menu) hidePopover(menu);
      focusItem(li);
      runAction(action, li);
    }

    function onMenuFocusOut(event: FocusEvent) {
      const next = event.relatedTarget as Node | null;
      if (!next || menu?.contains(next) || next === menuButton) return;
      if (menu) hidePopover(menu);
    }

    /** Prepara o menu para o item da linha do botão; o `popovertarget` abre o popover. */
    const onActionPrepare = (event: Event) => {
      const button = (event.target as Element).closest<HTMLElement>('.eds-tree-action');
      if (!button || !tree.contains(button) || !editable()) return;
      const li = button.closest<HTMLElement>(ITEM);
      if (!li) return;
      menuButton = button;
      fillMenu(li);
      button.setAttribute('popovertarget', ensureId(ensureMenu(), 'tree-menu'));
      focusItem(li);
    };

    const openMenu = (li: HTMLElement) => {
      const button = rowOf(li)?.querySelector<HTMLElement>('.eds-tree-action');
      if (!button) return;
      button.click();
      // Sem Popover API (ambiente antigo), o clique não abre: abre à mão.
      if (menu && !menu.matches(':popover-open') && !('popover' in HTMLElement.prototype))
        showPopover(menu);
    };

    // ---- teclado ------------------------------------------------------------------------------------

    let typed = '';
    let typedAt = 0;

    const typeAhead = (li: HTMLElement, char: string) => {
      const now = Date.now();
      typed = now - typedAt > 500 ? char : typed + char;
      typedAt = now;
      const visible = cachedVisible();
      const start = visible.indexOf(li);
      const query = normalizeText(typed);
      const cycle = [
        ...visible.slice(start + (typed.length === 1 ? 1 : 0)),
        ...visible.slice(0, start + 1),
      ];
      const hit = cycle.find((v) => normalizeText(labelOf(v)).startsWith(query));
      if (hit) focusItem(hit);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      try {
        handleKey(event);
      } finally {
        // Teclas que podem alterar a árvore descartam o cache; as de navegação o reaproveitam.
        if (!NAV_KEYS.has(event.key) || event.altKey || event.ctrlKey || event.metaKey)
          invalidate();
      }
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      const li = (event.target as Element).closest<HTMLElement>(ITEM);
      if (!li || event.target !== li || !tree.contains(li)) return;
      const { key, altKey, shiftKey } = event;
      const ctrl = event.ctrlKey || event.metaKey;
      const edit = editable();
      const visible = cachedVisible();
      const at = visible.indexOf(li);
      const handled = () => event.preventDefault();

      if (altKey && !ctrl) {
        if (!edit) return;
        const alt: Record<string, (item: HTMLElement) => void> = {
          ArrowUp: moveUp,
          ArrowDown: moveDown,
          ArrowRight: indent,
          ArrowLeft: outdent,
        };
        const run = alt[key];
        if (run) {
          handled();
          run(li);
        }
        return;
      }
      if (edit && ctrl && !shiftKey && key.toLowerCase() === 'z' && undoStack.length > 0) {
        return (handled(), void undoLast());
      }
      if (key === 'Enter' && edit && ctrl) return (handled(), addNode('child', li));
      if (key === 'Enter' && edit && shiftKey) return (handled(), addNode('sibling', li));
      if (key === 'F10' && shiftKey && edit) return (handled(), openMenu(li));
      if (key === 'ContextMenu' && edit) return (handled(), openMenu(li));

      switch (key) {
        case 'ArrowDown':
        case 'ArrowUp': {
          handled();
          const next = visible[at + (key === 'ArrowDown' ? 1 : -1)];
          if (!next) return;
          focusItem(next);
          if (multiselect() && shiftKey) selectRange(next);
          return;
        }
        case 'ArrowRight':
          handled();
          if (!isParent(li)) return;
          if (!isExpanded(li)) setExpanded(li, true);
          else focusItem(childItems(li)[0]);
          return;
        case 'ArrowLeft':
          handled();
          if (isParent(li) && isExpanded(li)) setExpanded(li, false);
          else focusItem(parentItem(li));
          return;
        case 'Home':
          handled();
          return focusItem(visible[0]);
        case 'End':
          handled();
          return focusItem(visible[visible.length - 1]);
        case '*':
          handled();
          for (const s of siblingsOf(li)) setExpanded(s, true);
          return;
        case ' ':
          handled();
          if (multiselect() && ctrl) toggleSelected(li);
          else pick(li, event);
          return;
        case 'Enter':
          handled();
          emit(tree, 'tree-activate', { node: li, id: li.getAttribute('data-id') ?? '' });
          if (!edit && isParent(li)) setExpanded(li, !isExpanded(li));
          return;
        case 'F2':
          if (!edit) return;
          handled();
          return startEdit(li);
        case 'Insert':
          if (!edit) return;
          handled();
          return addNode('child', li);
        case 'Delete':
          if (!edit) return;
          handled();
          return void remove(li);
        default:
          if (key.length === 1 && !ctrl && !altKey) typeAhead(li, key);
      }
    };

    // ---- mouse ----------------------------------------------------------------------------------------

    const ownRow = (target: Element): HTMLElement | null => {
      const row = target.closest<HTMLElement>(ROW);
      const li = row?.parentElement;
      return row && li && isItem(li) && tree.contains(li) ? li : null;
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target as Element;
      if (target.closest('.eds-tree-action') || target.closest('input')) return;
      const li = ownRow(target);
      if (!li) return;
      if (target.closest('.eds-tree-toggle')) {
        if (isParent(li)) setExpanded(li, !isExpanded(li));
        focusItem(li);
        return;
      }
      focusItem(li);
      pick(li, event);
    };

    const onDblClick = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!editable() || target.closest('.eds-tree-action, .eds-tree-toggle, input')) return;
      const li = ownRow(target);
      if (li) startEdit(li);
    };

    // ---- arrastar --------------------------------------------------------------------------------------

    let dropTarget: { li: HTMLElement; zone: DropZone; invalid: boolean } | null = null;
    let expandTimer: ReturnType<typeof setTimeout> | null = null;

    const clearDrop = () => {
      if (expandTimer) clearTimeout(expandTimer);
      expandTimer = null;
      for (const row of Array.from(tree.querySelectorAll(`${ROW}[data-drop]`))) {
        row.removeAttribute('data-drop');
        row.removeAttribute('data-drop-invalid');
      }
      dropTarget = null;
    };

    const engine = createDragEngine(
      tree,
      {
        grab(event) {
          if (!editable() || editing) return null;
          const target = event.target as Element;
          if (target.closest('button, input, a[href]')) return null;
          return ownRow(target);
        },
        hold: () => true,
        start(session) {
          session.source.setAttribute('data-dragging', '');
        },
        ghost(session) {
          const row = rowOf(session.source);
          if (!row) return null;
          const ghost = cloneGhost(row, 'eds-sortable-ghost');
          ghost.classList.add('eds-tree-ghost');
          ghost.style.inlineSize = `${row.getBoundingClientRect().width}px`;
          return ghost;
        },
        ghostHost: () => tree,
        move(session: DragSession) {
          const source = session.source;
          let found: { li: HTMLElement; zone: DropZone; invalid: boolean } | null = null;
          for (const li of visibleItems(rootList())) {
            const rect = rowOf(li)?.getBoundingClientRect();
            if (!rect || session.y < rect.top || session.y > rect.bottom) continue;
            if (li === source) break;
            const ratio = rect.height > 0 ? (session.y - rect.top) / rect.height : 0.5;
            const zone: DropZone = ratio < 1 / 3 ? 'before' : ratio > 2 / 3 ? 'after' : 'inside';
            found = { li, zone, invalid: source.contains(li) };
            break;
          }
          if (found?.li === dropTarget?.li && found?.zone === dropTarget?.zone) return;
          clearDrop();
          if (!found) return;
          dropTarget = found;
          const row = rowOf(found.li);
          row?.setAttribute('data-drop', found.zone);
          if (found.invalid) row?.setAttribute('data-drop-invalid', '');
          else if (found.zone === 'inside' && isParent(found.li) && !isExpanded(found.li)) {
            const li = found.li;
            expandTimer = setTimeout(() => setExpanded(li, true), 600);
          }
        },
        drop(session) {
          const source = session.source;
          const hit = dropTarget;
          clearDrop();
          source.removeAttribute('data-dragging');
          if (!hit) return;
          if (hit.invalid) return say(getMessages().treeDropInvalid);
          const { li, zone } = hit;
          if (zone === 'inside') moveTo(source, li, null);
          else if (zone === 'before') moveTo(source, parentItem(li), li);
          else {
            const next = siblingsOf(li).filter((s) => s !== source);
            moveTo(source, parentItem(li), next[next.indexOf(li) + 1] ?? null);
          }
          focusItem(source);
        },
        cancel(session) {
          clearDrop();
          session.source.removeAttribute('data-dragging');
        },
      },
      { ghostClass: 'eds-sortable-ghost' },
    );

    // ---- ligação -----------------------------------------------------------------------------------------

    tree.addEventListener('keydown', onKeyDown);
    tree.addEventListener('click', onClick);
    tree.addEventListener('dblclick', onDblClick);
    tree.addEventListener('click', onActionPrepare, true);

    const mutationObserver = new MutationObserver((records) => {
      invalidate();
      // Só mudança de estrutura renumera; `aria-expanded` externo apenas invalida o cache.
      if (records.some((record) => record.type === 'childList')) scheduleRefresh();
    });
    observer = mutationObserver;
    const watch = () =>
      mutationObserver.observe(tree, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['aria-expanded'],
      });

    const source = tree.getAttribute('data-eds-source');
    if (!rootList() && source) {
      const control = new AbortController();
      aborts.add(control);
      tree.setAttribute('aria-busy', 'true');
      say(getMessages().treeLoading);
      const init: FetchInit = {
        headers: { Accept: 'application/json' },
        signal: control.signal,
        edsLoader: false,
      };
      fetch(source, init)
        .then((r) => {
          if (!r.ok) throw new Error(String(r.status));
          return r.json() as Promise<TreeNodeData[]>;
        })
        .then((data) => {
          if (!Array.isArray(data)) throw new Error('formato');
          const list = doc.createElement('ul');
          list.setAttribute('role', 'tree');
          list.append(...data.map((d) => buildNode(d)));
          tree.insertBefore(list, tree.firstChild);
          refresh();
          say('');
        })
        .catch(() => {
          if (!control.signal.aborted) say(getMessages().treeLoadError);
        })
        .finally(() => {
          aborts.delete(control);
          tree.removeAttribute('aria-busy');
        });
    }

    refresh();
    watch();

    return () => {
      engine.destroy();
      mutationObserver.disconnect();
      refreshQueued = false;
      tree.removeEventListener('keydown', onKeyDown);
      doc.removeEventListener('eds:toast-close', onToastClose);
      tree.removeEventListener('click', onClick);
      tree.removeEventListener('dblclick', onDblClick);
      tree.removeEventListener('click', onActionPrepare, true);
      for (const control of aborts) control.abort();
      aborts.clear();
      editing?.finish(false, false);
      clearDrop();
      announcer.dispose();
      stopPlacing();
      if (menu) hidePopover(menu);
      for (const node of createdNodes) node.remove();
      for (const button of Array.from(tree.querySelectorAll('.eds-tree-action[popovertarget]'))) {
        button.removeAttribute('popovertarget');
      }
    };
  },
};

export function initTree(root: ParentNode = document): () => void {
  return bindAll(root, [treeBehavior]);
}
