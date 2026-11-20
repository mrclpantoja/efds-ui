/**
 * Tema por cor da organização (white-label): `createTheme('#0F766E')` gera a escala de acento
 * `--eds-accent-50..900` do eixo `data-theme` a partir de uma cor, em OKLCH, com contraste AA
 * garantido nos tokens de ação nos dois modos. Os componentes não mudam: só o eixo tema.
 *
 * Os valores de cinza (texto sobre a ação, superfícies) são os do core, usados só para medir o
 * contraste; a função não lê o CSS da página.
 */

type Vec3 = readonly [number, number, number];

export type ThemeStep =
  '50' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';

export interface ContrastCheck {
  /** Identificador estável (ex.: `light-action-text`). */
  id: string;
  /** O que foi medido, em português. */
  label: string;
  mode: 'light' | 'dark';
  foreground: string;
  background: string;
  ratio: number;
  /** Mínimo exigido (4.5 para texto, 3 para componente gráfico). */
  min: number;
  pass: boolean;
}

export interface ThemeResult {
  /** Valor do `data-theme` (padrão `custom`). */
  name: string;
  /** Cor informada, normalizada (`#RRGGBB`). */
  input: string;
  /** Escala `--eds-accent-*` por degrau. */
  scale: Record<ThemeStep, string>;
  /** As mesmas variáveis, por nome de token. */
  tokens: Record<string, string>;
  /** CSS pronto: `@layer eds.tokens { [data-theme="custom"] { ... } }`. */
  css: string;
  /** Contrastes medidos nos dois modos. */
  checks: ContrastCheck[];
  /** `true` quando a cor informada precisou mudar de luminosidade para passar. */
  adjusted: boolean;
}

export interface ThemeOptions {
  /** Valor de `data-theme`. Padrão: `custom`. */
  name?: string;
}

// ---- Valores do core usados só na medição ------------------------------------------------------

const WHITE = '#FFFFFF';
const GRAY_100 = '#F1F3F5'; // bg-subtle (claro)
const GRAY_800 = '#1E293B'; // bg-subtle (escuro)
const GRAY_900 = '#0F172A'; // bg-surface (escuro)
const GRAY_950 = '#080D19'; // text-on-action e bg-page (escuro)

const AA_TEXT = 4.5;
/** Margem sobre 4.5 para o arredondamento do hexadecimal não derrubar o resultado. */
const TARGET = 4.6;

const STEPS: readonly ThemeStep[] = [
  '50',
  '100',
  '200',
  '300',
  '400',
  '500',
  '600',
  '700',
  '800',
  '900',
];

/** Fração do croma da cor de entrada em cada degrau (extremos mais neutros). */
const CHROMA: Record<ThemeStep, number> = {
  '50': 0.15,
  '100': 0.3,
  '200': 0.5,
  '300': 0.72,
  '400': 0.9,
  '500': 1,
  '600': 1,
  '700': 0.95,
  '800': 0.85,
  '900': 0.7,
};

// ---- Cor ---------------------------------------------------------------------------------------

/** Normaliza `#RGB`, `#RRGGBB` (com ou sem `#`) para `#RRGGBB` maiúsculo; `null` se inválido. */
export function normalizeHex(input: string): string | null {
  const raw = input.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    return `#${raw
      .split('')
      .map((c) => c + c)
      .join('')
      .toUpperCase()}`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw.toUpperCase()}`;
  return null;
}

function hexToRgb(hex: string): Vec3 {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]: Vec3): string {
  const part = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`.toUpperCase();
}

const toLinear = (v: number): number => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const fromLinear = (v: number): number => {
  const c = v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;
  return c * 255;
};

/** Luminância relativa (WCAG). */
function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(toLinear) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Razão de contraste (WCAG) entre duas cores `#RRGGBB`. */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

interface Oklch {
  l: number;
  c: number;
  h: number;
}

function hexToOklch(hex: string): Oklch {
  const [r, g, b] = hexToRgb(hex).map(toLinear) as [number, number, number];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const c = Math.hypot(a, bb);
  const h = c < 1e-4 ? 0 : ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360;
  return { l: L, c, h };
}

/** Linear sRGB de um OKLCH (pode sair de 0..1: fora da gama). */
function oklchToLinear({ l, c, h }: Oklch): Vec3 {
  const rad = (h * Math.PI) / 180;
  const a = c * Math.cos(rad);
  const b = c * Math.sin(rad);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
}

const inGamut = (v: Vec3): boolean => v.every((x) => x >= -0.0005 && x <= 1.0005);

