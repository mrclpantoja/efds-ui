import { redo, redoDepth, undo, undoDepth } from 'prosemirror-history';
import type { Command, EditorState } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import {
  addColumnAfter,
  addColumnBefore,
  addRowAfter,
  addRowBefore,
  clearFormat,
  currentAlign,
  currentBlock,
  currentFont,
  currentList,
  deleteColumn,
  deleteRow,
  deleteTable,
  findLink,
  inTable,
  insertTable,
  isMarkActive,
  setAlign,
  setBlock,
  setFont,
  toggleBold,
  toggleItalic,
  toggleList,
  toggleStrike,
  toggleUnderline,
  type BlockKind,
} from './commands';
import { createIcon, type IconName } from './icons';
import type { EditorTexts } from './messages';
import { basicSchema, type Align } from './schema';

export interface ToolbarContext {
  view: EditorView;
  messages: EditorTexts;
  /** `id` do conteúdo (aria-controls da barra). */
  contentId: string;
  announce: (text: string) => void;
  openLinkDialog: () => void;
}

export interface Toolbar {
  el: HTMLElement;
  /** Reflete a seleção/estado do editor na barra. */
  update: (state: EditorState) => void;
  /** Desabilita (ou reabilita) todos os controles. */
  setDisabled: (disabled: boolean) => void;
  /** Foco no controle ativo (parada de Tab). */
  focusActive: () => void;
  destroy: () => void;
}

interface Control {
  el: HTMLButtonElement | HTMLSelectElement;
  /** `false` deixa o controle sem efeito (aria-disabled, ainda focável). */
  available?: (state: EditorState) => boolean;
  /** Estado `aria-pressed` (botões de alternar). */
  pressed?: (state: EditorState) => boolean;
  /** Valor do select. */
  value?: (state: EditorState) => string;
}

let uid = 0;

const SHORTCUT = {
  undo: 'Control+Z',
  redo: 'Control+Y',
  bold: 'Control+B',
  italic: 'Control+I',
  underline: 'Control+U',
  strike: 'Control+Shift+X',
  link: 'Control+K',
  orderedList: 'Control+Shift+7',
  bulletList: 'Control+Shift+8',
} as const;

