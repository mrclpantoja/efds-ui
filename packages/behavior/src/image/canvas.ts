/**
 * Operações de imagem no navegador (canvas): carregar, reduzir e cortar. Tudo local: nenhum dado
 * sai do aparelho. A conta do que cortar vem de `math.ts`; aqui só se desenha e se codifica.
 */
import { extensionFor } from './srcset';
import { rotatedSize, type Crop, type Size } from './math';

export interface LoadedImage {
  /** Fonte para `drawImage`. Pode ter menos pixels que `width x height` (redução prévia). */
  source: CanvasImageSource;
  /** Tamanho lógico da imagem (já com a orientação do EXIF aplicada). */
  width: number;
  height: number;
  /** Pixels reais de `source`. */
  sourceWidth: number;
  sourceHeight: number;
  /** Libera a memória do bitmap (quando existe). */
  close: () => void;
}

export interface LoadOptions {
  /** Teto de pixels da imagem de entrada; acima disso ela é reduzida antes (padrão 16 milhões). */
  maxPixels?: number;
  /** Para URLs de outra origem que mandam CORS. Sem isso o canvas não pode ser exportado. */
  crossOrigin?: 'anonymous' | 'use-credentials';
}

export interface EncodeOptions {
  /** Tipo de saída. Padrão `image/webp`; sem suporte do navegador, cai para `image/jpeg`. */
  format?: string;
  /** 0 a 1, para formatos com perda. Padrão 0,85. */
  quality?: number;
}

export const DEFAULT_MAX_PIXELS = 16_000_000;
export const DEFAULT_FORMAT = 'image/webp';
export const DEFAULT_QUALITY = 0.85;

const isBlob = (input: unknown): input is Blob =>
  typeof Blob !== 'undefined' && input instanceof Blob;

function fromElement(el: HTMLImageElement): LoadedImage {
  return {
    source: el,
    width: el.naturalWidth,
    height: el.naturalHeight,
    sourceWidth: el.naturalWidth,
    sourceHeight: el.naturalHeight,
    close: () => undefined,
  };
}

function loadElement(
  url: string,
  crossOrigin?: LoadOptions['crossOrigin'],
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = crossOrigin;
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Não foi possível carregar a imagem.'));
    img.src = url;
  });
}

function makeCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/** Reduz para caber em `maxPixels`, devolvendo um novo `LoadedImage` (e fechando o anterior). */
function limitPixels(image: LoadedImage, maxPixels: number): LoadedImage {
  const pixels = image.sourceWidth * image.sourceHeight;
  if (!(maxPixels > 0) || pixels <= maxPixels) return image;
  const ratio = Math.sqrt(maxPixels / pixels);
  const width = Math.max(1, Math.floor(image.sourceWidth * ratio));
  const height = Math.max(1, Math.floor(image.sourceHeight * ratio));
  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) return image;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image.source, 0, 0, width, height);
  image.close();
  return {
    source: canvas,
    width: image.width,
    height: image.height,
    sourceWidth: width,
    sourceHeight: height,
    close: () => undefined,
  };
}

/**
 * Carrega uma imagem de um arquivo/`Blob` ou de uma URL. Com `createImageBitmap` a orientação do
 * EXIF vale (`imageOrientation: 'from-image'`); sem ele, o próprio `<img>` (que já a respeita nos
 * navegadores atuais). Imagens acima de `maxPixels` são reduzidas antes de qualquer uso.
 */
