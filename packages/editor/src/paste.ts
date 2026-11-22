/**
 * Preparo do HTML colado, antes de o esquema ler. O esquema já descarta tudo que não conhece
 * (estilos, classes, `script`…); aqui só se recupera estrutura que o Word e similares
 * escondem: itens de lista são `<p style="mso-list:…">` e não `<li>`.
 */
import { BULLET_CHARS } from './paste-chars';

function levelOf(style: string): number {
  const match = /mso-list:[^;]*level(\d+)/i.exec(style);
  return match ? Number(match[1]) : 1;
}

/** Lista do Word: a marca ("1." ou "·") fica num `<span style="mso-list:Ignore">`. */
function isOrdered(paragraph: Element): boolean {
  const marker = Array.from(paragraph.querySelectorAll('span')).find((span) =>
    /mso-list:\s*ignore/i.test(span.getAttribute('style') ?? ''),
  );
  const text = (marker?.textContent ?? '').trim();
  if (marker) marker.remove();
  if (BULLET_CHARS.test(text) || text === '') return false;
  return /^(\d+|[a-zA-Z]|[ivxlcdm]+)[.)]$/i.test(text);
}

function convertWordLists(root: HTMLElement): void {
  const doc = root.ownerDocument;
  const items = Array.from(root.querySelectorAll('p')).filter((p) =>
    /mso-list:/i.test(p.getAttribute('style') ?? ''),
  );
  let expectedNext: Element | null = null;
  let stack: { level: number; list: Element }[] = [];
  for (const p of items) {
    // Itens consecutivos formam uma lista; qualquer outro nó entre eles recomeça.
    if (p !== expectedNext) stack = [];
    const level = levelOf(p.getAttribute('style') ?? '');
    const ordered = isOrdered(p);
    while (stack.length > 0 && (stack[stack.length - 1]?.level ?? 0) > level) stack.pop();
    let top = stack[stack.length - 1];
    if (!top || top.level < level) {
      const list = doc.createElement(ordered ? 'ol' : 'ul');
      if (top) {
        const parentItem =
          top.list.lastElementChild ?? top.list.appendChild(doc.createElement('li'));
        parentItem.appendChild(list);
      } else {
        p.before(list);
      }
      top = { level, list };
      stack.push(top);
    }
    const li = doc.createElement('li');
    li.append(...Array.from(p.childNodes));
    top.list.append(li);
    expectedNext = p.nextElementSibling;
    p.remove();
  }
}

/** HTML colado → HTML pronto para o esquema ler. */
export function prepareClipboardHtml(html: string): string {
  const parsed = new window.DOMParser().parseFromString(html, 'text/html');
  const body = parsed.body;
  // Comentários condicionais do Office e as tags `o:p` não têm conteúdo útil.
  const walker = parsed.createTreeWalker(body, NodeFilter.SHOW_COMMENT);
  const comments: Node[] = [];
  while (walker.nextNode()) comments.push(walker.currentNode);
  for (const comment of comments) comment.parentNode?.removeChild(comment);
  for (const el of Array.from(body.querySelectorAll('o\\:p, meta, link, style, script')))
    el.remove();
  convertWordLists(body);
  return body.innerHTML;
}
