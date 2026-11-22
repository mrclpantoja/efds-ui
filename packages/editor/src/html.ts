import { DOMParser as PMDOMParser, DOMSerializer, type Node as PMNode } from 'prosemirror-model';
import { basicSchema } from './schema';

const serializer = DOMSerializer.fromSchema(basicSchema);
const parser = PMDOMParser.fromSchema(basicSchema);

/** Documento inerte: não executa script nem carrega imagem, em nenhum navegador. */
function inertDocument(): Document {
  return document.implementation.createHTMLDocument('');
}

function parseBody(html: string): HTMLElement {
  return new window.DOMParser().parseFromString(html, 'text/html').body;
}

/** O HTML (já limpo) como documento do esquema. */
export function htmlToDoc(html: string): PMNode {
  return parser.parse(parseBody(html));
}

function isPlainParagraph(el: Element | null): el is HTMLParagraphElement {
  return el instanceof HTMLParagraphElement && !el.hasAttribute('class');
}

function unwrap(p: Element): void {
  p.replaceWith(...Array.from(p.childNodes));
}

/**
 * Deixa o HTML mais enxuto sem mudar o significado: `<li><p>x</p></li>` vira `<li>x</li>`
 * (também com sublista depois), `<td><p>x</p></td>` vira `<td>x</td>`, e a primeira linha só
 * de `<th>` vai para `<thead>` e ganha `scope="col"`. A leitura de volta (`htmlToDoc`) reconstrói os parágrafos.
 */
function tidy(root: HTMLElement): void {
  for (const li of Array.from(root.querySelectorAll('li'))) {
    const first = li.firstElementChild;
    const rest = Array.from(li.children).slice(1);
    if (isPlainParagraph(first) && rest.every((el) => /^(UL|OL)$/.test(el.tagName))) unwrap(first);
  }
  for (const cell of Array.from(root.querySelectorAll('td, th'))) {
    const only = cell.children.length === 1 ? cell.firstElementChild : null;
    if (isPlainParagraph(only)) unwrap(only);
  }
  for (const tbody of Array.from(root.querySelectorAll('table > tbody'))) {
    const first = tbody.firstElementChild;
    if (!(first instanceof HTMLTableRowElement) || first.cells.length === 0) continue;
    const header = Array.from(first.cells).every((cell) => cell.tagName === 'TH');
    if (!header) continue;
    for (const cell of Array.from(first.cells)) cell.setAttribute('scope', 'col');
    if (tbody.children.length > 1) {
      const thead = tbody.ownerDocument.createElement('thead');
      thead.append(first);
      tbody.before(thead);
    }
  }
}

/** Um documento vazio (um parágrafo sem texto) sai como texto vazio. */
export function isDocEmpty(doc: PMNode): boolean {
  if (doc.childCount !== 1) return false;
  const first = doc.firstChild;
  return !!first && first.type.name === 'paragraph' && first.content.size === 0;
}

/** Serializa o documento no HTML da edição Básica (sem `style=`). */
export function docToHtml(doc: PMNode): string {
  if (isDocEmpty(doc)) return '';
  const holder = inertDocument().createElement('div');
  holder.append(serializer.serializeFragment(doc.content, { document: holder.ownerDocument }));
  tidy(holder);
  return holder.innerHTML;
}

/**
 * Limpa um HTML qualquer segundo o esquema: lê pelo esquema (o que ele não conhece é descartado:
 * `script`, `style`, atributos `on*`, `style=`, `javascript:`…) e serializa de volta. Use também
 * no servidor, antes de gravar: o navegador do usuário não é fronteira de confiança.
 */
export function sanitizeHtml(html: string): string {
  return docToHtml(htmlToDoc(html));
}
