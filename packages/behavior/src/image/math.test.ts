import { describe, expect, it } from 'vitest';
import {
  clampCrop,
  clampState,
  coverScale,
  cropFromState,
  fitInside,
  initialState,
  isUpscaled,
  normalizeRotation,
  outputSize,
  panBy,
  resizeFrame,
  rotateBy,
  rotatedSize,
  setZoomPercent,
  zoomAt,
  zoomPercent,
  type CropState,
} from './math';

const image = { width: 400, height: 200 };
const frame = { width: 100, height: 100 };

describe('math do corte', () => {
  it('normaliza rotação e gira o tamanho', () => {
    expect(normalizeRotation(-90)).toBe(270);
    expect(normalizeRotation(450)).toBe(90);
    expect(rotatedSize(image, 90)).toEqual({ width: 200, height: 400 });
    expect(rotatedSize(image, 180)).toEqual(image);
  });

  it('escala de cobertura e estado inicial', () => {
    expect(coverScale(image, 0, frame)).toBe(0.5);
    expect(coverScale(image, 90, frame)).toBe(0.5);
    expect(coverScale({ width: 0, height: 0 }, 0, frame)).toBe(1);
    expect(initialState(image, frame)).toEqual({ x: 0, y: 0, scale: 0.5, rotation: 0 });
  });

  it('o deslocamento nunca deixa fresta', () => {
    const s = initialState(image, frame);
    // imagem exibida: 200 x 100; só dá para andar 50 px na horizontal
    expect(panBy(s, 999, 999, image, frame)).toMatchObject({ x: 50, y: 0 });
    expect(panBy(s, -999, 0, image, frame).x).toBe(-50);
  });

  it('zoom respeita o mínimo e o máximo e mantém o ponto parado', () => {
    const s = initialState(image, frame);
    expect(zoomAt(s, 0.01, { x: 0, y: 0 }, image, frame).scale).toBe(0.5);
    expect(zoomAt(s, 99, { x: 0, y: 0 }, image, frame).scale).toBe(2.5);
    const z = zoomAt(s, 1, { x: 25, y: 0 }, image, frame);
    // ponto da imagem sob (25,0) antes: (25-0)/0.5 = 50; depois: x + 50 * 1 deve valer 25
    expect(z.x + 50 * z.scale).toBeCloseTo(25);
    expect(zoomPercent(z, image, frame)).toBe(200);
    expect(setZoomPercent(s, 300, image, frame).scale).toBeCloseTo(1.5);
  });

  it('girar leva o deslocamento junto e re-enquadra', () => {
    const start: CropState = { x: 50, y: 0, scale: 0.5, rotation: 0 };
    const s = rotateBy(start, 90, image, frame);
    expect(s.rotation).toBe(90);
    // girada, a imagem é 200 x 400: cobertura 0.5 (altura), e o deslocamento horizontal some
    expect(s.scale).toBeGreaterThanOrEqual(0.5);
    expect(s.x).toBeCloseTo(0);
    expect(rotateBy(s, -90, image, frame).rotation).toBe(0);
    let four = start;
    for (let i = 0; i < 4; i += 1) four = rotateBy(four, 90, image, frame);
    expect(four.rotation).toBe(0);
  });

  it('o recorte é o que o quadro mostra', () => {
    const s = initialState(image, frame);
    expect(cropFromState(s, image, frame)).toEqual({
      x: 100,
      y: 0,
      width: 200,
      height: 200,
      rotation: 0,
    });
    const moved = panBy(s, 50, 0, image, frame);
    // a imagem andou 50 px para a direita: o quadro passa a ver a borda esquerda dela
    expect(cropFromState(moved, image, frame).x).toBe(0);
    const r = cropFromState(rotateBy(s, 90, image, frame), image, frame);
    expect(r).toMatchObject({ rotation: 90 });
    expect(r.width).toBeCloseTo(200);
  });

  it('clampCrop mantém o retângulo dentro da imagem girada', () => {
    expect(clampCrop({ x: -5, y: 500, width: 1000, height: 50, rotation: 0 }, image)).toEqual({
      x: 0,
      y: 150,
      width: 400,
      height: 50,
      rotation: 0,
    });
  });

  it('reenquadra quando o quadro muda de tamanho', () => {
    const s: CropState = { x: 10, y: 4, scale: 0.5, rotation: 0 };
    expect(resizeFrame(s, { width: 100, height: 100 }, { width: 200, height: 200 })).toEqual({
      x: 20,
      y: 8,
      scale: 1,
      rotation: 0,
    });
    expect(clampState(s, { width: 0, height: 0 }, frame)).toBe(s);
  });

  it('tamanho de saída, ajuste e aviso de ampliação', () => {
    expect(outputSize(1, 256)).toEqual({ width: 256, height: 256 });
    expect(outputSize(2, 200)).toEqual({ width: 200, height: 100 });
    expect(outputSize(0.5, 200)).toEqual({ width: 100, height: 200 });
    expect(outputSize(NaN, 64)).toEqual({ width: 64, height: 64 });
    expect(fitInside({ width: 4000, height: 2000 }, 1000)).toEqual({ width: 1000, height: 500 });
    expect(fitInside({ width: 100, height: 50 }, 1000, 1000)).toEqual({ width: 100, height: 50 });
    const out = { width: 256, height: 256 };
    expect(isUpscaled({ x: 0, y: 0, width: 100, height: 100, rotation: 0 }, out)).toBe(true);
    expect(isUpscaled({ x: 0, y: 0, width: 300, height: 300, rotation: 0 }, out)).toBe(false);
  });
});