/** OKLCH para `#RRGGBB`; fora da gama sRGB, reduz o croma (mantém luminosidade e matiz). */
function oklchToHex(color: Oklch): string {
  let lin = oklchToLinear(color);
  if (!inGamut(lin)) {
    let lo = 0;
    let hi = color.c;
    for (let i = 0; i < 24; i += 1) {
      const mid = (lo + hi) / 2;
      if (inGamut(oklchToLinear({ ...color, c: mid }))) lo = mid;
      else hi = mid;
    }
    lin = oklchToLinear({ ...color, c: lo });
  }
  const [r, g, b] = lin.map((v) => fromLinear(Math.max(0, Math.min(1, v)))) as [
    number,
    number,
    number,
  ];
  return rgbToHex([r, g, b]);
}

/** Mistura em sRGB (como `color-mix(in srgb, ...)`): `amount` de `top` sobre `base`. */
function mixSrgb(top: string, base: string, amount: number): string {
  const t = hexToRgb(top);
  const b = hexToRgb(base);
  return rgbToHex([
    t[0] * amount + b[0] * (1 - amount),
    t[1] * amount + b[1] * (1 - amount),
    t[2] * amount + b[2] * (1 - amount),
  ]);
}

// ---- Escala ------------------------------------------------------------------------------------

function buildScale(base: Oklch): { scale: Record<ThemeStep, string>; adjusted: boolean } {
  const at = (step: ThemeStep, l: number): string =>
    oklchToHex({ l, c: base.c * CHROMA[step], h: base.h });

  // 500: a cor da marca, escurecida só o necessário (texto branco, fundo claro e fundo subtle).
  const start = Math.max(0.3, Math.min(0.66, base.l));
  let l500 = start;
  let c500 = at('500', l500);
  let c50 = at('50', 0.975);
  const passes500 = (hex: string): boolean =>
    contrastRatio(WHITE, hex) >= TARGET &&
    contrastRatio(GRAY_100, hex) >= TARGET &&
    contrastRatio(c50, hex) >= TARGET;
  while (!passes500(c500) && l500 > 0.2) {
    l500 -= 0.005;
    c500 = at('500', l500);
  }
  const adjusted = Math.abs(l500 - base.l) > 0.012;

  // Degraus escuros: sempre mais escuros que o anterior, em passos de ao menos 0.02.
  const ls: Partial<Record<ThemeStep, number>> = { '500': l500 };
  let prev = l500;
  const dark: [ThemeStep, number, number][] = [
    ['600', 0.055, 0.3],
    ['700', 0.11, 0.25],
    ['800', 0.165, 0.2],
    ['900', 0.22, 0.16],
  ];
  for (const [step, delta, floor] of dark) {
    const l = Math.max(0.06, Math.min(prev - 0.02, Math.max(floor, l500 - delta)));
    ls[step] = l;
    prev = l;
  }

  // 400 (ação no modo escuro): texto escuro por cima e texto de acento sobre a superfície escura.
  const passes400 = (hex: string): boolean => {
    const subtle = mixSrgb(hex, GRAY_900, 0.12);
    return (
      contrastRatio(GRAY_950, hex) >= TARGET &&
      contrastRatio(GRAY_900, hex) >= TARGET &&
      contrastRatio(GRAY_800, hex) >= TARGET &&
      contrastRatio(subtle, hex) >= TARGET
    );
  };
  let l400 = Math.max(0.72, l500 + 0.08);
  let c400 = at('400', l400);
  while (!passes400(c400) && l400 < 0.97) {
    l400 += 0.005;
    c400 = at('400', l400);
  }
  ls['400'] = l400;
  // Degraus claros: sempre mais claros que o anterior.
  ls['300'] = Math.min(0.94, Math.max(0.82, l400 + 0.06));
  ls['200'] = Math.min(0.96, Math.max(0.89, ls['300'] + 0.05));
  ls['100'] = Math.min(0.975, Math.max(0.945, ls['200'] + 0.02));
  ls['50'] = Math.min(0.99, Math.max(0.975, ls['100'] + 0.01));

  const scale = {} as Record<ThemeStep, string>;
  for (const step of STEPS) scale[step] = at(step, ls[step] ?? l500);
  // O 500 e o 50 já medidos: o 50 final precisa continuar passando com o 500.
  scale['500'] = c500;
  c50 = scale['50'];
  return { scale, adjusted };
}

