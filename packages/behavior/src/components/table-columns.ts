import { describeBy, emit, flag, uid } from '../core/dom';
import { createDragEngine, type DragEngine } from '../core/drag';
import { format, getMessages } from '../core/config';
import { bindAll, type Behavior } from '../core/registry';
import { popoverBehavior } from './popover';
import {
  columnLabel,
  hubFor,
  tableById,
  type ColumnsApi,
  type TableColumnState,
  type TableHub,
} from '../core/table-hub';

type Reason = 'move' | 'resize' | 'visibility' | 'reset' | 'prefs';
type Pin = 'start' | 'end';

const STEP = 16;
const STEP_BIG = 64;
const PIN_LIMIT = 0.6;
const PREFS_DELAY = 300;
const PREFS_VERSION = 1;

interface Col {
  id: string;
  /** Cabeçalho (muda de posição, mas é sempre o mesmo elemento). */
  th: HTMLTableCellElement;
  pin: Pin | null;
}

const num = (value: string | null, fallback: number): number => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

interface Instance {
  api: ColumnsApi;
  /** Quem usa: a tabela (atributos) e o painel. */
  retain: () => () => void;
}

const instances = new WeakMap<HTMLTableElement, Instance>();

function createInstance(table: HTMLTableElement, hub: TableHub, onDestroy: () => void): Instance {
  const doc = table.ownerDocument;
  const win = doc.defaultView;
  const wrap = table.closest<HTMLElement>('.eds-table-wrap');
  const headRow = (): HTMLTableRowElement | undefined =>
    table.tHead ? table.tHead.rows[table.tHead.rows.length - 1] : table.rows[0];

  const wantsResize = () => flag(table, 'data-eds-table-resize');
  const wantsReorder = () => flag(table, 'data-eds-table-reorder');

  // ---- Colunas ------------------------------------------------------------------------
  const isLocked = (th: HTMLTableCellElement): boolean =>
    !th.hasAttribute('data-eds-col') ||
    th.hasAttribute('data-eds-col-locked') ||
    th.classList.contains('eds-table-check') ||
    th.classList.contains('eds-table-actions');

  const pinOf = (th: HTMLTableCellElement): Pin | null => {
    const value = th.getAttribute('data-eds-pin');
    if (value === 'start' || value === 'end') return value;
    if (th.classList.contains('eds-table-pin-start')) return 'start';
    return th.classList.contains('eds-table-pin-end') ? 'end' : null;
  };

  /** Colunas arranjáveis, na ordem em que estão no DOM agora. */
  const readCols = (): Col[] =>
    Array.from(headRow()?.cells ?? [])
      .filter((th) => !isLocked(th))
      .map((th) => ({
        id: th.getAttribute('data-eds-col') as string,
        th,
        pin: pinOf(th),
      }));

  const initial = readCols();
  const colById = new Map(initial.map((c) => [c.id, c]));
  const rank = (id: string) => {
    const pin = colById.get(id)?.pin;
    return pin === 'start' ? 0 : pin === 'end' ? 2 : 1;
  };
  // Fixas ficam nas pontas: a ordem de origem já é a do grupo (início, livres, fim), de modo que
  // a ordem salva nas preferências é a mesma que aparece na tela depois de recarregar.
  const defaults: TableColumnState = {
    order: initial
      .map((c, i) => ({ id: c.id, i }))
      .sort((a, b) => rank(a.id) - rank(b.id) || a.i - b.i)
      .map((x) => x.id),
    hidden: initial.filter((c) => c.th.hidden).map((c) => c.id),
    widths: {},
  };
  // Cabeçalho como foi escrito (a ordem de origem): linhas que o app desenha depois vêm nela.
  const origHead = Array.from(headRow()?.cells ?? []);
  const origIndex = new Map<string, number>();
  origHead.forEach((th, i) => {
    const id = th.getAttribute('data-eds-col');
    if (id) origIndex.set(id, i);
  });
  const origSlots: number[] = [];
  origHead.forEach((th, i) => {
    if (!isLocked(th)) origSlots.push(i);
  });
  /** Último arranjo feito em cada pai (linha ou colgroup): reconhece o que já está arranjado. */
  const placed = new WeakMap<Element, { orig: Element[]; now: Element[] }>();
  const state: TableColumnState = {
    order: [...defaults.order],
    hidden: [...defaults.hidden],
    widths: {},
  };
  const group = (id: string): Pin | 'free' => colById.get(id)?.pin ?? 'free';
  const isHidden = (id: string) => state.hidden.includes(id);
  const visibleIds = () => state.order.filter((id) => !isHidden(id));
  const labelOf = (id: string) => columnLabel(colById.get(id)?.th) || id;
  const minOf = (id: string) =>
    num(colById.get(id)?.th.getAttribute('data-eds-min-width') ?? null, 64);
  const maxOf = (id: string) =>
    num(colById.get(id)?.th.getAttribute('data-eds-max-width') ?? null, 640);

  // ---- Aplicação no DOM ---------------------------------------------------------------
  let colgroup: HTMLTableColElement[] = [];

  /** `<colgroup>` com um `<col>` por coluna do cabeçalho (criado só se for preciso). */
  const ensureColgroup = (): HTMLTableColElement[] => {
    const count = headRow()?.cells.length ?? 0;
    let cg = table.querySelector('colgroup');
    if (!cg) {
      const created = doc.createElement('colgroup');
      for (const th of origHead) {
        const col = doc.createElement('col');
        const id = th.getAttribute('data-eds-col');
        if (id) col.setAttribute('data-eds-col', id);
        created.append(col);
      }
      table.querySelector('caption')?.after(created);
      if (!created.isConnected) table.prepend(created);
      cg = created;
    }
    colgroup = Array.from(cg.querySelectorAll('col'));
    if (colgroup.length !== count) return [];
    arrange(colgroup, cg);
    return colgroup;
  };

  let applying = false;

  /**
   * Põe os itens (células de uma linha ou `<col>`s) na ordem do estado. Parte sempre da ordem de
   * origem: se o pai ainda tem o arranjo anterior, usa a origem guardada; senão (linha nova do
   * app, escrita na ordem original) o que está no DOM é a origem.
   */
  function arrange(items: Element[], parent: Element): void {
    const rec = placed.get(parent);
    const known = rec && rec.now.length === items.length && rec.now.every((n, i) => n === items[i]);
    const orig = known ? rec.orig : items;
    const next = orig.slice();
    origSlots.forEach((slot, k) => {
      const from = origIndex.get(state.order[k] ?? '');
      if (from !== undefined) next[slot] = orig[from] as Element;
    });
    const children = Array.from(parent.children);
    next.forEach((node, i) => {
      const current = children[i];
      if (current !== node) {
        parent.insertBefore(node, current ?? null);
        children.splice(children.indexOf(node), 1);
        children.splice(i, 0, node);
      }
    });
    placed.set(parent, { orig, now: next });
  }

  const applyOrder = () => {
    if (origHead.length === 0) return;
    for (const row of Array.from(table.rows)) {
      if (row.cells.length !== origHead.length) continue;
      arrange(Array.from(row.cells), row);
    }
    const cols = ensureColgroupIfAny();
    const first = cols[0];
    if (first?.parentElement && cols.length === origHead.length) arrange(cols, first.parentElement);
  };

  const ensureColgroupIfAny = (): HTMLTableColElement[] => {
    const cg = table.querySelector('colgroup');
    if (!cg) return [];
    colgroup = Array.from(cg.querySelectorAll('col'));
    return colgroup;
  };

  const applyVisibility = () => {
    const head = headRow();
    if (!head) return;
    const H = Array.from(head.cells);
    const hiddenAt = H.map((th) => {
      const id = th.getAttribute('data-eds-col');
      return id !== null && isHidden(id);
    });
    const visible = hiddenAt.filter((h) => !h).length;
    for (const row of Array.from(table.rows)) {
      if (row.cells.length === H.length) {
        Array.from(row.cells).forEach((cell, i) => {
          if (cell.hidden !== hiddenAt[i]) cell.hidden = hiddenAt[i] as boolean;
        });
      } else if (row.cells.length === 1 && (row.cells[0] as HTMLTableCellElement).colSpan > 1) {
        (row.cells[0] as HTMLTableCellElement).colSpan = Math.max(1, visible);
      }
    }
    const cols = ensureColgroupIfAny();
    if (cols.length === H.length) cols.forEach((col, i) => (col.hidden = hiddenAt[i] as boolean));
  };

  const applyWidths = () => {
    const entries = Object.entries(state.widths);
    const any = entries.length > 0;
    const cols = any ? ensureColgroup() : ensureColgroupIfAny();
    const head = headRow();
    if (cols.length && head) {
      Array.from(head.cells).forEach((th, i) => {
        const id = th.getAttribute('data-eds-col');
        const col = cols[i];
        if (!col) return;
        const w = id ? state.widths[id] : undefined;
        if (w) col.style.width = `${w}px`;
        else col.style.removeProperty('width');
      });
    }
    table.classList.toggle('eds-table-fixed', any);
    // Soma só quando toda coluna visível tem largura; senão a tabela divide o que sobra.
    const vis = visibleIds();
    const all = any && vis.length > 0 && vis.every((id) => state.widths[id]);
    const fixedAll = Array.from(head?.cells ?? [])
      .filter((th) => isLocked(th) && !th.hidden)
      .every((th) => th.getBoundingClientRect().width > 0);
    if (all && fixedAll) {
      const locked = Array.from(head?.cells ?? [])
        .filter((th) => isLocked(th) && !th.hidden)
        .reduce((sum, th) => sum + th.getBoundingClientRect().width, 0);
      const total = vis.reduce((sum, id) => sum + (state.widths[id] ?? 0), 0) + locked;
      table.style.setProperty('--_table-inline-size', `${Math.round(total)}px`);
    } else table.style.removeProperty('--_table-inline-size');
  };

  // ---- Colunas fixas -------------------------------------------------------------------
  const applyPins = () => {
    const head = headRow();
    if (!head) return;
    const H = Array.from(head.cells);
    const pins = H.map((th) =>
      isLocked(th) ? null : (colById.get(th.getAttribute('data-eds-col') as string)?.pin ?? null),
    );
    if (!pins.some(Boolean)) return;
    const visible = H.map((th) => !th.hidden);
    const widths = H.map((th) => (th.hidden ? 0 : th.getBoundingClientRect().width));
    const insets: number[] = H.map(() => 0);
    let startSize = 0;
    H.forEach((_, i) => {
      if (pins[i] === 'start' && visible[i]) {
        insets[i] = startSize;
        startSize += widths[i] as number;
      }
    });
    let endSize = 0;
    for (let i = H.length - 1; i >= 0; i -= 1) {
      if (pins[i] === 'end' && visible[i]) {
        insets[i] = endSize;
        endSize += widths[i] as number;
      }
    }
    const lastStartVisible = pins
      .map((p, i) => (p === 'start' && visible[i] ? i : -1))
      .reduce((a, b) => Math.max(a, b), -1);
    const firstEnd = pins.findIndex((p, i) => p === 'end' && visible[i]);
    for (const row of Array.from(table.rows)) {
      if (row.cells.length !== H.length) continue;
      Array.from(row.cells).forEach((cell, i) => {
        const pin = pins[i];
        cell.classList.toggle('eds-table-pin-start', pin === 'start');
        cell.classList.toggle('eds-table-pin-end', pin === 'end');
        cell.classList.toggle(
          'eds-table-pin-edge',
          (pin === 'start' && i === lastStartVisible) || (pin === 'end' && i === firstEnd),
        );
        if (pin) cell.style.setProperty('--_pin-inset', `${Math.round(insets[i] as number)}px`);
        else cell.style.removeProperty('--_pin-inset');
      });
    }
    if (wrap) {
      wrap.style.setProperty('--_pin-start-size', `${Math.round(startSize)}px`);
      wrap.style.setProperty('--_pin-end-size', `${Math.round(endSize)}px`);
      // Reflow (1.4.10): fixas demais sobre uma janela estreita voltam ao fluxo normal.
      const room = wrap.clientWidth;
      wrap.toggleAttribute('data-pin-disabled', room > 0 && startSize + endSize > room * PIN_LIMIT);
    }
  };

  // Fixação lida na ligação (as classes mudam depois; a origem da verdade é esta leitura).
  const pinsAtBind = new Map<HTMLTableCellElement, Pin | null>(
    Array.from(headRow()?.cells ?? []).map((th) => [th, pinOf(th)]),
  );
  let pinObserver: ResizeObserver | null = null;
  if (typeof ResizeObserver !== 'undefined' && [...pinsAtBind.values()].some(Boolean)) {
    pinObserver = new ResizeObserver(() => applyPins());
    for (const [th, pin] of pinsAtBind) if (pin) pinObserver.observe(th);
    if (wrap) pinObserver.observe(wrap);
  }

  const applyAll = () => {
    if (applying) return;
    applying = true;
    const active = doc.activeElement;
    try {
      applyOrder();
      applyVisibility();
      applyWidths();
      applyPins();
    } finally {
      applying = false;
    }
    if (active instanceof HTMLElement && active.isConnected && doc.activeElement !== active) {
      active.focus({ preventScroll: true });
    }
  };

  // ---- Estado --------------------------------------------------------------------------
  let changeReasons = new Set<Reason>();
  let suspended = false;
  const changed = (reason: Reason) => {
    hub.fire('columns-state');
    if (suspended) {
      changeReasons.add(reason);
      return;
    }
    emit(table, 'table-columns-change', {
      order: [...state.order],
      hidden: [...state.hidden],
      widths: { ...state.widths },
      reason,
    });
    hub.fire('columns', reason);
    savePrefs(reason);
  };

  // ---- Preferências --------------------------------------------------------------------
  const prefsKey = table.getAttribute('data-eds-table-prefs');
  const storageKey = prefsKey ? `eds:table:${prefsKey}` : null;
  const saveWhat = (table.getAttribute('data-eds-table-prefs-save') ?? 'order hidden widths').split(
    /\s+/,
  );
  let saveTimer: ReturnType<typeof setTimeout> | null = null;

  const store = (): Storage | null => {
    try {
      return win?.localStorage ?? null;
    } catch {
      return null;
    }
  };

  function savePrefs(reason: Reason): void {
    if (!storageKey || reason === 'prefs' || reason === 'reset') return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(writePrefs, PREFS_DELAY);
  }

  function writePrefs(): void {
    saveTimer = null;
    const s = store();
    if (!s || !storageKey) return;
    const value: Record<string, unknown> = { v: PREFS_VERSION };
    if (saveWhat.includes('order')) value.order = state.order;
    if (saveWhat.includes('hidden')) value.hidden = state.hidden;
    if (saveWhat.includes('widths')) value.widths = state.widths;
    if (saveWhat.includes('sort') && !table.hasAttribute('data-eds-table-remote')) {
      value.sort = hub.query.sort;
    }
    try {
      s.setItem(storageKey, JSON.stringify(value));
    } catch {
      /* sem espaço ou bloqueado: segue com os padrões */
    }
  }

  const clearPrefs = () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = null;
    if (!storageKey) return;
    try {
      store()?.removeItem(storageKey);
    } catch {
      /* bloqueado */
    }
  };

  /** Aplica um estado parcial, ignorando ids desconhecidos; colunas novas entram no fim. */
  const merge = (partial: Partial<TableColumnState>) => {
    if (partial.order) {
      const known = partial.order.filter((id, i, a) => colById.has(id) && a.indexOf(id) === i);
      // Cada coluna fica no grupo dela (fixas não saem do próprio grupo).
      const rest = state.order.filter((id) => !known.includes(id));
      const merged = [...known, ...rest];
      state.order = merged
        .map((id, i) => ({ id, i }))
        .sort((a, b) => rank(a.id) - rank(b.id) || a.i - b.i)
        .map((x) => x.id);
    }
    if (partial.hidden) {
      const hidden = partial.hidden.filter((id, i, a) => colById.has(id) && a.indexOf(id) === i);
      state.hidden = hidden.length >= state.order.length ? hidden.slice(1) : hidden;
    }
    if (partial.widths) {
      state.widths = {};
      for (const [id, w] of Object.entries(partial.widths)) {
        if (colById.has(id) && Number.isFinite(w) && w > 0) {
          state.widths[id] = Math.min(maxOf(id), Math.max(minOf(id), Math.round(w)));
        }
      }
    }
  };

  const loadPrefs = () => {
    if (!storageKey) return;
    try {
      const raw = store()?.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        v?: number;
        order?: string[];
        hidden?: string[];
        widths?: Record<string, number>;
        sort?: { key: string; direction: 'ascending' | 'descending' }[];
      };
      if (parsed.v !== PREFS_VERSION) return;
      merge({
        order: Array.isArray(parsed.order) ? parsed.order : undefined,
        hidden: Array.isArray(parsed.hidden) ? parsed.hidden : undefined,
        widths: parsed.widths && typeof parsed.widths === 'object' ? parsed.widths : undefined,
      });
      if (
        saveWhat.includes('sort') &&
        Array.isArray(parsed.sort) &&
        !table.hasAttribute('data-eds-table-remote')
      ) {
        hub.query.sort = parsed.sort.filter((c) => c && typeof c.key === 'string');
        hub.fire('sync', ['sort']);
      }
    } catch {
      /* JSON inválido ou armazenamento indisponível: padrões */
    }
  };

  // ---- Operações -----------------------------------------------------------------------
  const position = (id: string) => {
    const vis = visibleIds();
    return { pos: vis.indexOf(id) + 1, total: vis.length };
  };

  /** Move `id` uma posição no próprio grupo; `skipHidden` pula as ocultas (alça de teclado). */
  const moveBy = (id: string, delta: -1 | 1, skipHidden: boolean): boolean => {
    const list = state.order.filter((x) => group(x) === group(id));
    let j = list.indexOf(id) + delta;
    while (skipHidden && list[j] !== undefined && isHidden(list[j] as string)) j += delta;
    const target = list[j];
    if (target === undefined) return false;
    state.order = state.order.filter((x) => x !== id);
    const at = state.order.indexOf(target);
    state.order.splice(delta < 0 ? at : at + 1, 0, id);
    applyAll();
    return true;
  };

  const moveEdge = (id: string, edge: 'start' | 'end'): boolean => {
    const list = state.order.filter((x) => group(x) === group(id) && !isHidden(x));
    const target = edge === 'start' ? list[0] : list[list.length - 1];
    if (target === undefined || target === id) return false;
    state.order = state.order.filter((x) => x !== id);
    const at = state.order.indexOf(target);
    state.order.splice(edge === 'start' ? at : at + 1, 0, id);
    applyAll();
    return true;
  };

  const moveNear = (id: string, target: string, side: 'before' | 'after'): boolean => {
    if (id === target || group(id) !== group(target)) return false;
    state.order = state.order.filter((x) => x !== id);
    const at = state.order.indexOf(target);
    state.order.splice(side === 'before' ? at : at + 1, 0, id);
    applyAll();
    return true;
  };

  const currentWidth = (id: string): number => {
    const known = state.widths[id];
    if (known) return known;
    return Math.round(colById.get(id)?.th.getBoundingClientRect().width ?? 0);
  };

  /** Fixa na tabela as larguras de agora (a primeira vez que alguém redimensiona). */
  const materialize = () => {
    if (Object.keys(state.widths).length > 0) return;
    for (const id of visibleIds()) {
      const w = Math.round(colById.get(id)?.th.getBoundingClientRect().width ?? 0);
      if (w > 0) state.widths[id] = Math.min(maxOf(id), Math.max(minOf(id), w));
    }
  };

  const setWidth = (id: string, px: number | null): number => {
    if (px === null) delete state.widths[id];
    else {
      materialize();
      state.widths[id] = Math.min(maxOf(id), Math.max(minOf(id), Math.round(px)));
    }
    applyAll();
    return state.widths[id] ?? currentWidth(id);
  };

  const toggle = (id: string, show: boolean): boolean => {
    if (!colById.has(id) || show !== isHidden(id)) return false;
    if (!show && visibleIds().length <= 1) {
      hub.announce(getMessages().tableColumnLastVisible);
      return false;
    }
    state.hidden = show ? state.hidden.filter((x) => x !== id) : [...state.hidden, id];
    applyAll();
    if (!show) hub.fire('column-hidden', id);
    const m = getMessages();
    hub.announce(
      format(show ? m.tableColumnShown : m.tableColumnHidden, {
        column: labelOf(id),
        visible: visibleIds().length,
        total: state.order.length,
      }),
    );
    changed('visibility');
    return true;
  };

  const reset = () => {
    state.order = [...defaults.order];
    state.hidden = [...defaults.hidden];
    state.widths = {};
    applyAll();
    clearPrefs();
    hub.announce(getMessages().tableColumnsRestored);
    changed('reset');
  };

  const api: ColumnsApi = {
    state: () => ({
      order: [...state.order],
      hidden: [...state.hidden],
      widths: { ...state.widths },
    }),
    ids: () => [...state.order],
    label: labelOf,
    visible: (id) => !isHidden(id),
    visibleCount: () => visibleIds().length,
    canResize: wantsResize,
    canReorder: () => true,
    width: currentWidth,
    move: (id, delta) => {
      if (!moveBy(id, delta, false)) return false;
      const { pos, total } = position(id);
      hub.announce(format(getMessages().tableColumnMoved, { column: labelOf(id), pos, total }));
      changed('move');
      return true;
    },
    toggle,
    resize: (id, delta) => {
      const w = setWidth(id, currentWidth(id) + delta);
      hub.announce(format(getMessages().tableColumnResized, { column: labelOf(id), width: w }));
      changed('resize');
      return w;
    },
    reset,
  };
  hub.columns = api;
  hub.getColumns = api.state;
  hub.setColumns = (partial) => {
    merge(partial);
    applyAll();
    hub.fire('columns-state');
  };

  loadPrefs();
  applyAll();

  // ---- Alças e bordas (teclado e ponteiro) ---------------------------------------------
  const cleanups: (() => void)[] = [];
  let helpId: string | null = null;
  const helpText = () => {
    if (helpId) return helpId;
    const p = doc.createElement('p');
    p.id = uid('col-help');
    p.className = 'eds-visually-hidden';
    p.textContent = getMessages().tableColumnHandleHelp;
    (wrap ?? table).after(p);
    helpId = p.id;
    cleanups.push(() => p.remove());
    return helpId;
  };

  interface Snapshot {
    order: string[];
    widths: Record<string, number>;
    hidden: string[];
  }
  const snapshot = (): Snapshot => ({
    order: [...state.order],
    widths: { ...state.widths },
    hidden: [...state.hidden],
  });

  const dirOf = (): 1 | -1 => (win?.getComputedStyle(table).direction === 'rtl' ? -1 : 1);

  const setupHandle = (col: Col) => {
    const th = col.th;
    let box = th.querySelector<HTMLElement>(':scope > .eds-table-th');
    if (!box) {
      box = doc.createElement('div');
      box.className = 'eds-table-th';
      box.append(...Array.from(th.childNodes));
      th.append(box);
    }
    let handle = box.querySelector<HTMLButtonElement>('.eds-table-colhandle');
    if (!handle) {
      handle = doc.createElement('button');
      handle.type = 'button';
      handle.className = 'eds-table-colhandle';
      box.append(handle);
    }
    handle.setAttribute('aria-pressed', 'false');
    handle.setAttribute(
      'aria-label',
      format(getMessages().tableColumnHandleLabel, { column: labelOf(col.id) }),
    );
    describeBy(handle, helpText(), true);
    if (wantsResize() && !box.querySelector('.eds-table-resize')) {
      const edge = doc.createElement('span');
      edge.className = 'eds-table-resize';
      edge.setAttribute('aria-hidden', 'true');
      box.append(edge);
    }
    return handle;
  };

  let grabbed: { id: string; before: Snapshot; reasons: Set<Reason> } | null = null;

  const endGrab = (handle: HTMLElement | null) => {
    handle?.setAttribute('aria-pressed', 'false');
    suspended = false;
    grabbed = null;
  };

  const flushReasons = (reasons: Set<Reason>) => {
    suspended = false;
    const final: Reason = reasons.has('move') ? 'move' : 'resize';
    if (reasons.size > 0) changed(final);
    changeReasons = new Set();
  };

  const onHandleKey = (event: KeyboardEvent) => {
    const handle = (event.target as Element).closest<HTMLButtonElement>('.eds-table-colhandle');
    const th = handle?.closest('th');
    const id = th?.getAttribute('data-eds-col');
    if (!handle || !id) return;
    const m = getMessages();
    const label = labelOf(id);
    const refocus = () => handle.focus({ preventScroll: true });
    if (!grabbed) {
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        grabbed = { id, before: snapshot(), reasons: new Set() };
        suspended = true;
        handle.setAttribute('aria-pressed', 'true');
        hub.announce(format(m.tableColumnGrab, { column: label }));
      }
      return;
    }
    const session = grabbed;
    const big = event.ctrlKey || event.metaKey;
    switch (event.key) {
      case ' ':
      case 'Enter': {
        event.preventDefault();
        const reasons = new Set(changeReasons);
        endGrab(handle);
        const { pos, total } = position(id);
        hub.announce(format(m.tableColumnDrop, { column: label, pos, total }));
        changeReasons = reasons;
        flushReasons(reasons);
        return;
      }
      case 'Escape': {
        event.preventDefault();
        event.stopPropagation();
        merge(session.before);
        // Larguras de antes: o merge só troca as que existem; refaz o mapa inteiro.
        state.widths = { ...session.before.widths };
        applyAll();
        changeReasons = new Set();
        endGrab(handle);
        hub.announce(m.tableColumnCancel);
        refocus();
        return;
      }
      case 'Tab':
        merge(session.before);
        state.widths = { ...session.before.widths };
        applyAll();
        changeReasons = new Set();
        endGrab(handle);
        return;
      case 'ArrowLeft':
      case 'ArrowRight': {
        event.preventDefault();
        const dir = (event.key === 'ArrowRight' ? 1 : -1) * dirOf();
        if (event.shiftKey) {
          if (!wantsResize()) return;
          materialize();
          const w = setWidth(id, currentWidth(id) + dir * (big ? STEP_BIG : STEP));
          changeReasons.add('resize');
          hub.announce(format(m.tableColumnResized, { column: label, width: w }));
        } else {
          if (!wantsReorder() || !moveBy(id, dir as 1 | -1, true)) return;
          changeReasons.add('move');
          const { pos, total } = position(id);
          hub.announce(format(m.tableColumnMoved, { column: label, pos, total }));
        }
        refocus();
        return;
      }
      case 'Home':
      case 'End': {
        event.preventDefault();
        if (!wantsReorder()) return;
        const edge = (event.key === 'Home') === (dirOf() === 1) ? 'start' : 'end';
        if (!moveEdge(id, edge)) return;
        changeReasons.add('move');
        const { pos, total } = position(id);
        hub.announce(format(m.tableColumnMoved, { column: label, pos, total }));
        refocus();
        return;
      }
      default:
    }
  };

  const handleOnBlur = (event: FocusEvent) => {
    // Sair da alça solta (confirma o que já foi feito), como o Sortable.
    const handle = (event.target as Element).closest<HTMLElement>('.eds-table-colhandle');
    if (!handle || !grabbed) return;
    if (doc.activeElement === doc.body) return; // reordenar move o nó: o foco volta logo depois
    const reasons = new Set(changeReasons);
    endGrab(handle);
    flushReasons(reasons);
  };

  const attachHandles = () => {
    if (!wantsReorder() && !wantsResize()) return;
    for (const col of initial) setupHandle(col);
  };
  attachHandles();
  const head = headRow();
  head?.addEventListener('keydown', onHandleKey as EventListener);
  head?.addEventListener('focusout', handleOnBlur as EventListener);
  cleanups.push(() => {
    head?.removeEventListener('keydown', onHandleKey as EventListener);
    head?.removeEventListener('focusout', handleOnBlur as EventListener);
  });

  // ---- Arrastar a alça (reordenar) ----------------------------------------------------
  let engine: DragEngine | null = null;
  let drop: { id: string; side: 'before' | 'after' } | null = null;
  const clearMarks = () => {
    for (const el of table.querySelectorAll('[data-dragging]')) el.removeAttribute('data-dragging');
    for (const el of table.querySelectorAll('[data-drop-target]'))
      el.removeAttribute('data-drop-target');
    drop = null;
  };
  const columnCells = (th: HTMLTableCellElement): HTMLTableCellElement[] => {
    const index = th.cellIndex;
    return Array.from(table.rows)
      .filter((row) => row.cells.length === (headRow()?.cells.length ?? -1))
      .map((row) => row.cells[index] as HTMLTableCellElement);
  };
  if (wantsReorder() && head) {
    engine = createDragEngine(
      head as unknown as HTMLElement,
      {
        grab: (event) => {
          const handle = (event.target as Element).closest<HTMLElement>('.eds-table-colhandle');
          if (!handle || event.button > 0) return null;
          return handle.closest('th');
        },
        hold: (event) => event.pointerType === 'touch',
        start: (session) => {
          const th = session.source as HTMLTableCellElement;
          for (const cell of columnCells(th)) cell.setAttribute('data-dragging', '');
          hub.announce(
            format(getMessages().tableColumnGrab, {
              column: labelOf(th.getAttribute('data-eds-col') ?? ''),
            }),
          );
        },
        ghost: (session) => {
          const g = doc.createElement('div');
          g.className = 'eds-sortable-ghost';
          g.textContent = labelOf(
            (session.source as HTMLElement).getAttribute('data-eds-col') ?? '',
          );
          return g;
        },
        move: (session) => {
          const sourceId = (session.source as HTMLElement).getAttribute('data-eds-col') ?? '';
          for (const el of table.querySelectorAll('[data-drop-target]'))
            el.removeAttribute('data-drop-target');
          drop = null;
          for (const c of readCols()) {
            if (c.id === sourceId || group(c.id) !== group(sourceId) || isHidden(c.id)) continue;
            const rect = c.th.getBoundingClientRect();
            if (session.x < rect.left || session.x > rect.right) continue;
            const before = session.x < rect.left + rect.width / 2 === (dirOf() === 1);
            c.th.setAttribute('data-drop-target', before ? 'before' : 'after');
            drop = { id: c.id, side: before ? 'before' : 'after' };
            break;
          }
        },
        drop: (session) => {
          const id = (session.source as HTMLElement).getAttribute('data-eds-col') ?? '';
          const target = drop;
          clearMarks();
          if (!target || !moveNear(id, target.id, target.side)) return;
          const { pos, total } = position(id);
          hub.announce(format(getMessages().tableColumnDrop, { column: labelOf(id), pos, total }));
          changed('move');
        },
        cancel: () => {
          clearMarks();
          hub.announce(getMessages().tableColumnCancel);
        },
      },
      { threshold: 4 },
    );
    cleanups.push(() => engine?.destroy());
  }

  // ---- Redimensionar pela borda -------------------------------------------------------
  if (wantsResize() && head) {
    let drag: {
      id: string;
      startX: number;
      startWidth: number;
      th: HTMLElement;
      pointer: number;
    } | null = null;
    const onDown = (event: PointerEvent) => {
      const edge = (event.target as Element).closest<HTMLElement>('.eds-table-resize');
      const th = edge?.closest('th');
      const id = th?.getAttribute('data-eds-col');
      if (!edge || !th || !id || event.button > 0) return;
      event.preventDefault();
      materialize();
      drag = {
        id,
        startX: event.clientX,
        startWidth: currentWidth(id),
        th,
        pointer: event.pointerId,
      };
      th.setAttribute('data-resizing', '');
      try {
        edge.setPointerCapture(event.pointerId);
      } catch {
        /* sem captura */
      }
    };
    const onMove = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.pointer) return;
      setWidth(drag.id, drag.startWidth + (event.clientX - drag.startX) * dirOf());
    };
    const onUp = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.pointer) return;
      const { id, th } = drag;
      drag = null;
      th.removeAttribute('data-resizing');
      hub.announce(
        format(getMessages().tableColumnResized, { column: labelOf(id), width: currentWidth(id) }),
      );
      changed('resize');
    };
    const onDouble = (event: MouseEvent) => {
      const edge = (event.target as Element).closest<HTMLElement>('.eds-table-resize');
      const id = edge?.closest('th')?.getAttribute('data-eds-col');
      if (!edge || !id) return;
      setWidth(id, null);
      changed('resize');
    };
    head.addEventListener('pointerdown', onDown as EventListener);
    head.addEventListener('pointermove', onMove as EventListener);
    head.addEventListener('pointerup', onUp as EventListener);
    head.addEventListener('pointercancel', onUp as EventListener);
    head.addEventListener('dblclick', onDouble as EventListener);
    cleanups.push(() => {
      head.removeEventListener('pointerdown', onDown as EventListener);
      head.removeEventListener('pointermove', onMove as EventListener);
      head.removeEventListener('pointerup', onUp as EventListener);
      head.removeEventListener('pointercancel', onUp as EventListener);
      head.removeEventListener('dblclick', onDouble as EventListener);
    });
  }

  // Linhas inseridas depois (parciais do servidor) entram na ordem, nas ocultas e nas fixas.
  const body = table.tBodies[0];
  let observer: MutationObserver | null = null;
  if (body && typeof MutationObserver !== 'undefined') {
    observer = new MutationObserver((records) => {
      const added = records.some((r) =>
        [...r.addedNodes].some((n) => n instanceof HTMLTableRowElement),
      );
      if (added && !applying) queueMicrotask(applyAll);
    });
    observer.observe(body, { childList: true });
  }

  let users = 0;
  const retain = () => {
    users += 1;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      users -= 1;
      if (users === 0) {
        for (const stop of cleanups) stop();
        observer?.disconnect();
        pinObserver?.disconnect();
        if (saveTimer) {
          clearTimeout(saveTimer);
          writePrefs();
        }
        hub.columns = undefined;
        instances.delete(table);
        onDestroy();
      }
    };
  };
  return { api, retain };
}

