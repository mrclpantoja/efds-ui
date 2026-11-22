/**
 * `srcset` e `<picture>`: monta as listas de candidatas a partir de uma função que diz a URL de
 * cada largura e formato. Não faz requisição nenhuma: o servidor (ou o CDN) do autor é quem gera
 * as versões. Também reúne os testes de arquivo de imagem (tipo e extensão).
 */

export interface SrcsetSource {
  /** Tipo MIME do formato (`image/avif`, `image/webp`), para `<source type>`. */
  type: string;
  /** `url 480w, url 960w`. */
  srcset: string;
}

export interface SrcsetOptions {
  /** URL da imagem na largura (px) e no formato pedidos. O formato é `undefined` sem `formats`. */
  src: (width: number, format?: string) => string;
  /** Larguras, em px, das versões disponíveis. */
  widths: readonly number[];
  /**
   * Formatos do mais moderno ao mais compatível. O último é o do `<img>` (fallback); os anteriores
   * viram `<source type>`. Sem a lista, só o `<img>` com `srcset`.
   */
  formats?: readonly string[];
}

export interface SrcsetResult {
  /** Um `<source type srcset>` por formato moderno, na ordem dada. */
  sources: SrcsetSource[];
  /** `srcset` do `<img>` (formato de fallback). */
  srcset: string;
  /** `src` do `<img>`: a versão do meio da lista (para quem não lê `srcset`). */
  src: string;
}

function list(options: SrcsetOptions, widths: readonly number[], format?: string): string {
  return widths.map((w) => `${options.src(w, format)} ${w}w`).join(', ');
}

export function buildSrcset(options: SrcsetOptions): SrcsetResult {
  const widths = [...new Set(options.widths.filter((w) => Number.isFinite(w) && w > 0))].sort(
    (a, b) => a - b,
  );
  if (widths.length === 0) return { sources: [], srcset: '', src: '' };
  const formats = options.formats ?? [];
  const fallback = formats.length > 0 ? formats[formats.length - 1] : undefined;
  const sources = formats
    .slice(0, -1)
    .map((type) => ({ type, srcset: list(options, widths, type) }));
  const middle = widths[Math.floor((widths.length - 1) / 2)] ?? 0;
  return {
    sources,
    srcset: list(options, widths, fallback),
    src: options.src(middle, fallback),
  };
}

const IMAGE_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'avif',
  'bmp',
  'svg',
  'heic',
  'heif',
]);

/** Confere `accept` (extensão, `tipo/*` ou MIME exato). Sem `accept` (ou vazio), tudo vale. */
export function matchesAccept(file: { name: string; type: string }, accept: string): boolean {
  const tokens = accept
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  if (tokens.length === 0) return true;
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return tokens.some((token) => {
    if (token.startsWith('.')) return name.endsWith(token);
    if (token.endsWith('/*')) return type.startsWith(token.slice(0, -1));
    return type === token;
  });
}

/**
 * É uma imagem? Vale o tipo MIME (`image/*`); alguns sistemas deixam o tipo vazio, e então vale a
 * extensão. Com `accept`, o arquivo também precisa casar com ele.
 */
export function isImageFile(file: { name: string; type: string }, accept?: string): boolean {
  const type = file.type.toLowerCase();
  const ext = file.name.toLowerCase().split('.').pop() ?? '';
  const image = type !== '' ? type.startsWith('image/') : IMAGE_EXTENSIONS.has(ext);
  if (!image) return false;
  return accept ? matchesAccept(file, accept) : true;
}

/** Extensão do arquivo para um tipo de imagem gerado (`image/webp` vira `webp`). */
export function extensionFor(type: string): string {
  switch (type.toLowerCase()) {
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/avif':
      return 'avif';
    default:
      return 'img';
  }
}

/** Nome do arquivo sem a extensão (`foto.final.png` vira `foto.final`). */
export function baseName(name: string): string {
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  return base || 'imagem';
}