function measure(scale: Record<ThemeStep, string>): ContrastCheck[] {
  const check = (
    id: string,
    label: string,
    mode: 'light' | 'dark',
    foreground: string,
    background: string,
    min: number,
  ): ContrastCheck => {
    const ratio = Math.round(contrastRatio(foreground, background) * 100) / 100;
    return { id, label, mode, foreground, background, ratio, min, pass: ratio >= min };
  };
  return [
    check(
      'light-action-text',
      'Texto branco sobre a ação (500)',
      'light',
      WHITE,
      scale['500'],
      AA_TEXT,
    ),
    check(
      'light-action-hover',
      'Texto branco sobre a ação em hover (600)',
      'light',
      WHITE,
      scale['600'],
      AA_TEXT,
    ),
    check(
      'light-action-active',
      'Texto branco sobre a ação pressionada (700)',
      'light',
      WHITE,
      scale['700'],
      AA_TEXT,
    ),
    check(
      'light-link-surface',
      'Ação (500) como texto sobre a superfície branca',
      'light',
      scale['500'],
      WHITE,
      AA_TEXT,
    ),
    check(
      'light-link-subtle',
      'Ação (500) como texto sobre o fundo sutil (cinza 100)',
      'light',
      scale['500'],
      GRAY_100,
      AA_TEXT,
    ),
    check(
      'light-link-tint',
      'Ação (500) como texto sobre o realce da ação (50)',
      'light',
      scale['500'],
      scale['50'],
      AA_TEXT,
    ),
    check(
      'light-focus',
      'Anel de foco (500) sobre a superfície branca',
      'light',
      scale['500'],
      WHITE,
      3,
    ),
    check(
      'dark-action-text',
      'Texto escuro sobre a ação (400)',
      'dark',
      GRAY_950,
      scale['400'],
      AA_TEXT,
    ),
    check(
      'dark-action-hover',
      'Texto escuro sobre a ação em hover (300)',
      'dark',
      GRAY_950,
      scale['300'],
      AA_TEXT,
    ),
    check(
      'dark-action-active',
      'Texto escuro sobre a ação pressionada (200)',
      'dark',
      GRAY_950,
      scale['200'],
      AA_TEXT,
    ),
    check(
      'dark-link-surface',
      'Ação (400) como texto sobre a superfície escura',
      'dark',
      scale['400'],
      GRAY_900,
      AA_TEXT,
    ),
    check(
      'dark-link-subtle',
      'Ação (400) como texto sobre o fundo sutil escuro (cinza 800)',
      'dark',
      scale['400'],
      GRAY_800,
      AA_TEXT,
    ),
    check(
      'dark-link-tint',
      'Ação (400) como texto sobre o realce da ação (12% sobre a superfície)',
      'dark',
      scale['400'],
      mixSrgb(scale['400'], GRAY_900, 0.12),
      AA_TEXT,
    ),
    check(
      'dark-focus',
      'Anel de foco (400) sobre a página escura',
      'dark',
      scale['400'],
      GRAY_950,
      3,
    ),
  ];
}

/**
 * Gera o tema por cor. Lança `TypeError` se `hex` não for `#RGB` ou `#RRGGBB`. A cor entra
 * como 500 quando já passa no contraste; senão fica mais escura, só o necessário (`adjusted`).
 */
export function createTheme(hex: string, options: ThemeOptions = {}): ThemeResult {
  const input = normalizeHex(hex);
  if (!input) throw new TypeError(`Cor inválida: "${hex}". Use #RGB ou #RRGGBB.`);
  const name = options.name ?? 'custom';
  const { scale, adjusted } = buildScale(hexToOklch(input));
  const tokens: Record<string, string> = {};
  for (const step of STEPS) tokens[`--eds-accent-${step}`] = scale[step];
  const body = STEPS.map((step) => `    --eds-accent-${step}: ${scale[step]};`).join('\n');
  const css = `/* Gerado por createTheme(${input}) */\n@layer eds.tokens {\n  [data-theme="${name}"] {\n${body}\n  }\n}\n`;
  return { name, input, scale, tokens, css, checks: measure(scale), adjusted };
}

/**
 * Aplica o tema num elemento (padrão `<html>`): `data-theme` e as variáveis `--eds-accent-*`
 * em `style` (valem sobre qualquer folha, sem `<style>`, compatível com CSP). Devolve o
 * resultado e `remove()`, que desfaz tudo e volta ao `data-theme` anterior. O `data-mode` do
 * elemento continua valendo; numa subárvore, declare `data-mode` junto.
 */
export function applyTheme(
  hex: string,
  element: HTMLElement = document.documentElement,
  options: ThemeOptions = {},
): { result: ThemeResult; remove: () => void } {
  const result = createTheme(hex, options);
  const previous = element.getAttribute('data-theme');
  element.setAttribute('data-theme', result.name);
  for (const [token, value] of Object.entries(result.tokens)) {
    element.style.setProperty(token, value);
  }
  return {
    result,
    remove() {
      for (const token of Object.keys(result.tokens)) element.style.removeProperty(token);
      if (element.getAttribute('style') === '') element.removeAttribute('style');
      if (element.getAttribute('data-theme') !== result.name) return;
      if (previous === null) element.removeAttribute('data-theme');
      else element.setAttribute('data-theme', previous);
    },
  };
}
