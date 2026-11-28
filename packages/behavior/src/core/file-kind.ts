/**
 * Tipo de arquivo para visualizar e listar, só pelo MIME e pelo nome (função pura, sem DOM).
 * Compartilhado com o React por `@efds-ui/behavior/internal`.
 *
 * SVG e HTML caem em `other` de propósito: podem carregar script e nunca são embutidos.
 */
export type FileKind = 'pdf' | 'image' | 'video' | 'audio' | 'text' | 'other';

const EXTENSIONS: Record<string, FileKind> = {
  pdf: 'pdf',
  jpg: 'image',
  jpeg: 'image',
  png: 'image',
  gif: 'image',
  webp: 'image',
  avif: 'image',
  bmp: 'image',
  mp4: 'video',
  webm: 'video',
  ogv: 'video',
  mov: 'video',
  mp3: 'audio',
  ogg: 'audio',
  oga: 'audio',
  wav: 'audio',
  m4a: 'audio',
  flac: 'audio',
  aac: 'audio',
  opus: 'audio',
  txt: 'text',
  md: 'text',
  csv: 'text',
  json: 'text',
  log: 'text',
  xml: 'text',
};

const TEXT_MIMES = new Set([
  'text/plain',
  'text/csv',
  'text/markdown',
  'text/xml',
  'application/xml',
  'application/json',
]);

/** Extensão em minúsculas, sem o ponto (vazia se não houver). */
export function extensionOf(name: string | undefined): string {
  if (!name) return '';
  const clean = name.split(/[?#]/)[0] ?? '';
  const dot = clean.lastIndexOf('.');
  return dot < 0 || dot === clean.length - 1 ? '' : clean.slice(dot + 1).toLowerCase();
}

function kindFromMime(mime: string): FileKind {
  if (mime === 'application/pdf' || mime === 'application/x-pdf') return 'pdf';
  if (mime.startsWith('image/')) return mime === 'image/svg+xml' ? 'other' : 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (TEXT_MIMES.has(mime)) return 'text';
  return 'other';
}

/**
 * `mime` manda quando é específico; vazio ou `application/octet-stream` entrega à extensão do
 * `name` (que pode ser uma URL). Um MIME específico que não é visualizável vale `other`, mesmo que
 * a extensão diga outra coisa (o servidor sabe melhor).
 */
export function kindOf(mime?: string | null, name?: string | null): FileKind {
  const type = (mime ?? '').split(';')[0]?.trim().toLowerCase() ?? '';
  if (type !== '' && type !== 'application/octet-stream') return kindFromMime(type);
  return EXTENSIONS[extensionOf(name ?? undefined)] ?? 'other';
}

/** "1,5 MB". Sem tamanho (ou inválido) devolve vazio. */
export function formatFileSize(bytes: number | undefined, locale = 'pt-BR'): string {
  if (bytes === undefined || !Number.isFinite(bytes) || bytes < 0) return '';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const number = new Intl.NumberFormat(locale, {
    maximumFractionDigits: unit === 0 ? 0 : 1,
  }).format(value);
  return `${number} ${units[unit] ?? 'B'}`;
}
