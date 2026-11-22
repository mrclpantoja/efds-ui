import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { pointer, stubRect } from '../test-utils/pointer';
import { createCropperController, type CropperController } from './cropper-controller';

const html = `
<div class="eds-cropper" id="c">
  <div class="eds-cropper-stage" tabindex="0">
    <img class="eds-cropper-image" alt="" />
    <div class="eds-cropper-frame"></div>
  </div>
  <div class="eds-cropper-controls">
    <button type="button" data-eds-cropper-action="zoom-out">-</button>
    <input type="range" class="eds-cropper-zoom" aria-label="Zoom" />
    <button type="button" data-eds-cropper-action="zoom-in">+</button>
    <button type="button" data-eds-cropper-action="rotate">r</button>
    <button type="button" data-eds-cropper-action="reset">0</button>
  </div>
</div>`;

const stage = () => document.querySelector('.eds-cropper-stage') as HTMLElement;
const range = () => document.querySelector('.eds-cropper-zoom') as HTMLInputElement;
const action = (name: string) =>
  document.querySelector(`[data-eds-cropper-action="${name}"]`) as HTMLButtonElement;
const key = (k: string, init: KeyboardEventInit = {}) =>
  stage().dispatchEvent(
    new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init }),
  );
const prop = (name: string) => stage().style.getPropertyValue(name);

describe('createCropperController', () => {
  let c: CropperController;
  const announce = vi.fn();
  const onChange = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = html;
    // palco 200x200, quadro 100x100 no centro; imagem 400x200 (contida: escala CSS 0.5)
    stubRect(stage(), { left: 0, top: 0, width: 200, height: 200 });
    stubRect(document.querySelector('.eds-cropper-frame') as Element, {
      left: 50,
      top: 50,
      width: 100,
      height: 100,
    });
    c = createCropperController({
      root: document.getElementById('c') as HTMLElement,
      aspect: 1,
      announce,
      onChange,
      texts: {
        zoom: (p) => `Zoom ${p}%`,
        rotated: (d) => `Girada ${d}`,
        restored: () => 'Restaurado.',
      },
    });
    c.setImage({ width: 400, height: 200 });
  });
  afterEach(() => {
    c.destroy();
    vi.useRealTimers();
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('enquadra a imagem cobrindo o quadro e escreve só custom properties', () => {
    expect(c.getState()).toEqual({ x: 0, y: 0, scale: 0.5, rotation: 0 });
    expect(prop('--_cropper-x')).toBe('0px');
    expect(prop('--_cropper-rotate')).toBe('0deg');
    expect(prop('--_cropper-aspect')).toBe('1');
    // contida no palco: 200/400 = 0.5; cobertura 0.5 => escala CSS 1
    expect(prop('--_cropper-scale')).toBe('1');
    expect(range().value).toBe('100');
    expect(c.getCrop()).toMatchObject({ x: 100, y: 0, width: 200, height: 200 });
  });

  it('arrasta com ponteiro, limitado pela borda, com data-dragging', () => {
    pointer(stage(), 'pointerdown', 100, 100);
    expect(stage()).toHaveAttribute('data-dragging');
    pointer(stage(), 'pointermove', 130, 100);
    expect(c.getState().x).toBe(30);
    pointer(stage(), 'pointermove', 300, 100);
    expect(c.getState().x).toBe(50);
    pointer(stage(), 'pointerup', 300, 100);
    expect(stage()).not.toHaveAttribute('data-dragging');
    expect(prop('--_cropper-x')).toBe('50px');
  });

  it('roda do mouse amplia e anuncia depois de uma pausa', () => {
    const wheel = new WheelEvent('wheel', {
      deltaY: -200,
      clientX: 100,
      clientY: 100,
      bubbles: true,
      cancelable: true,
    });
    stage().dispatchEvent(wheel);
    expect(wheel.defaultPrevented).toBe(true);
    expect(c.getState().scale).toBeGreaterThan(0.5);
    expect(announce).not.toHaveBeenCalled();
    vi.advanceTimersByTime(500);
    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce.mock.calls[0]?.[0]).toMatch(/^Zoom \d+%$/);
  });

  it('pinça com dois ponteiros amplia', () => {
    pointer(stage(), 'pointerdown', 80, 100, { pointerId: 1 });
    pointer(stage(), 'pointerdown', 120, 100, { pointerId: 2 });
    pointer(stage(), 'pointermove', 60, 100, { pointerId: 1 });
    pointer(stage(), 'pointermove', 140, 100, { pointerId: 2 });
    expect(c.getState().scale).toBeGreaterThan(0.5);
  });

  it('teclado: setas, + e -, R e 0', () => {
    key('+');
    key('+');
    const zoomed = c.getState().scale;
    expect(zoomed).toBeGreaterThan(0.5);
    key('ArrowRight');
    expect(c.getState().x).toBe(8);
    key('ArrowLeft', { shiftKey: true });
    expect(c.getState().x).toBe(-32);
    key('-');
    expect(c.getState().scale).toBeLessThan(zoomed);
    key('r');
    expect(c.getState().rotation).toBe(90);
    expect(prop('--_cropper-rotate')).toBe('90deg');
    expect(announce).toHaveBeenCalledWith('Girada 90');
    key('0');
    expect(c.getState()).toEqual({ x: 0, y: 0, scale: 0.5, rotation: 0 });
    expect(announce).toHaveBeenLastCalledWith('Restaurado.');
  });

  it('com Ctrl a tecla não é capturada', () => {
    const e = new KeyboardEvent('keydown', {
      key: 'r',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    stage().dispatchEvent(e);
    expect(e.defaultPrevented).toBe(false);
    expect(c.getState().rotation).toBe(0);
  });

  it('botões e zoom deslizante', () => {
    action('zoom-in').click();
    const a = c.getState().scale;
    expect(a).toBeGreaterThan(0.5);
    action('zoom-out').click();
    expect(c.getState().scale).toBeLessThan(a);
    action('rotate').click();
    expect(c.getState().rotation).toBe(90);
    action('reset').click();
    expect(c.getState().rotation).toBe(0);
    range().value = '300';
    range().dispatchEvent(new Event('input', { bubbles: true }));
    expect(c.getState().scale).toBeCloseTo(1.5);
    expect(range().getAttribute('aria-valuetext')).toBe('300%');
  });

  it('botões de mover (alternativa ao arraste) usam o passo das setas', () => {
    document
      .querySelector('.eds-cropper-controls')
      ?.insertAdjacentHTML(
        'beforeend',
        '<div class="eds-cropper-pan"><button type="button" data-eds-cropper-action="pan-right">d</button><button type="button" data-eds-cropper-action="pan-left">e</button></div>',
      );
    action('pan-right').click();
    expect(c.getState().x).toBe(8);
    action('pan-left').click();
    action('pan-left').click();
    expect(c.getState().x).toBe(-8);
  });

  it('setState vem de fora sem chamar onChange e é limitado', () => {
    onChange.mockClear();
    c.setState({ x: 999, y: 0, scale: 1, rotation: 0 });
    expect(onChange).not.toHaveBeenCalled();
    expect(c.getState().x).toBe(150);
  });

  it('destroy remove os ouvintes', () => {
    c.destroy();
    key('+');
    expect(c.getState().scale).toBe(0.5);
  });
});