/** Obtém (ou cria) o módulo de colunas da tabela; devolve a API e a liberação. */
export function acquireColumns(table: HTMLTableElement): { api: ColumnsApi; release: () => void } {
  const hub = hubFor(table);
  let instance = instances.get(table);
  if (!instance) {
    instance = createInstance(table, hub, () => undefined);
    instances.set(table, instance);
  }
  return { api: instance.api, release: instance.retain() };
}

const OPT_IN =
  '[data-eds-table-resize], [data-eds-table-reorder], [data-eds-table-prefs], [data-eds-table-columns]';

/**
 * Colunas: largura (`data-eds-table-resize`), ordem (`data-eds-table-reorder`), visibilidade,
 * colunas fixas (`th[data-eds-pin]`) e preferências (`data-eds-table-prefs`).
 */
export const tableColumnsBehavior: Behavior = {
  name: 'table-columns',
  selector: 'table.eds-table',
  bind(el) {
    const table = el as HTMLTableElement;
    const wanted =
      table.matches(OPT_IN) ||
      table.querySelector(
        'thead th[data-eds-pin], thead th.eds-table-pin-start, thead th.eds-table-pin-end',
      ) !== null;
    if (!wanted) return;
    const { release } = acquireColumns(table);
    return release;
  },
};

const chevron = (doc: Document, d: string): SVGSVGElement => {
  const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
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
  const path = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', d);
  svg.append(path);
  return svg;
};