export async function loadImage(
  input: Blob | string,
  options: LoadOptions = {},
): Promise<LoadedImage> {
  const maxPixels = options.maxPixels ?? DEFAULT_MAX_PIXELS;
  if (isBlob(input) && typeof createImageBitmap === 'function') {
    let bitmap: ImageBitmap | null = null;
    try {
      bitmap = await createImageBitmap(input, { imageOrientation: 'from-image' });
    } catch {
      try {
        bitmap = await createImageBitmap(input);
      } catch {
        bitmap = null;
      }
    }
    if (bitmap) {
      const bmp = bitmap;
      return limitPixels(
        {
          source: bmp,
          width: bmp.width,
          height: bmp.height,
          sourceWidth: bmp.width,
          sourceHeight: bmp.height,
          close: () => bmp.close(),
        },
        maxPixels,
      );
    }
  }
  if (isBlob(input)) {
    const url = URL.createObjectURL(input);
    try {
      return limitPixels(fromElement(await loadElement(url)), maxPixels);
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  return limitPixels(fromElement(await loadElement(input, options.crossOrigin)), maxPixels);
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Desenha e codifica. Se o navegador não sabe o formato pedido (o `toBlob` devolve outro tipo,
 * como o PNG do Safari para WebP), repete em JPEG, com fundo branco (JPEG não tem transparência).
 */
async function render(
  size: Size,
  paint: (ctx: CanvasRenderingContext2D) => void,
  format: string,
  quality: number,
): Promise<Blob> {
  const attempt = async (type: string): Promise<Blob | null> => {
    const canvas = makeCanvas(size.width, size.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    if (type === 'image/jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size.width, size.height);
    }
    ctx.imageSmoothingQuality = 'high';
    paint(ctx);
    return toBlob(canvas, type, quality);
  };
  const first = await attempt(format);
  if (first && first.type === format) return first;
  if (format !== 'image/jpeg') {
    const second = await attempt('image/jpeg');
    if (second) return second;
  }
  if (first) return first;
  throw new Error('Não foi possível gerar a imagem.');
}

async function resolveSource(
  source: LoadedImage | Blob | string,
): Promise<{ image: LoadedImage; own: boolean }> {
  if (isBlob(source) || typeof source === 'string') {
    return { image: await loadImage(source), own: true };
  }
  return { image: source, own: false };
}

/**
 * Reduz a imagem para caber em `maxWidth x maxHeight` (sem ampliar) e codifica. Sem limites,
 * só recodifica.
 */
export async function resizeImage(
  source: LoadedImage | Blob | string,
  options: EncodeOptions & { maxWidth?: number; maxHeight?: number },
): Promise<Blob> {
  const { image, own } = await resolveSource(source);
  try {
    const ratio = Math.min(
      1,
      options.maxWidth && options.maxWidth > 0 ? options.maxWidth / image.width : 1,
      options.maxHeight && options.maxHeight > 0 ? options.maxHeight / image.height : 1,
    );
    const size = {
      width: Math.max(1, Math.round(image.width * ratio)),
      height: Math.max(1, Math.round(image.height * ratio)),
    };
    return await render(
      size,
      (ctx) => ctx.drawImage(image.source, 0, 0, size.width, size.height),
      options.format ?? DEFAULT_FORMAT,
      options.quality ?? DEFAULT_QUALITY,
    );
  } finally {
    if (own) image.close();
  }
}

/**
 * Recorta `crop` (em pixels da imagem girada, ver `cropFromState`) e escreve num quadro de
 * `width x height`. Gira a imagem pela rotação do recorte antes de cortar.
 */
export async function cropImage(
  source: LoadedImage | Blob | string,
  crop: Crop,
  output: EncodeOptions & Size,
): Promise<Blob> {
  const { image, own } = await resolveSource(source);
  try {
    const rotated = rotatedSize({ width: image.width, height: image.height }, crop.rotation);
    const kx = output.width / crop.width;
    const ky = output.height / crop.height;
    const size = {
      width: Math.max(1, Math.round(output.width)),
      height: Math.max(1, Math.round(output.height)),
    };
    return await render(
      size,
      (ctx) => {
        // Coordenadas da imagem girada -> pixels de saída; depois o centro da imagem girada
        // vira a origem para girar a fonte em torno dele.
        ctx.setTransform(kx, 0, 0, ky, -crop.x * kx, -crop.y * ky);
        ctx.translate(rotated.width / 2, rotated.height / 2);
        ctx.rotate((crop.rotation * Math.PI) / 180);
        ctx.drawImage(image.source, -image.width / 2, -image.height / 2, image.width, image.height);
      },
      output.format ?? DEFAULT_FORMAT,
      output.quality ?? DEFAULT_QUALITY,
    );
  } finally {
    if (own) image.close();
  }
}

/** `File` a partir do resultado, com o nome `<base>.<ext>` do tipo realmente gerado. */
export function blobToFile(blob: Blob, baseName: string): File {
  return new File([blob], `${baseName}.${extensionFor(blob.type)}`, {
    type: blob.type,
    lastModified: Date.now(),
  });
}
