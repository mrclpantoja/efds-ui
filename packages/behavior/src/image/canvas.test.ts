import { afterEach, describe, expect, it, vi } from 'vitest';
import { blobToFile, cropImage, loadImage, resizeImage } from './canvas';

type Call = [string, ...unknown[]];

interface FakeCanvas {
  width: number;
  height: number;
  calls: Call[];
  types: string[];
}

/** Canvas falso: registra o desenho e codifica no tipo pedido (ou no `forced`). */
function stubCanvas(forced?: string): FakeCanvas[] {
  const canvases: FakeCanvas[] = [];
  const original = document.createElement.bind(document);
  vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
    if (tag !== 'canvas') return original(tag);
    const calls: Call[] = [];
    const record =
      (name: string) =>
      (...args: unknown[]) =>
        calls.push([name, ...args]);
    const c = {
      width: 0,
      height: 0,
      calls,
      types: [] as string[],
      getContext: () => ({
        setTransform: record('setTransform'),
        translate: record('translate'),
        rotate: record('rotate'),
        drawImage: record('drawImage'),
        fillRect: record('fillRect'),
        imageSmoothingQuality: 'low',
        fillStyle: '',
      }),
      toBlob(cb: (b: Blob | null) => void, type: string) {
        c.types.push(type);
        cb(new Blob(['x'], { type: forced ?? type }));
      },
    };
    canvases.push(c);
    return c as unknown as HTMLCanvasElement;
  }) as typeof document.createElement);
  return canvases;
}

const fake = (width: number, height: number) => ({
  source: {} as CanvasImageSource,
  width,
  height,
  sourceWidth: width,
  sourceHeight: height,
  close: () => undefined,
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('canvas', () => {
  it('loadImage usa createImageBitmap com a orientação do EXIF', async () => {
    const create = vi.fn().mockResolvedValue({ width: 30, height: 20, close: vi.fn() });
    vi.stubGlobal('createImageBitmap', create);
    const img = await loadImage(new Blob(['x'], { type: 'image/png' }));
    expect(create).toHaveBeenCalledWith(expect.any(Blob), { imageOrientation: 'from-image' });
    expect([img.width, img.height]).toEqual([30, 20]);
  });

  it('reduz antes quando passa do teto de pixels', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockResolvedValue({ width: 4000, height: 2000, close: vi.fn() }),
    );
    const canvases = stubCanvas();
    const img = await loadImage(new Blob(['x']), { maxPixels: 2_000_000 });
    expect(canvases).toHaveLength(1);
    expect([img.width, img.height]).toEqual([4000, 2000]);
    expect(img.sourceWidth * img.sourceHeight).toBeLessThanOrEqual(2_000_000);
  });

  it('cropImage desenha o recorte no tamanho de saída, girando a fonte', async () => {
    const canvases = stubCanvas();
    const blob = await cropImage(
      fake(400, 200),
      { x: 100, y: 0, width: 200, height: 200, rotation: 90 },
      { width: 100, height: 100, format: 'image/webp' },
    );
    expect(blob.type).toBe('image/webp');
    const c = canvases[0];
    expect([c?.width, c?.height]).toEqual([100, 100]);
    expect(c?.calls.map((x) => x[0])).toEqual(['setTransform', 'translate', 'rotate', 'drawImage']);
    expect(c?.calls[0]).toEqual(['setTransform', 0.5, 0, 0, 0.5, -50, -0]);
    expect(c?.calls[1]).toEqual(['translate', 100, 200]);
    expect(c?.calls[3]).toEqual(['drawImage', expect.anything(), -200, -100, 400, 200]);
  });

  it('sem suporte ao formato cai para JPEG com fundo branco', async () => {
    const canvases = stubCanvas('image/png');
    const blob = await resizeImage(fake(400, 200), { maxWidth: 100, format: 'image/webp' });
    expect(canvases.map((c) => c.types[0])).toEqual(['image/webp', 'image/jpeg']);
    expect(canvases[1]?.calls[0]?.[0]).toBe('fillRect');
    expect([canvases[0]?.width, canvases[0]?.height]).toEqual([100, 50]);
    expect(blob).toBeInstanceOf(Blob);
  });

  it('resizeImage não amplia', async () => {
    const canvases = stubCanvas();
    await resizeImage(fake(50, 40), { maxWidth: 1000, maxHeight: 1000 });
    expect([canvases[0]?.width, canvases[0]?.height]).toEqual([50, 40]);
  });

  it('blobToFile nomeia pelo tipo gerado', () => {
    const f = blobToFile(new Blob(['x'], { type: 'image/jpeg' }), 'foto');
    expect(f.name).toBe('foto.jpg');
    expect(f.type).toBe('image/jpeg');
  });
});
