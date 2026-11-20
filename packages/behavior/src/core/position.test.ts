import { describe, expect, it } from 'vitest';
import { computePosition, type PositionOptions } from './position';

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
