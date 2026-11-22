import {
  Schema,
  type DOMOutputSpec,
  type MarkSpec,
  type Node as PMNode,
  type NodeSpec,
} from 'prosemirror-model';
import { tableNodes } from 'prosemirror-tables';
import { safeHref } from './url';

export type Align = 'left' | 'center' | 'right' | 'justify';
export type FontFamily = 'serif' | 'mono';

const ALIGNS: readonly Align[] = ['left', 'center', 'right', 'justify'];
const ALIGN_CLASS = 'eds-prose-align-';
const FONT_CLASS = 'eds-prose-font-';

function alignClass(align: Align): Record<string, string> | null {
  return align === 'left' ? null : { class: `${ALIGN_CLASS}${align}` };
}

/** Alinhamento de um elemento: classe do efDS, `style="text-align"` ou `align=` (Word, Google Docs). */
function alignFromDom(dom: HTMLElement): Align {
  for (const align of ALIGNS) if (dom.classList.contains(`${ALIGN_CLASS}${align}`)) return align;
  const raw = (dom.style.textAlign || dom.getAttribute('align') || '').toLowerCase();
  if (raw === 'center' || raw === 'right' || raw === 'justify') return raw;
  if (raw === 'end') return 'right';
  return 'left';
}

const blockAttrs = (dom: HTMLElement) => ({ align: alignFromDom(dom) });

function headingRule(tag: string, level: number) {
  return { tag, getAttrs: (dom: HTMLElement) => ({ level, align: alignFromDom(dom) }) };
}

const nodes: Record<string, NodeSpec> = {
  doc: { content: 'block+' },
  paragraph: {
    content: 'inline*',
    group: 'block',
    attrs: { align: { default: 'left' } },
    parseDOM: [{ tag: 'p', getAttrs: (dom) => blockAttrs(dom) }],
    toDOM(node: PMNode): DOMOutputSpec {
      const attrs = alignClass(node.attrs.align as Align);
      return attrs ? ['p', attrs, 0] : ['p', 0];
    },
  },
  heading: {
    content: 'inline*',
    group: 'block',
    defining: true,
    attrs: { level: { default: 2 }, align: { default: 'left' } },
    // H1 não existe no conteúdo (o da página é do aplicativo): h1 e h2 viram título 2.
    parseDOM: [
      headingRule('h1', 2),
      headingRule('h2', 2),
      headingRule('h3', 3),
      headingRule('h4', 4),
      headingRule('h5', 4),
      headingRule('h6', 4),
    ],
    toDOM(node: PMNode): DOMOutputSpec {
      const tag = `h${node.attrs.level as number}`;
      const attrs = alignClass(node.attrs.align as Align);
      return attrs ? [tag, attrs, 0] : [tag, 0];
    },
  },
  bullet_list: {
    content: 'list_item+',
    group: 'block',
    parseDOM: [{ tag: 'ul' }],
    toDOM: () => ['ul', 0],
  },
  ordered_list: {
    content: 'list_item+',
    group: 'block',
    parseDOM: [{ tag: 'ol' }],
    toDOM: () => ['ol', 0],
  },
  list_item: {
    content: '(paragraph | heading) (paragraph | heading | bullet_list | ordered_list)*',
    defining: true,
    parseDOM: [{ tag: 'li' }],
    toDOM: () => ['li', 0],
  },
  text: { group: 'inline' },
  hard_break: {
    inline: true,
    group: 'inline',
    selectable: false,
    parseDOM: [{ tag: 'br' }],
    toDOM: () => ['br'],
  },
};

const MONO_STYLE = /\b(courier|consolas|monaco|menlo|monospace|lucida console)\b/i;

const isBold = (value: string) => /^(bold(er)?|[5-9]\d{2,})$/.test(value);

const marks: Record<string, MarkSpec> = {
  link: {
    attrs: { href: {}, target: { default: null } },
    inclusive: false,
    parseDOM: [
      {
        tag: 'a[href]',
        getAttrs(dom) {
          const href = safeHref(dom.getAttribute('href'));
          if (href === null) return false;
          return { href, target: dom.getAttribute('target') === '_blank' ? '_blank' : null };
        },
      },
    ],
    toDOM(mark): DOMOutputSpec {
      const attrs: Record<string, string> = { href: mark.attrs.href as string };
      if (mark.attrs.target === '_blank') {
        attrs.target = '_blank';
        attrs.rel = 'noopener noreferrer';
      }
      return ['a', attrs, 0];
    },
  },
  font: {
    attrs: { family: { default: 'serif' } },
    parseDOM: [
      {
        tag: 'span',
        getAttrs(dom) {
          if (dom.classList.contains(`${FONT_CLASS}serif`)) return { family: 'serif' };
          if (dom.classList.contains(`${FONT_CLASS}mono`)) return { family: 'mono' };
          return false;
        },
      },
      { tag: 'code', getAttrs: () => ({ family: 'mono' }) },
      {
        style: 'font-family',
        getAttrs: (value) => (MONO_STYLE.test(value) ? { family: 'mono' } : false),
      },
    ],
    toDOM: (mark): DOMOutputSpec => [
      'span',
      { class: `${FONT_CLASS}${mark.attrs.family as string}` },
      0,
    ],
  },
  strong: {
    parseDOM: [
      { tag: 'strong' },
      // Google Docs envolve tudo num <b style="font-weight:normal">.
      { tag: 'b', getAttrs: (dom) => dom.style.fontWeight !== 'normal' && null },
      { style: 'font-weight', getAttrs: (value) => isBold(value) && null },
    ],
    toDOM: () => ['strong', 0],
  },
  em: {
    parseDOM: [
      { tag: 'em' },
      { tag: 'i', getAttrs: (dom) => dom.style.fontStyle !== 'normal' && null },
      { style: 'font-style=italic' },
    ],
    toDOM: () => ['em', 0],
  },
  underline: {
    parseDOM: [
      { tag: 'u' },
      { style: 'text-decoration', getAttrs: (v) => /underline/.test(v) && null },
    ],
    toDOM: () => ['u', 0],
  },
  strike: {
    parseDOM: [
      { tag: 's' },
      { tag: 'strike' },
      { tag: 'del' },
      { style: 'text-decoration', getAttrs: (v) => /line-through/.test(v) && null },
    ],
    toDOM: () => ['s', 0],
  },
};

const table = tableNodes({
  tableGroup: 'block',
  cellContent: 'paragraph+',
  cellAttributes: {},
});

/** Sem mesclar células: `colspan`/`rowspan` vindos de HTML colado são ignorados. */
const plainCell = (tag: string) => [
  { tag, getAttrs: () => ({ colspan: 1, rowspan: 1, colwidth: null }) },
];
table.table_cell = { ...table.table_cell, parseDOM: plainCell('td') };
table.table_header = { ...table.table_header, parseDOM: plainCell('th') };

/** Esquema da edição Básica. */
export const basicSchema = new Schema({
  nodes: { ...nodes, ...table },
  marks,
});
