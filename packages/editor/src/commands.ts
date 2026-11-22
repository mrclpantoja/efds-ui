import { liftListItem, wrapInList } from 'prosemirror-schema-list';
import type { MarkType, Node as PMNode, NodeType } from 'prosemirror-model';
import { type Command, type EditorState, TextSelection } from 'prosemirror-state';
import { isInTable } from 'prosemirror-tables';
import { basicSchema, type Align, type FontFamily } from './schema';
import { safeHref } from './url';

const paragraph = basicSchema.nodes.paragraph as NodeType;
const heading = basicSchema.nodes.heading as NodeType;
const bullet_list = basicSchema.nodes.bullet_list as NodeType;
const ordered_list = basicSchema.nodes.ordered_list as NodeType;
const list_item = basicSchema.nodes.list_item as NodeType;
const strong = basicSchema.marks.strong as MarkType;
const em = basicSchema.marks.em as MarkType;
const underline = basicSchema.marks.underline as MarkType;
const strike = basicSchema.marks.strike as MarkType;
const link = basicSchema.marks.link as MarkType;
const font = basicSchema.marks.font as MarkType;

export type BlockKind = 'paragraph' | 'h2' | 'h3' | 'h4';

// ---------------------------------------------------------------------------
// Consultas de estado (a barra usa para refletir a seleção)
// ---------------------------------------------------------------------------

/** Blocos de texto tocados pela seleção. */
function textblocksIn(state: EditorState): { node: PMNode; pos: number }[] {
  const found: { node: PMNode; pos: number }[] = [];
  const { from, to } = state.selection;
  state.doc.nodesBetween(from, to, (node, pos) => {
    if (node.isTextblock) {
      found.push({ node, pos });
      return false;
    }
    return true;
  });
  return found;
}

export function blockKindOf(node: PMNode): BlockKind {
  if (node.type === heading) return `h${node.attrs.level as 2 | 3 | 4}`;
  return 'paragraph';
}

/** Tipo de bloco da seleção: o comum a todos os blocos tocados, ou `null` se misturado. */
export function currentBlock(state: EditorState): BlockKind | null {
  const kinds = new Set(textblocksIn(state).map(({ node }) => blockKindOf(node)));
  return kinds.size === 1 ? ([...kinds][0] ?? null) : null;
}

export function currentAlign(state: EditorState): Align | null {
  const aligns = new Set(textblocksIn(state).map(({ node }) => node.attrs.align as Align));
  return aligns.size === 1 ? ([...aligns][0] ?? null) : null;
}

/** Marcas ativas no cursor (inclusive as guardadas para o próximo caractere). */
function cursorMarks(state: EditorState) {
  return state.storedMarks ?? state.selection.$from.marks();
}

/** A marca vale em todo o texto selecionado (ou no cursor, se vazia). */
export function isMarkActive(state: EditorState, type: MarkType): boolean {
  const { from, to, empty } = state.selection;
  if (empty) return !!type.isInSet(cursorMarks(state));
  let any = false;
  let all = true;
  state.doc.nodesBetween(from, to, (node) => {
    if (!node.isText) return;
    any = true;
    if (!type.isInSet(node.marks)) all = false;
  });
  return any && all;
}

/** Fonte da seleção: `'sans'`, `'serif'`, `'mono'` ou `null` se misturada. */
export function currentFont(state: EditorState): FontFamily | 'sans' | null {
  const { from, to, empty } = state.selection;
  const pick = (marks: readonly { type: MarkType; attrs: Record<string, unknown> }[]) =>
    (marks.find((m) => m.type === font)?.attrs.family as FontFamily | undefined) ?? 'sans';
  if (empty) return pick(cursorMarks(state));
  const fonts = new Set<string>();
  state.doc.nodesBetween(from, to, (node) => {
    if (node.isText) fonts.add(pick(node.marks));
  });
  return fonts.size === 1 ? ([...fonts][0] as FontFamily | 'sans') : null;
}

export type ListKind = 'bullet' | 'ordered';

/** Lista mais próxima do cursor. */
function enclosingList(state: EditorState): { kind: ListKind; pos: number; depth: number } | null {
  const { $from } = state.selection;
  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth);
    if (node.type === bullet_list || node.type === ordered_list) {
      return {
        kind: node.type === bullet_list ? 'bullet' : 'ordered',
        pos: $from.before(depth),
        depth,
      };
    }
  }
  return null;
}

export function currentList(state: EditorState): ListKind | null {
  return enclosingList(state)?.kind ?? null;
}

export interface LinkInfo {
  href: string;
  text: string;
  from: number;
  to: number;
}

/**
 * Link sob a seleção. Com cursor, o link inteiro em volta (sem contar as bordas); com texto
 * selecionado, o trecho selecionado e o endereço do primeiro link nele.
 */