/** `button[data-eds-columns-for="ID"]` + `[data-eds-columns-list]`: painel "Colunas". */
export const columnsPanelBehavior: Behavior = {
  name: 'table-columns-panel',
  selector: '[data-eds-columns-for]',
  bind(el) {
    const button = el;
    const doc = button.ownerDocument;
    const table = tableById(doc, button.getAttribute('data-eds-columns-for'));
    if (!table) return;
    const { api, release } = acquireColumns(table);
    const hub = hubFor(table);
    const panelId = button.getAttribute('popovertarget');
    const panel = panelId ? doc.getElementById(panelId) : null;
    const list = panel?.querySelector<HTMLElement>('[data-eds-columns-list]');
    const wasHidden = button.hidden;
    button.hidden = false;
    const stopPopover =
      !button.hasAttribute('data-eds-popover') && button.hasAttribute('popovertarget')
        ? popoverBehavior.bind(button)
        : undefined;
    const ac = new AbortController();
    const { signal } = ac;
    if (!list)
      return () => {
        stopPopover?.();
        button.hidden = wasHidden;
        release();
      };

    const render = () => {
      const m = getMessages();
      const active = doc.activeElement;
      const memo =
        active instanceof HTMLElement && list.contains(active)
          ? `${active.closest('li')?.getAttribute('data-eds-col-id') ?? ''}|${active.getAttribute('data-act') ?? 'check'}`
          : null;
      const ids = api.ids();
      const onlyOne = api.visibleCount() <= 1;
      const items = ids.map((id) => {
        const label = api.label(id);
        const li = doc.createElement('li');
        li.className = 'eds-table-columns-item';
        li.setAttribute('data-eds-col-id', id);
        const lab = doc.createElement('label');
        lab.className = 'eds-check';
        const box = doc.createElement('input');
        box.type = 'checkbox';
        box.className = 'eds-checkbox';
        box.checked = api.visible(id);
        if (box.checked && onlyOne) box.disabled = true;
        box.setAttribute('data-act', 'check');
        lab.append(box, doc.createTextNode(` ${label}`));
        li.append(lab);
        const act = (name: string, text: string, d: string) => {
          const b = doc.createElement('button');
          b.type = 'button';
          b.className = 'eds-button eds-button-ghost eds-button-icon eds-button-sm';
          b.setAttribute('aria-label', format(text, { column: label }));
          b.setAttribute('data-act', name);
          b.append(chevron(doc, d));
          li.append(b);
        };
        act('before', m.tableColumnMoveBefore, 'M15 6l-6 6 6 6');
        act('after', m.tableColumnMoveAfter, 'M9 6l6 6-6 6');
        if (api.canResize()) {
          act('narrow', m.tableColumnNarrow, 'M5 12h14');
          act('widen', m.tableColumnWiden, 'M12 5v14M5 12h14');
        }
        return li;
      });
      list.replaceChildren(...items);
      if (memo) {
        const [id, act] = memo.split('|');
        const next = Array.from(list.querySelectorAll<HTMLElement>('li')).find(
          (li) => li.getAttribute('data-eds-col-id') === id,
        );
        next?.querySelector<HTMLElement>(`[data-act="${act}"]`)?.focus();
      }
    };
    render();

    list.addEventListener(
      'click',
      (event) => {
        const target = (event.target as Element).closest<HTMLElement>('button[data-act]');
        const id = target?.closest('li')?.getAttribute('data-eds-col-id');
        if (!target || !id) return;
        const act = target.getAttribute('data-act');
        if (act === 'before') api.move(id, -1);
        else if (act === 'after') api.move(id, 1);
        else if (act === 'narrow') api.resize(id, -STEP);
        else if (act === 'widen') api.resize(id, STEP);
        render();
      },
      { signal },
    );
    list.addEventListener(
      'change',
      (event) => {
        const box = event.target;
        const id = (box as Element).closest?.('li')?.getAttribute('data-eds-col-id');
        if (!(box instanceof HTMLInputElement) || !id) return;
        if (!api.toggle(id, box.checked)) box.checked = api.visible(id);
        render();
      },
      { signal },
    );
    const off = hub.on('columns-state', render);

    return () => {
      ac.abort();
      off();
      stopPopover?.();
      button.hidden = wasHidden;
      release();
    };
  },
};

/** `[data-eds-columns-reset]`: restaura as colunas (o botão do painel ou qualquer outro). */
export const columnsResetBehavior: Behavior = {
  name: 'table-columns-reset',
  selector: '[data-eds-columns-reset]',
  bind(el) {
    const doc = el.ownerDocument;
    const resolve = (): HTMLTableElement | null => {
      const id = el.getAttribute('data-eds-columns-reset');
      if (id) return tableById(doc, id);
      const panel = el.closest('[popover]');
      const opener = panel?.id
        ? doc.querySelector(`[popovertarget="${panel.id}"][data-eds-columns-for]`)
        : null;
      return tableById(doc, opener?.getAttribute('data-eds-columns-for') ?? null);
    };
    const ac = new AbortController();
    el.addEventListener(
      'click',
      () => {
        const table = resolve();
        if (!table) return;
        const { api, release } = acquireColumns(table);
        api.reset();
        release();
      },
      { signal: ac.signal },
    );
    return () => ac.abort();
  },
};

export function initTableColumns(root: ParentNode = document): () => void {
  return bindAll(root, [tableColumnsBehavior, columnsPanelBehavior, columnsResetBehavior]);
}
