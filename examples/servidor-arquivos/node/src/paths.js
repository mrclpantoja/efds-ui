// Caminhos lógicos: sempre com "/" inicial, separador "/", normalizados e sem travessia.
import { badRequest } from './errors.js';

const RESERVED_WINDOWS = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/;
// Inversão de texto (bidi) usada para disfarçar extensões.
const BIDI = /[‪-‮⁦-⁩]/;
const FORBIDDEN_CHARS = /[/\\<>:"|?*]/;

export const MAX_NAME_BYTES = 255;
export const MAX_PATH_LENGTH = 1024;
export const MAX_DEPTH = 32;

/** Valida um nome de arquivo ou pasta (um segmento). Devolve o nome em NFC. */
export function validateName(name) {
  if (typeof name !== 'string') throw badRequest('Nome inválido.');
  const n = name.normalize('NFC');
  if (
    n === '' ||
    n !== n.trim() ||
    n === '.' ||
    n === '..' ||
    n.startsWith('.') || // também protege as áreas internas .trash e .versions
    n.endsWith('.') ||
    Buffer.byteLength(n) > MAX_NAME_BYTES ||
    CONTROL.test(n) ||
    BIDI.test(n) ||
    FORBIDDEN_CHARS.test(n) ||
    RESERVED_WINDOWS.test(n)
  ) {
    throw badRequest(
      'Nome inválido. Evite barras, caracteres de controle e nomes iniciados por ponto.',
    );
  }
  return n;
}

/** Transforma o nome enviado pelo cliente num nome seguro (upload: o servidor sanea, não recusa). */
export function sanitizeName(raw) {
  let n = String(raw ?? '')
    .normalize('NFC')
    .split(/[/\\]/)
    .pop();
  n = n
    .replace(CONTROL, '')
    .replace(BIDI, '')
    .replace(/[<>:"|?*]/g, '_')
    .replace(/^[.\s]+/, '')
    .replace(/[.\s]+$/, '');
  if (RESERVED_WINDOWS.test(n)) n = `_${n}`;
  if (Buffer.byteLength(n) > MAX_NAME_BYTES) {
    const dot = n.lastIndexOf('.');
    const ext = dot > 0 && n.length - dot <= 10 ? n.slice(dot) : '';
    let base = n.slice(0, n.length - ext.length);
    while (Buffer.byteLength(base + ext) > MAX_NAME_BYTES) base = base.slice(0, -1);
    n = base + ext;
  }
  return n || 'arquivo';
}

/** Normaliza o caminho recebido da API. Recusa "..", "\\", controle e nomes reservados. */
export function normalizePath(input) {
  if (typeof input !== 'string' || input === '' || !input.startsWith('/')) {
    throw badRequest('Caminho inválido: deve começar com "/".');
  }
  if (input.length > MAX_PATH_LENGTH || input.includes('\\') || CONTROL.test(input)) {
    throw badRequest('Caminho inválido.');
  }
  const segments = [];
  for (const raw of input.normalize('NFC').split('/')) {
    if (raw === '' || raw === '.') continue;
    segments.push(validateName(raw)); // ".." cai aqui (começa com ponto)
  }
  if (segments.length > MAX_DEPTH) throw badRequest('Caminho profundo demais.');
  return '/' + segments.join('/');
}

export const joinPath = (parent, name) => (parent === '/' ? `/${name}` : `${parent}/${name}`);
export const baseName = (path) => path.slice(path.lastIndexOf('/') + 1);
export function parentOf(path) {
  const i = path.lastIndexOf('/');
  return i <= 0 ? '/' : path.slice(0, i);
}
/** `path` é `folder` ou está dentro dele. */
export const isInside = (path, folder) =>
  folder === '/' || path === folder || path.startsWith(folder + '/');

/** Divide "relatório.final.pdf" em ["relatório.final", ".pdf"]. */
export function splitExt(name) {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, ''];
}

export function extOf(name) {
  return splitExt(name)[1].slice(1).toLowerCase();
}
