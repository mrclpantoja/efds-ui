import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  computePosition,
  placeMenuFallback,
  supportsAnchorPositioning,
  type PositionOptions,
} from './position';

const base: PositionOptions = {
  anchor: { left: 400, top: 300, width: 100, height: 40 },
  size: { width: 200, height: 60 },
  viewport: { width: 1000, height: 800 },
  placement: 'top',
  gap: 8,
  align: 'center',
  rtl: false,
  margin: 4,
};

describe('computePosition', () => {
  it('top centraliza acima do gatilho com a folga', () => {
    expect(computePosition(base)).toEqual({ x: 350, y: 232, placement: 'top' });
  });

  it('bottom fica abaixo; start alinha ao início do gatilho', () => {
    expect(computePosition({ ...base, placement: 'bottom', align: 'start' })).toEqual({
      x: 400,
      y: 348,
      placement: 'bottom',
    });
  });

  it('vira para baixo quando não cabe em cima', () => {
    const r = computePosition({ ...base, anchor: { ...base.anchor, top: 20 } });
    expect(r.placement).toBe('bottom');
    expect(r.y).toBe(68);
  });

  it('não vira quando o lado oposto também não ajuda', () => {
    const r = computePosition({
      ...base,
      viewport: { width: 1000, height: 80 },
      anchor: { left: 400, top: 20, width: 100, height: 40 },
    });
    expect(r.placement).toBe('top');
  });

  it('end/start laterais e inversão em RTL', () => {
    expect(computePosition({ ...base, placement: 'end' })).toMatchObject({ x: 508, y: 290 });
    expect(computePosition({ ...base, placement: 'start' })).toMatchObject({ x: 192 });
    expect(computePosition({ ...base, placement: 'end', rtl: true })).toMatchObject({ x: 192 });
  });

  it('end vira para start no fim da tela e mantém dentro da viewport', () => {
    const r = computePosition({
      ...base,
      placement: 'end',
      anchor: { left: 900, top: 300, width: 90, height: 40 },
    });
    expect(r.placement).toBe('start');
    expect(r.x + base.size.width).toBeLessThanOrEqual(1000);
  });

  it('prende nas bordas (margem) quando o gatilho está no canto', () => {
    const r = computePosition({ ...base, anchor: { left: 0, top: 300, width: 20, height: 20 } });
    expect(r.x).toBe(4);
  });
});

describe('placeMenuFallback', () => {
  const rect = (left: number, top: number, width: number, height: number) =>
    ({
      left,
      top,
      width,
      height,
      right: left + width,
      bottom: top + height,
      x: left,
      y: top,
    }) as DOMRect;
  const setup = (trigger: DOMRect, menu: DOMRect) => {
    const t = document.createElement('button');
    const m = document.createElement('div');
    document.body.append(t, m);
    t.getBoundingClientRect = () => trigger;
    m.getBoundingClientRect = () => menu;
    return { t, m };
  };
  const size = (w: number, h: number) => {
    Object.defineProperty(window, 'innerWidth', { value: w, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: h, configurable: true });
  };

  beforeEach(() => {
    // O ambiente de teste não diz a verdade sobre CSS.supports: simula o Firefox.
    vi.stubGlobal('CSS', { supports: () => false });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('abre abaixo, alinhado ao fim do gatilho', () => {
    size(1000, 800);
    const { t, m } = setup(rect(700, 100, 24, 24), rect(0, 0, 180, 120));
    const stop = placeMenuFallback(m, t);
    expect(m.style.getPropertyValue('--_dropdown-x')).toBe('544px'); // 724 - 180
    expect(m.style.getPropertyValue('--_dropdown-y')).toBe('128px'); // 124 + 4
    expect(m).toHaveAttribute('data-placement', 'bottom');
    stop();
  });

  it('vira para cima quando falta espaço embaixo e há mais em cima', () => {
    size(1000, 400);
    const { t, m } = setup(rect(700, 340, 24, 24), rect(0, 0, 180, 150));
    placeMenuFallback(m, t)();
    expect(m.style.getPropertyValue('--_dropdown-y')).toBe('186px'); // 340 - 4 - 150
    expect(m).toHaveAttribute('data-placement', 'top');
  });

  it('encolhe o menu alto demais para o espaço livre, sem cobrir o gatilho', () => {
    size(1000, 400);
    const { t, m } = setup(rect(700, 180, 24, 24), rect(0, 0, 180, 500));
    placeMenuFallback(m, t)();
    // embaixo: 400 - 204 - 4 - 8 = 184 (maior que os 168 de cima)
    expect(m.style.maxBlockSize).toBe('184px');
    expect(m.style.getPropertyValue('--_dropdown-y')).toBe('208px');
    expect(m).toHaveAttribute('data-placement', 'bottom');
  });

  it('prende dentro da viewport e alinha ao início em RTL', () => {
    size(300, 800);
    const { t, m } = setup(rect(4, 100, 24, 24), rect(0, 0, 180, 120));
    placeMenuFallback(m, t)();
    expect(m.style.getPropertyValue('--_dropdown-x')).toBe('8px');
    document.documentElement.dir = 'rtl';
    const rtl = setup(rect(200, 100, 24, 24), rect(0, 0, 80, 40));
    placeMenuFallback(rtl.m, rtl.t)();
    document.documentElement.dir = '';
    expect(rtl.m.style.getPropertyValue('--_dropdown-x')).toBe('200px');
  });

  it('reposiciona ao rolar e para de escutar ao encerrar', () => {
    size(1000, 800);
    const { t, m } = setup(rect(700, 100, 24, 24), rect(0, 0, 180, 120));
    vi.stubGlobal('requestAnimationFrame', undefined);
    const stop = placeMenuFallback(m, t);
    t.getBoundingClientRect = () => rect(700, 200, 24, 24);
    window.dispatchEvent(new Event('scroll'));
    expect(m.style.getPropertyValue('--_dropdown-y')).toBe('228px');
    stop();
    t.getBoundingClientRect = () => rect(700, 300, 24, 24);
    window.dispatchEvent(new Event('scroll'));
    expect(m.style.getPropertyValue('--_dropdown-y')).toBe('228px');
  });

  it('não faz nada quando o navegador tem anchor positioning', () => {
    vi.stubGlobal('CSS', { supports: () => true });
    expect(supportsAnchorPositioning()).toBe(true);
    const { t, m } = setup(rect(700, 100, 24, 24), rect(0, 0, 180, 120));
    placeMenuFallback(m, t)();
    expect(m.style.getPropertyValue('--_dropdown-x')).toBe('');
  });
});