export function createToolbar(ctx: ToolbarContext): Toolbar {
  const { view, messages: t } = ctx;
  const doc = view.dom.ownerDocument;
  const prefix = `eds-editor-${++uid}`;
  const controls: Control[] = [];
  let disabled = false;
  let pointerOnSelect = false;

  const el = doc.createElement('div');
  el.className = 'eds-editor-toolbar';
  el.setAttribute('role', 'toolbar');
  el.setAttribute('aria-label', t.toolbarLabel);
  el.setAttribute('aria-controls', ctx.contentId);

  const run = (command: Command): boolean => {
    const ok = command(view.state, view.dispatch);
    return ok;
  };

  const group = (label: string): HTMLElement => {
    const g = doc.createElement('div');
    g.className = 'eds-editor-group';
    g.setAttribute('role', 'group');
    g.setAttribute('aria-label', label);
    el.append(g);
    return g;
  };

  const separator = () => {
    const s = doc.createElement('span');
    s.className = 'eds-editor-separator';
    s.setAttribute('aria-hidden', 'true');
    el.append(s);
  };

  interface ButtonSpec {
    icon: IconName;
    label: string;
    shortcut?: string;
    command: Command;
    available?: (state: EditorState) => boolean;
    pressed?: (state: EditorState) => boolean;
    announce?: (state: EditorState) => string;
  }

  const button = (parent: HTMLElement, spec: ButtonSpec): HTMLButtonElement => {
    const b = doc.createElement('button');
    b.type = 'button';
    b.className = 'eds-editor-button';
    b.setAttribute('aria-label', spec.label);
    b.title = spec.label;
    if (spec.shortcut) b.setAttribute('aria-keyshortcuts', spec.shortcut);
    if (spec.pressed) b.setAttribute('aria-pressed', 'false');
    b.append(createIcon(spec.icon));
    b.addEventListener('click', () => {
      if (disabled || b.getAttribute('aria-disabled') === 'true') return;
      run(spec.command);
    });
    parent.append(b);
    controls.push({ el: b, available: spec.available, pressed: spec.pressed });
    return b;
  };

  const select = (
    label: string,
    options: [value: string, text: string][],
    value: (state: EditorState) => string,
    apply: (value: string) => void,
  ): HTMLSelectElement => {
    const s = doc.createElement('select');
    s.className = 'eds-editor-select';
    s.setAttribute('aria-label', label);
    for (const [v, text] of options) {
      const o = doc.createElement('option');
      o.value = v;
      o.textContent = text;
      s.append(o);
    }
    s.addEventListener('pointerdown', () => {
      pointerOnSelect = true;
    });
    s.addEventListener('change', () => {
      apply(s.value);
      // Com o mouse, o foco volta ao texto; com o teclado, fica no select (Esc volta ao conteúdo).
      if (pointerOnSelect) view.focus();
      pointerOnSelect = false;
    });
    el.append(s);
    controls.push({ el: s, value });
    return s;
  };

  // --- Desfazer / Refazer
  const history = group(t.groupHistory);
  button(history, {
    icon: 'undo',
    label: t.undo,
    shortcut: SHORTCUT.undo,
    command: undo,
    available: (s) => undoDepth(s) > 0,
  });
  button(history, {
    icon: 'redo',
    label: t.redo,
    shortcut: SHORTCUT.redo,
    command: redo,
    available: (s) => redoDepth(s) > 0,
  });
  separator();

  // --- Bloco e fonte
  select(
    t.blockStyle,
    [
      ['paragraph', t.paragraph],
      ['h2', t.heading2],
      ['h3', t.heading3],
      ['h4', t.heading4],
    ],
    (s) => currentBlock(s) ?? '',
    (v) => run(setBlock(v as BlockKind)),
  );
  select(
    t.font,
    [
      ['sans', t.fontSans],
      ['serif', t.fontSerif],
      ['mono', t.fontMono],
    ],
    (s) => currentFont(s) ?? '',
    (v) => run(setFont(v as 'sans' | 'serif' | 'mono')),
  );
  separator();

  // --- Estilo do texto
  const text = group(t.groupText);
  const { strong, em, underline, strike } = basicSchema.marks;
  button(text, {
    icon: 'bold',
    label: t.bold,
    shortcut: SHORTCUT.bold,
    command: toggleBold,
    pressed: (s) => isMarkActive(s, strong!),
  });
  button(text, {
    icon: 'italic',
    label: t.italic,
    shortcut: SHORTCUT.italic,
    command: toggleItalic,
    pressed: (s) => isMarkActive(s, em!),
  });
  button(text, {
    icon: 'underline',
    label: t.underline,
    shortcut: SHORTCUT.underline,
    command: toggleUnderline,
    pressed: (s) => isMarkActive(s, underline!),
  });
  button(text, {
    icon: 'strike',
    label: t.strike,
    shortcut: SHORTCUT.strike,
    command: toggleStrike,
    pressed: (s) => isMarkActive(s, strike!),
  });
  separator();

  // --- Alinhamento
  const align = group(t.groupAlign);
  const alignments: [Align, IconName, string][] = [
    ['left', 'alignLeft', t.alignLeft],
    ['center', 'alignCenter', t.alignCenter],
    ['right', 'alignRight', t.alignRight],
    ['justify', 'alignJustify', t.alignJustify],
  ];
  for (const [value, icon, label] of alignments) {
    button(align, {
      icon,
      label,
      command: setAlign(value),
      pressed: (s) => currentAlign(s) === value,
    });
  }
  separator();

  // --- Listas
  const lists = group(t.groupLists);
  button(lists, {
    icon: 'bulletList',
    label: t.bulletList,
    shortcut: SHORTCUT.bulletList,
    command: toggleList('bullet'),
    pressed: (s) => currentList(s) === 'bullet',
  });
  button(lists, {
    icon: 'orderedList',
    label: t.orderedList,
    shortcut: SHORTCUT.orderedList,
    command: toggleList('ordered'),
    pressed: (s) => currentList(s) === 'ordered',
  });
  separator();

  // --- Inserir: link, tabela, limpar formatação
  const insert = group(t.groupInsert);
  button(insert, {
    icon: 'link',
    label: t.link,
    shortcut: SHORTCUT.link,
    command: () => {
      ctx.openLinkDialog();
      return true;
    },
    pressed: (s) => findLink(s) !== null,
  });

  // Menu da tabela: disclosure (popover + popovertarget), como o Dropdown do core.
  const menuId = `${prefix}-table-menu`;
  const triggerId = `${prefix}-table`;
  const supportsPopover = typeof HTMLElement.prototype.showPopover === 'function';
  const trigger = doc.createElement('button');
  trigger.type = 'button';
  trigger.id = triggerId;
  trigger.className = 'eds-editor-button';
  trigger.setAttribute('aria-haspopup', 'true');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', menuId);
  trigger.append(createIcon('table'));
  const triggerLabel = doc.createElement('span');
  triggerLabel.textContent = t.table;
  trigger.append(triggerLabel);
  insert.append(trigger);
  controls.push({ el: trigger });

  const menu = doc.createElement('div');
  menu.id = menuId;
  menu.className = 'eds-dropdown';
  menu.setAttribute('role', 'group');
  menu.setAttribute('aria-labelledby', triggerId);
  if (supportsPopover) {
    menu.setAttribute('popover', 'auto');
    trigger.setAttribute('popovertarget', menuId);
  } else {
    menu.hidden = true;
  }
  insert.append(menu);

  const items: { el: HTMLButtonElement; available: (s: EditorState) => boolean }[] = [];
  const addItem = (
    label: string,
    command: Command,
    done: string,
    available: (s: EditorState) => boolean,
    danger = false,
  ) => {
    const item = doc.createElement('button');
    item.type = 'button';
    item.className = danger ? 'eds-dropdown-item eds-dropdown-item-danger' : 'eds-dropdown-item';
    item.textContent = label;
    item.addEventListener('click', () => {
      if (item.getAttribute('aria-disabled') === 'true') return;
      closeMenu(false);
      if (run(command)) ctx.announce(done);
      view.focus();
    });
    menu.append(item);
    items.push({ el: item, available });
  };
  const sep = () => {
    const hr = doc.createElement('hr');
    hr.className = 'eds-dropdown-separator';
    menu.append(hr);
  };
  const outside = (s: EditorState) => !inTable(s);
  const inside = (s: EditorState) => inTable(s);
  addItem(t.tableInsert, insertTable(3, 3), t.tableInserted, outside);
  sep();
  addItem(t.tableRowBefore, addRowBefore, t.rowInserted, inside);
  addItem(t.tableRowAfter, addRowAfter, t.rowInserted, inside);
  addItem(t.tableColBefore, addColumnBefore, t.colInserted, inside);
  addItem(t.tableColAfter, addColumnAfter, t.colInserted, inside);
  sep();
  addItem(t.tableDeleteRow, deleteRow, t.rowDeleted, inside);
  addItem(t.tableDeleteCol, deleteColumn, t.colDeleted, inside);
  addItem(t.tableDelete, deleteTable, t.tableDeleted, inside, true);

  const isMenuOpen = () => (supportsPopover ? menu.matches(':popover-open') : !menu.hidden);
  const focusFirstItem = () =>
    items.find((i) => i.el.getAttribute('aria-disabled') !== 'true')?.el.focus();
  function closeMenu(refocus: boolean): void {
    if (supportsPopover) {
      if (menu.matches(':popover-open')) menu.hidePopover();
    } else {
      menu.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
    }
    if (refocus) trigger.focus();
  }
  function openMenu(): void {
    syncMenu(view.state);
    if (supportsPopover) {
      if (!menu.matches(':popover-open')) menu.showPopover();
    } else {
      menu.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      focusFirstItem();
    }
  }
  const onMenuToggle = (event: Event) => {
    const open = (event as ToggleEvent).newState === 'open';
    trigger.setAttribute('aria-expanded', String(open));
    if (open) {
      syncMenu(view.state);
      focusFirstItem();
    }
  };
  menu.addEventListener('toggle', onMenuToggle);
  if (!supportsPopover) {
    trigger.addEventListener('click', () => (isMenuOpen() ? closeMenu(false) : openMenu()));
  }
  trigger.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' && !disabled) {
      event.preventDefault();
      if (isMenuOpen()) focusFirstItem();
      // Pelo `popovertarget` (clique) o menu ganha a âncora implícita; `showPopover()` sem o
      // gatilho o deixaria solto no canto da janela.
      else if (supportsPopover) trigger.click();
      else openMenu();
    }
  });
  // Tab (ou clique) para fora do menu o fecha.
  menu.addEventListener('focusout', (event) => {
    const next = event.relatedTarget as Node | null;
    if (next && !menu.contains(next) && next !== trigger) closeMenu(false);
  });
  menu.addEventListener('keydown', (event) => {
    const enabled = items
      .map((i) => i.el)
      .filter((b) => b.getAttribute('aria-disabled') !== 'true');
    const index = enabled.indexOf(doc.activeElement as HTMLButtonElement);
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      enabled[(index + 1) % enabled.length]?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      enabled[(index - 1 + enabled.length) % enabled.length]?.focus();
    } else if (event.key === 'Home') {
      event.preventDefault();
      enabled[0]?.focus();
    } else if (event.key === 'End') {
      event.preventDefault();
      enabled[enabled.length - 1]?.focus();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeMenu(true);
    }
  });

  button(insert, { icon: 'clearFormat', label: t.clearFormat, command: clearFormat });
  // O anúncio de "formatação removida" é feito aqui, onde o botão é conhecido.
  controls[controls.length - 1]?.el.addEventListener('click', () => ctx.announce(t.formatCleared));

  function syncMenu(state: EditorState): void {
    for (const item of items) {
      const available = item.available(state);
      if (available) item.el.removeAttribute('aria-disabled');
      else item.el.setAttribute('aria-disabled', 'true');
    }
  }

  // --- Tabindex móvel (APG Toolbar): uma parada de Tab
  let active = 0;
  const focusable = () => controls.filter((c) => !c.el.disabled);
  const syncTabindex = () => {
    const list = focusable();
    const current = list[active] ?? list[0];
    for (const c of controls) c.el.tabIndex = c === current ? 0 : -1;
  };
  const moveTo = (index: number) => {
    const list = focusable();
    if (list.length === 0) return;
    active = (index + list.length) % list.length;
    syncTabindex();
    list[active]?.el.focus();
  };
  el.addEventListener('focusin', (event) => {
    const index = focusable().findIndex((c) => c.el === event.target);
    if (index >= 0 && index !== active) {
      active = index;
      syncTabindex();
    }
  });
  el.addEventListener('keydown', (event) => {
    if (event.target instanceof Node && menu.contains(event.target)) return;
    const index = focusable().findIndex((c) => c.el === event.target);
    if (index < 0) return;
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        moveTo(index + 1);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        moveTo(index - 1);
        break;
      case 'Home':
        event.preventDefault();
        moveTo(0);
        break;
      case 'End':
        event.preventDefault();
        moveTo(focusable().length - 1);
        break;
      case 'Escape':
        event.preventDefault();
        view.focus();
        break;
      default:
    }
  });
  // O botão não rouba o foco do texto no clique do mouse (a seleção continua visível).
  el.addEventListener('mousedown', (event) => {
    const target = event.target as Element;
    if (target.closest('select') || target.closest('.eds-dropdown')) return;
    if (target.closest('button')) event.preventDefault();
  });

  const update = (state: EditorState): void => {
    for (const c of controls) {
      if (c.el instanceof HTMLSelectElement) {
        if (c.value) c.el.value = c.value(state);
        continue;
      }
      if (c.available) {
        if (c.available(state)) c.el.removeAttribute('aria-disabled');
        else c.el.setAttribute('aria-disabled', 'true');
      }
      if (c.pressed) c.el.setAttribute('aria-pressed', String(c.pressed(state)));
    }
    if (isMenuOpen()) syncMenu(state);
  };

  const setDisabled = (value: boolean): void => {
    disabled = value;
    for (const c of controls) c.el.disabled = value;
    if (value) closeMenu(false);
    syncTabindex();
  };

  syncTabindex();
  update(view.state);

  return {
    el,
    update,
    setDisabled,
    focusActive() {
      const list = focusable();
      (list[active] ?? list[0])?.el.focus();
    },
    destroy() {
      menu.removeEventListener('toggle', onMenuToggle);
    },
  };
}