export function findLink(state: EditorState): LinkInfo | null {
  const { from, to, empty, $from } = state.selection;
  if (!empty) {
    let href: string | null = null;
    state.doc.nodesBetween(from, to, (node) => {
      const mark = node.isText ? link.isInSet(node.marks) : undefined;
      if (mark && href === null) href = mark.attrs.href as string;
    });
    if (href === null) return null;
    return { href, text: state.doc.textBetween(from, to), from, to };
  }
  const parent = $from.parent;
  const base = $from.start();
  let offset = 0;
  let range: { start: number; end: number; href: string } | null = null;
  parent.forEach((child) => {
    const start = base + offset;
    const end = start + child.nodeSize;
    offset += child.nodeSize;
    const mark = child.isText ? link.isInSet(child.marks) : undefined;
    if (!mark) {
      return;
    }
    const href = mark.attrs.href as string;
    if (range && range.end === start && range.href === href) range.end = end;
    else if (!range || range.end < $from.pos) range = { start, end, href };
  });
  const found = range as { start: number; end: number; href: string } | null;
  if (!found || !(found.start < $from.pos && $from.pos < found.end)) return null;
  return {
    href: found.href,
    text: state.doc.textBetween(found.start, found.end),
    from: found.start,
    to: found.end,
  };
}

export function inTable(state: EditorState): boolean {
  return isInTable(state);
}

// ---------------------------------------------------------------------------
// Comandos
// ---------------------------------------------------------------------------

/** Troca o tipo dos blocos tocados pela seleção, mantendo o alinhamento. */
export function setBlock(kind: BlockKind): Command {
  return (state, dispatch) => {
    const tr = state.tr;
    let changed = false;
    for (const { node, pos } of textblocksIn(state)) {
      const type = kind === 'paragraph' ? paragraph : heading;
      const level = kind === 'paragraph' ? undefined : Number(kind.slice(1));
      if (!type) continue;
      const $pos = tr.doc.resolve(tr.mapping.map(pos));
      const parent = $pos.parent;
      if (!parent.canReplaceWith($pos.index(), $pos.index() + 1, type)) continue;
      const attrs = level ? { align: node.attrs.align, level } : { align: node.attrs.align };
      if (node.type === type && (!level || node.attrs.level === level)) continue;
      tr.setNodeMarkup($pos.pos, type, attrs);
      changed = true;
    }
    if (!changed) return false;
    dispatch?.(tr.scrollIntoView());
    return true;
  };
}

/** Liga/desliga uma marca: se ela vale em tudo, remove; senão aplica em tudo. */
export function toggleMarkAll(type: MarkType): Command {
  return (state, dispatch) => {
    const { from, to, empty } = state.selection;
    const active = isMarkActive(state, type);
    if (!dispatch) return true;
    if (empty) {
      const marks = cursorMarks(state);
      dispatch(
        state.tr.setStoredMarks(active ? type.removeFromSet(marks) : type.create().addToSet(marks)),
      );
      return true;
    }
    const tr = state.tr;
    // Seleção de vários blocos (Ctrl+A tem o `doc` como pai): vale se algum trecho de texto aceita a marca.
    let allowed = false;
    state.doc.nodesBetween(from, to, (node, _pos, parent) => {
      if (node.isInline && parent?.type.allowsMarkType(type)) allowed = true;
    });
    if (!allowed && !active) return false;
    if (active) tr.removeMark(from, to, type);
    else tr.addMark(from, to, type.create());
    dispatch(tr.scrollIntoView());
    return true;
  };
}

export const toggleBold = toggleMarkAll(strong);
export const toggleItalic = toggleMarkAll(em);
export const toggleUnderline = toggleMarkAll(underline);
export const toggleStrike = toggleMarkAll(strike);

/** Aplica a fonte (a "sem serifa" é a ausência de marca). */
export function setFont(family: FontFamily | 'sans'): Command {
  return (state, dispatch) => {
    if (!dispatch) return true;
    const { from, to, empty } = state.selection;
    if (empty) {
      const marks = cursorMarks(state);
      const next =
        family === 'sans' ? font.removeFromSet(marks) : font.create({ family }).addToSet(marks);
      dispatch(state.tr.setStoredMarks(next));
      return true;
    }
    const tr = state.tr;
    tr.removeMark(from, to, font);
    if (family !== 'sans') tr.addMark(from, to, font.create({ family }));
    dispatch(tr);
    return true;
  };
}

/** Alinhamento dos blocos de texto tocados pela seleção. */
export function setAlign(align: Align): Command {
  return (state, dispatch) => {
    const blocks = textblocksIn(state);
    if (blocks.length === 0) return false;
    if (dispatch) {
      const tr = state.tr;
      for (const { node, pos } of blocks) {
        if (node.attrs.align !== align) tr.setNodeMarkup(pos, undefined, { ...node.attrs, align });
      }
      dispatch(tr);
    }
    return true;
  };
}

/** Lista com marcadores ou numerada: cria, troca o tipo ou desfaz, conforme o estado. */
export function toggleList(kind: ListKind): Command {
  const type = kind === 'bullet' ? bullet_list : ordered_list;
  return (state, dispatch) => {
    const enclosing = enclosingList(state);
    if (!enclosing) return wrapInList(type)(state, dispatch);
    if (enclosing.kind === kind) return liftListItem(list_item)(state, dispatch);
    if (dispatch) dispatch(state.tr.setNodeMarkup(enclosing.pos, type));
    return true;
  };
}

