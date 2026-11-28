/**
 * Regras puras do Visualizador de arquivos (tipo do item, zoom, deslocamento, teclas, leitura de
 * texto), iguais no HTML (`components/viewer.ts`) e no React (`FileViewer`).
 */
import { kindOf, type FileKind } from './file-kind';

export interface ViewerTrack {
  src: string;
  kind: 'subtitles' | 'captions';
  srclang: string;
  label: string;
}

export interface ViewerItem {
  /** URL de visualização (inline). */
  src: string;
  name: string;
  /** MIME. */
  type?: string;
  /** Força o tipo; senão vem de `type` e da extensão de `name`. */
  kind?: FileKind;
  downloadUrl?: string;
  size?: number;
  poster?: string;
  tracks?: ViewerTrack[];
  /** Livre: volta nos eventos. */
  meta?: Record<string, unknown>;
}

export type ViewerPdfMode = 'auto' | 'embed' | 'link';

export interface ViewerOptions {
  /** `auto` embute o PDF só onde há leitor (não em toque nem sem `pdfViewerEnabled`). */
  pdf?: ViewerPdfMode;
  /** Milissegundos até o carregamento virar erro (padrão 20 000). */
  loadTimeout?: number;
  /** Bytes lidos de um arquivo de texto (padrão 1 MB). */
  maxTextBytes?: number;
  /** `false` esconde "Baixar" (o sistema proíbe). */
  download?: boolean;
  /** `false` esconde "Abrir em nova aba". */
  openInNewTab?: boolean;
}

export const viewerDefaults: Required<ViewerOptions> = {
  pdf: 'auto',
  loadTimeout: 20_000,
  maxTextBytes: 1_048_576,
  download: true,
  openInNewTab: true,
};

/** Junta camadas de opções (a última vence; `undefined` não apaga). */
export function resolveViewerOptions(
  ...layers: (ViewerOptions | undefined)[]
): Required<ViewerOptions> {
  const result: Record<string, unknown> = { ...viewerDefaults };
  for (const layer of layers) {
    if (!layer) continue;
    for (const key of Object.keys(layer) as (keyof ViewerOptions)[]) {
      const value = layer[key];
      if (value !== undefined) result[key] = value;
    }
  }
  return result as Required<ViewerOptions>;
}

/**
 * Tipo efetivo do item: `kind`, senão o MIME e a extensão do nome e, se o nome não ajudar (um
 * rótulo como "Fachada"), a extensão da URL.
 */
export function viewerKind(item: ViewerItem): FileKind {
  if (item.kind) return item.kind;
  const byName = kindOf(item.type, item.name);
  const generic = !item.type || item.type === 'application/octet-stream';
  return byName === 'other' && generic ? kindOf(item.type, item.src) : byName;
}

/** Ambiente para decidir se o PDF é embutido. */
export interface PdfEnv {
  coarse: boolean;
  viewerEnabled: boolean | undefined;
}

export function detectPdfEnv(): PdfEnv {
  const coarse =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches;
  const viewerEnabled =
    typeof navigator !== 'undefined' && 'pdfViewerEnabled' in navigator
      ? navigator.pdfViewerEnabled
      : undefined;
  return { coarse, viewerEnabled };
}

/** `embed` sempre embute, `link` nunca; `auto` não embute em toque nem sem leitor no navegador. */
export function canEmbedPdf(mode: ViewerPdfMode, env: PdfEnv = detectPdfEnv()): boolean {
  if (mode === 'embed') return true;
  if (mode === 'link') return false;
  return !env.coarse && env.viewerEnabled !== false;
}

// --- Zoom, giro e deslocamento da imagem (zoom 1 = ajustada ao palco) ---

export const ZOOM_STEPS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 6, 8] as const;
export const ZOOM_MIN = 0.25;
export const ZOOM_MAX = 16;
/** Passo do deslocamento por teclado, em px. */
export const PAN_STEP = 40;

export function clampZoom(zoom: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));
}

/** Próximo passo de zoom acima (`1`) ou abaixo (`-1`) do atual. */
export function stepZoom(zoom: number, direction: 1 | -1): number {
  if (direction === 1) {
    const next = ZOOM_STEPS.find((s) => s > zoom + 1e-6);
    return next ?? Math.min(ZOOM_MAX, zoom * 2);
  }
  for (let i = ZOOM_STEPS.length - 1; i >= 0; i -= 1) {
    const s = ZOOM_STEPS[i] ?? ZOOM_MIN;
    if (s < zoom - 1e-6) return s;
  }
  return ZOOM_MIN;
}

/** Zoom que mostra a imagem no tamanho real (um pixel da imagem por pixel da tela). */
export function actualSizeZoom(naturalWidth: number, displayedWidth: number): number {
  if (!(naturalWidth > 0) || !(displayedWidth > 0)) return 1;
  return clampZoom(naturalWidth / displayedWidth);
}

export function nextRotation(degrees: number): number {
  return (((degrees + 90) % 360) + 360) % 360;
}

export const isSideways = (degrees: number): boolean => degrees % 180 !== 0;

