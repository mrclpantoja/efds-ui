// Tipos de arquivo: MIME por extensão, verificação por conteúdo (assinaturas) e regra de "inline" seguro.
import { extOf } from './paths.js';
import { FilesError } from './errors.js';

/** ext -> [mime, assinatura esperada]. Assinaturas: ver sniff(). */
const TYPES = {
  pdf: ['application/pdf', 'pdf'],
  png: ['image/png', 'png'],
  jpg: ['image/jpeg', 'jpeg'],
  jpeg: ['image/jpeg', 'jpeg'],
  gif: ['image/gif', 'gif'],
  webp: ['image/webp', 'webp'],
  avif: ['image/avif', 'mp4'],
  bmp: ['image/bmp', 'bmp'],
  mp4: ['video/mp4', 'mp4'],
  mov: ['video/quicktime', 'mp4'],
  webm: ['video/webm', 'webm'],
  ogv: ['video/ogg', 'ogg'],
  mp3: ['audio/mpeg', 'mp3'],
  m4a: ['audio/mp4', 'mp4'],
  ogg: ['audio/ogg', 'ogg'],
  wav: ['audio/wav', 'wav'],
  flac: ['audio/flac', 'flac'],
  txt: ['text/plain', 'text'],
  md: ['text/markdown', 'text'],
  csv: ['text/csv', 'text'],
  json: ['application/json', 'text'],
  log: ['text/plain', 'text'],
  xml: ['application/xml', 'text'],
  doc: ['application/msword', 'ole'],
  xls: ['application/vnd.ms-excel', 'ole'],
  ppt: ['application/vnd.ms-powerpoint', 'ole'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'zip'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'zip'],
  pptx: ['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'zip'],
  odt: ['application/vnd.oasis.opendocument.text', 'zip'],
  ods: ['application/vnd.oasis.opendocument.spreadsheet', 'zip'],
  zip: ['application/zip', 'zip'],
  svg: ['image/svg+xml', 'text'],
  html: ['text/html', 'text'],
  htm: ['text/html', 'text'],
};

/** Extensões executáveis ou de script de servidor: nunca aceitas num gerenciador de documentos. */
const BLOCKED_EXT = new Set(
  'exe dll bat cmd com msi scr ps1 vbs sh bash php php3 php4 php5 phtml phar jsp jspx asp aspx cgi pl htaccess jar apk'.split(
    ' ',
  ),
);

/** Tipos que podem ser exibidos no navegador (inline). SVG e HTML ficam de fora de propósito. */
const INLINE = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/bmp',
  'video/mp4',
  'video/webm',
  'video/ogg',
  'audio/mpeg',
  'audio/mp4',
  'audio/ogg',
  'audio/wav',
  'audio/flac',
]);
const INLINE_AS_TEXT = new Set(['txt', 'md', 'csv', 'json', 'log', 'xml']);

export const mimeFor = (name) => TYPES[extOf(name)]?.[0] ?? 'application/octet-stream';

/** Content-Type a usar em modo inline, ou null se o tipo só pode ser baixado (attachment). */
export function inlineContentType(name) {
  if (INLINE_AS_TEXT.has(extOf(name))) return 'text/plain; charset=utf-8';
  const mime = mimeFor(name);
  return INLINE.has(mime) ? mime : null;
}

/** Descobre o tipo pelos primeiros bytes. Devolve um rótulo ou null. */
export function sniff(buf) {
  const b = buf.subarray(0, 4096);
  const ascii = (from, to) => b.subarray(from, to).toString('latin1');
  const pdfAt = b.indexOf('%PDF-', 0, 'latin1');
  if (pdfAt >= 0 && pdfAt < 1024) return 'pdf';
  if (b[0] === 0x89 && ascii(1, 4) === 'PNG') return 'png';
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
  if (ascii(0, 4) === 'GIF8') return 'gif';
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'webp';
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WAVE') return 'wav';
  if (ascii(0, 2) === 'BM') return 'bmp';
  if (ascii(0, 2) === 'PK' && b[2] === 3 && b[3] === 4) return 'zip';
  if (b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0) return 'ole';
  if (ascii(4, 8) === 'ftyp') return 'mp4';
  if (ascii(0, 4) === 'OggS') return 'ogg';
  if (ascii(0, 4) === 'fLaC') return 'flac';
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return 'webm';
  if (ascii(0, 3) === 'ID3' || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)) return 'mp3';
  if (ascii(0, 2) === 'MZ') return 'exe';
  if (b[0] === 0x7f && ascii(1, 4) === 'ELF') return 'elf';
  return null;
}

const looksLikeText = (buf) => !buf.subarray(0, 8192).includes(0);

/** Confere extensão x conteúdo. Lança type_not_allowed se não bater. */
export function assertContentMatches(name, buf) {
  const ext = extOf(name);
  const found = sniff(buf);
  if (BLOCKED_EXT.has(ext) || found === 'exe' || found === 'elf') {
    throw new FilesError('type_not_allowed', 'Este tipo de arquivo não é aceito.');
  }
  const expected = TYPES[ext]?.[1];
  if (!expected || buf.length === 0) return; // extensão desconhecida: só baixa (attachment)
  const ok = expected === 'text' ? looksLikeText(buf) && found === null : found === expected;
  if (!ok) {
    throw new FilesError('type_not_allowed', 'O conteúdo do arquivo não corresponde à extensão.');
  }
}

/** `accept`: lista de MIME ("image/*", "application/pdf") ou extensões (".pdf"). Vazia = tudo. */
export function isAccepted(name, accept) {
  if (!accept?.length) return true;
  const ext = '.' + extOf(name);
  const mime = mimeFor(name);
  return accept.some((rule) => {
    const r = rule.trim().toLowerCase();
    if (r.startsWith('.')) return r === ext;
    if (r.endsWith('/*')) return mime.startsWith(r.slice(0, -1));
    return r === mime;
  });
}

export function assertExtensionAllowed(name, accept) {
  if (BLOCKED_EXT.has(extOf(name)) || !isAccepted(name, accept)) {
    throw new FilesError('type_not_allowed', 'Este tipo de arquivo não é aceito.');
  }
}
