import { describe, expect, it } from 'vitest';
import { baseName, buildSrcset, extensionFor, isImageFile } from './srcset';

describe('buildSrcset', () => {
  const src = (w: number, f?: string) => `/img/${w}${f ? `.${f.split('/')[1]}` : ''}`;

  it('só fallback: srcset ordenado, sem duplicadas', () => {
    const r = buildSrcset({ src, widths: [960, 480, 480, 1440] });
    expect(r.srcset).toBe('/img/480 480w, /img/960 960w, /img/1440 1440w');
    expect(r.src).toBe('/img/960');
    expect(r.sources).toEqual([]);
  });

  it('formatos: os modernos viram sources e o último é o fallback', () => {
    const r = buildSrcset({
      src,
      widths: [480, 960],
      formats: ['image/avif', 'image/webp', 'image/jpeg'],
    });
    expect(r.sources).toEqual([
      { type: 'image/avif', srcset: '/img/480.avif 480w, /img/960.avif 960w' },
      { type: 'image/webp', srcset: '/img/480.webp 480w, /img/960.webp 960w' },
    ]);
    expect(r.srcset).toBe('/img/480.jpeg 480w, /img/960.jpeg 960w');
    expect(r.src).toBe('/img/480.jpeg');
  });

  it('sem larguras válidas devolve vazio', () => {
    expect(buildSrcset({ src, widths: [0, -1] })).toEqual({ sources: [], srcset: '', src: '' });
  });
});

describe('arquivos de imagem', () => {
  it('isImageFile', () => {
    expect(isImageFile({ name: 'a.png', type: 'image/png' })).toBe(true);
    expect(isImageFile({ name: 'a.pdf', type: 'application/pdf' })).toBe(false);
    expect(isImageFile({ name: 'a.JPG', type: '' })).toBe(true);
    expect(isImageFile({ name: 'a.txt', type: '' })).toBe(false);
    expect(isImageFile({ name: 'a.gif', type: 'image/gif' }, 'image/png,.jpg')).toBe(false);
    expect(isImageFile({ name: 'a.png', type: 'image/png' }, 'image/*')).toBe(true);
  });

  it('extensão e nome base', () => {
    expect(extensionFor('image/webp')).toBe('webp');
    expect(extensionFor('image/jpeg')).toBe('jpg');
    expect(baseName('foto.final.png')).toBe('foto.final');
    expect(baseName('.png')).toBe('.png');
  });
});
