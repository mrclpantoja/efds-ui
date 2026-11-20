import { afterEach, describe, expect, it } from 'vitest';
import { applyTheme, contrastRatio, createTheme, normalizeHex } from './create-theme';

const STEPS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'] as const;

/** Cores variadas: marca azul, amarelo claro, preto, branco, cinza, vermelho puro, #RGB. */
const INPUTS = [
  '#315EFB',
  '#FFEB3B',
  '#000000',
  '#FFFFFF',
  '#777777',
  '#FF0000',
  '#0F766E',
  '#7C3AED',
  '#F97316',
  '#00FF00',
  '#123',
  '#ABC',
];

describe('createTheme', () => {
  it.each(INPUTS)('%s: todos os contrastes passam nos dois modos', (hex) => {
    const result = createTheme(hex);
    const failed = result.checks.filter((c) => !c.pass);
    expect(failed, JSON.stringify(failed)).toEqual([]);
    expect(result.checks.some((c) => c.mode === 'light')).toBe(true);
    expect(result.checks.some((c) => c.mode === 'dark')).toBe(true);
  });

  it.each(INPUTS)('%s: a escala clareia do 900 ao 50', (hex) => {
    const { scale } = createTheme(hex);
    const lum = STEPS.map((s) => contrastRatio(scale[s], '#000000'));
    for (let i = 1; i < lum.length; i += 1) {
      expect(lum[i - 1]).toBeGreaterThan(lum[i] ?? Infinity);
    }
  });

  it('gera as dez variáveis e o CSS do eixo tema', () => {
    const result = createTheme('#0F766E');
    expect(Object.keys(result.tokens)).toHaveLength(10);
    expect(result.tokens['--eds-accent-500']).toMatch(/^#[0-9A-F]{6}$/);
    expect(result.css).toContain('@layer eds.tokens');
    expect(result.css).toContain('[data-theme="custom"]');
    expect(result.css).toContain(`--eds-accent-500: ${result.scale['500']};`);
  });

  it('mantém a cor da marca no 500 quando ela já passa', () => {
    const result = createTheme('#2451E8');
    expect(contrastRatio('#FFFFFF', '#2451E8')).toBeGreaterThan(4.6);
    expect(result.adjusted).toBe(false);
    expect(contrastRatio(result.scale['500'], '#2451E8')).toBeLessThan(1.1);
  });

  it('escurece só o necessário uma cor clara demais e avisa', () => {
    const result = createTheme('#FFEB3B');
    expect(result.adjusted).toBe(true);
    expect(contrastRatio('#FFFFFF', result.scale['500'])).toBeGreaterThanOrEqual(4.5);
  });

  it('aceita nome do tema e #RGB; rejeita cor inválida', () => {
    expect(createTheme('abc', { name: 'orgao' }).css).toContain('[data-theme="orgao"]');
    expect(createTheme('#abc').input).toBe('#AABBCC');
    expect(() => createTheme('azul')).toThrow(TypeError);
    expect(normalizeHex('#12345')).toBeNull();
  });
});

describe('applyTheme', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('style');
  });

  it('põe data-theme e as variáveis no elemento e desfaz', () => {
    const el = document.documentElement;
    el.setAttribute('data-theme', 'green');
    const { result, remove } = applyTheme('#0F766E');
    expect(el.getAttribute('data-theme')).toBe('custom');
    expect(el.style.getPropertyValue('--eds-accent-500')).toBe(result.scale['500']);
    remove();
    expect(el.getAttribute('data-theme')).toBe('green');
    expect(el.style.getPropertyValue('--eds-accent-500')).toBe('');
  });
});