/**
 * Limpar formatação: tira as marcas (exceto link), volta os blocos a parágrafo e o alinhamento
 * à esquerda. Listas e tabelas ficam.
 */
export const clearFormat: Command = (state, dispatch) => {
  if (!dispatch) return true;
  const { from, to, empty } = state.selection;
  const tr = state.tr;
  if (empty) {
    tr.setStoredMarks(cursorMarks(state).filter((mark) => mark.type === link));
  } else {
    state.doc.nodesBetween(from, to, (node, pos) => {
      if (!node.isText) return;
      for (const mark of node.marks) {
        if (mark.type !== link) {
          tr.removeMark(Math.max(from, pos), Math.min(to, pos + node.nodeSize), mark.type);
        }
      }
    });
  }
  for (const { node, pos } of textblocksIn(state)) {
    const mapped = tr.mapping.map(pos);
    const $pos = tr.doc.resolve(mapped);
    if (
      node.type === heading &&
      $pos.parent.canReplaceWith($pos.index(), $pos.index() + 1, paragraph)
    ) {
      tr.setNodeMarkup(mapped, paragraph, { align: 'left' });
    } else if (node.attrs.align !== 'left') {
      tr.setNodeMarkup(mapped, undefined, { ...node.attrs, align: 'left' });
    }
  }
  dispatch(tr);
  return true;
};

// ---------------------------------------------------------------------------
// Link
// ---------------------------------------------------------------------------

/**
 * Aplica o link. Sem texto selecionado e sem link em volta, insere `text` (ou o próprio
 * endereço) já com o link. Devolve `false` se o endereço for recusado.
 */
export function applyLink(href: string, text?: string): Command {
  return (state, dispatch) => {
    const safe = safeHref(href);
    if (safe === null) return false;
    if (!dispatch) return true;
    const existing = findLink(state);
    const { from, to, empty } = state.selection;
    const range = existing ? { from: existing.from, to: existing.to } : { from, to };
    const mark = link.create({ href: safe });
    const tr = state.tr;
    const label = text?.trim();
    const current = state.doc.textBetween(range.from, range.to);
    if (range.from === range.to && !existing) {
      const inserted = state.schema.text(label || safe, mark.addToSet(cursorMarks(state)));
      tr.replaceWith(range.from, range.to, inserted);
    } else if (label && label !== current) {
      const marks = state.doc.resolve(range.from).marksAcross(state.doc.resolve(range.to)) ?? [];
      const inserted = state.schema.text(
        label,
        mark.addToSet([...marks].filter((m) => m.type !== link)),
      );
      tr.replaceWith(range.from, range.to, inserted);
      tr.setSelection(TextSelection.create(tr.doc, range.from, range.from + label.length));
    } else {
      tr.removeMark(range.from, range.to, link);
      tr.addMark(range.from, range.to, mark);
      if (empty) tr.setSelection(TextSelection.create(tr.doc, state.selection.from));
    }
    dispatch(tr.scrollIntoView());
    return true;
  };
}

export const removeLink: Command = (state, dispatch) => {
  const existing = findLink(state);
  if (!existing) return false;
  if (dispatch) dispatch(state.tr.removeMark(existing.from, existing.to, link));
  return true;
};

// ---------------------------------------------------------------------------
// Tabela
// ---------------------------------------------------------------------------

/** Insere uma tabela (linha de cabeçalho + corpo) depois do bloco atual, com o cursor na 1ª célula. */
export function insertTable(rows = 3, cols = 3): Command {
  return (state, dispatch) => {
    if (isInTable(state)) return false;
    const { table, table_row, table_cell, table_header } = state.schema.nodes;
    if (!table || !table_row || !table_cell || !table_header) return false;
    if (!dispatch) return true;
    const makeRow = (header: boolean) =>
      table_row.create(
        null,
        Array.from({ length: cols }, () => (header ? table_header : table_cell).createAndFill()!),
      );
    const grid = table.create(
      null,
      Array.from({ length: rows }, (_, i) => makeRow(i === 0)),
    );
    const tr = state.tr;
    const { $from } = state.selection;
    const top = $from.depth >= 1 ? $from.node(1) : null;
    let at: number;
    if (top && top.isTextblock && top.content.size === 0) {
      at = $from.before(1);
      tr.replaceWith(at, $from.after(1), grid);
    } else if ($from.depth >= 1) {
      at = $from.after(1);
      tr.insert(at, grid);
    } else {
      at = $from.pos;
      tr.insert(at, grid);
    }
    if (tr.doc.lastChild === tr.doc.nodeAt(at)) {
      tr.insert(at + grid.nodeSize, paragraph.create());
    }
    tr.setSelection(TextSelection.near(tr.doc.resolve(at + 3)));
    dispatch(tr.scrollIntoView());
    return true;
  };
}

/** Lista de comandos de tabela da biblioteca, em um só lugar (importados sob demanda pela barra). */
export {
  addColumnAfter,
  addColumnBefore,
  addRowAfter,
  addRowBefore,
  deleteColumn,
  deleteRow,
  deleteTable,
  goToNextCell,
} from 'prosemirror-tables';