/** Mantém o deslocamento dentro do que sobra da imagem ampliada (sem sair do palco). */
export function clampPan(
  x: number,
  y: number,
  zoom: number,
  stage: { width: number; height: number },
  image: { width: number; height: number },
  degrees = 0,
): { x: number; y: number } {
  const w = isSideways(degrees) ? image.height : image.width;
  const h = isSideways(degrees) ? image.width : image.height;
  const halfX = Math.max(0, (w * zoom - stage.width) / 2);
  const halfY = Math.max(0, (h * zoom - stage.height) / 2);
  return {
    x: Math.min(halfX, Math.max(-halfX, x)),
    y: Math.min(halfY, Math.max(-halfY, y)),
  };
}

// --- Teclado ---

export type ViewerAction =
  | { type: 'go'; index: number }
  | { type: 'zoom-in' }
  | { type: 'zoom-out' }
  | { type: 'zoom-fit' }
  | { type: 'zoom-actual' }
  | { type: 'rotate' }
  | { type: 'pan'; dx: number; dy: number };

export interface ViewerKeyContext {
  key: string;
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  kind: FileKind;
  index: number;
  total: number;
  rtl: boolean;
  /** O foco está num controle que usa as teclas (vídeo, áudio, iframe, campo, texto rolável). */
  blocked: boolean;
}

const BLOCKING =
  'video, audio, iframe, input, textarea, select, [contenteditable], .eds-viewer-text';

/** O alvo do evento usa as setas e o resto por conta própria (a troca de arquivo não interfere). */
export function blocksViewerKeys(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(BLOCKING) !== null;
}

/** Ação da tecla pressionada, ou `null` se o visualizador não a usa. */
export function viewerKeyAction(c: ViewerKeyContext): ViewerAction | null {
  if (c.ctrlKey || c.metaKey || c.altKey || c.blocked) return null;
  if (c.kind === 'image') {
    switch (c.key) {
      case '+':
      case '=':
        return { type: 'zoom-in' };
      case '-':
      case '_':
        return { type: 'zoom-out' };
      case '0':
        return { type: 'zoom-fit' };
      case '1':
        return { type: 'zoom-actual' };
      case 'r':
      case 'R':
        return { type: 'rotate' };
      default:
        break;
    }
    if (c.shiftKey) {
      if (c.key === 'ArrowLeft') return { type: 'pan', dx: -PAN_STEP, dy: 0 };
      if (c.key === 'ArrowRight') return { type: 'pan', dx: PAN_STEP, dy: 0 };
      if (c.key === 'ArrowUp') return { type: 'pan', dx: 0, dy: -PAN_STEP };
      if (c.key === 'ArrowDown') return { type: 'pan', dx: 0, dy: PAN_STEP };
    }
  }
  const last = Math.max(0, c.total - 1);
  const forward = c.rtl ? 'ArrowLeft' : 'ArrowRight';
  const back = c.rtl ? 'ArrowRight' : 'ArrowLeft';
  const clamp = (i: number) => Math.min(last, Math.max(0, i));
  if (c.key === forward || c.key === 'PageDown') return { type: 'go', index: clamp(c.index + 1) };
  if (c.key === back || c.key === 'PageUp') return { type: 'go', index: clamp(c.index - 1) };
  if (c.key === 'Home') return { type: 'go', index: 0 };
  if (c.key === 'End') return { type: 'go', index: last };
  return null;
}

// --- Texto ---

export type ViewerErrorReason = 'timeout' | 'network' | 'too-large';

export class ViewerLoadError extends Error {
  readonly reason: ViewerErrorReason;
  constructor(reason: ViewerErrorReason) {
    super(reason);
    this.name = 'ViewerLoadError';
    this.reason = reason;
  }
}

/**
 * Baixa um arquivo de texto (até `maxBytes`) e devolve o conteúdo como texto: quem usa deve
 * escrevê-lo com `textContent`, nunca como HTML. Lança `ViewerLoadError` (`too-large` ou
 * `network`); um `AbortError` (da `signal`) segue como está.
 */
export async function readTextLimited(
  src: string,
  maxBytes: number,
  signal?: AbortSignal,
): Promise<string> {
  let response: Response;
  try {
    response = await fetch(src, { signal, credentials: 'same-origin' });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ViewerLoadError('network');
  }
  if (!response.ok) throw new ViewerLoadError('network');
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) throw new ViewerLoadError('too-large');
  const reader = response.body?.getReader();
  if (!reader) {
    const text = await response.text();
    if (new TextEncoder().encode(text).length > maxBytes) throw new ViewerLoadError('too-large');
    return text;
  }
  const decoder = new TextDecoder('utf-8');
  let received = 0;
  let text = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > maxBytes) {
        await reader.cancel();
        throw new ViewerLoadError('too-large');
      }
      text += decoder.decode(value, { stream: true });
    }
  } catch (error) {
    if (error instanceof ViewerLoadError || signal?.aborted) throw error;
    throw new ViewerLoadError('network');
  }
  return text + decoder.decode();
}
