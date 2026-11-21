import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Verifica a saída de `pnpm build`: cada CSS-fonte tem seu arquivo isolado em dist,
// começando pela declaração de ordem das camadas.
const ROOT = resolve(import.meta.dirname, '..', 'packages');
const LAYER_ORDER = '@layer eds.reset,eds.tokens,eds.base,eds.layout,eds.components,eds.utilities;';

const cssNames = (dir: string): string[] =>
  existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => f.endsWith('.css'))
        .map((f) => f.slice(0, -4))
        .sort()
    : [];

const normalize = (css: string): string => css.replace(/\s+/g, '');

const expectedFiles = (pkg: 'core' | 'themes'): string[] => {
  const src = resolve(ROOT, pkg, 'src');
  if (pkg === 'themes') {
    return ['index', ...cssNames(resolve(src, 'tokens'))].map((n) => `${n}.css`);
  }
  return [
    'index.css',
    'tokens.css',
    'base.css',
    ...cssNames(resolve(src, 'layout')).map((n) => `layout/${n}.css`),
    ...cssNames(resolve(src, 'components')).map((n) => `components/${n}.css`),
  ];
};

describe.each(['core', 'themes'] as const)('dist de @efds-ui/%s', (pkg) => {
  const dist = resolve(ROOT, pkg, 'dist');
  const files = expectedFiles(pkg);

  it.each(files)('%s existe, não está vazio e começa com a ordem de @layer', (file) => {
    const path = resolve(dist, file);
    expect(existsSync(path), `${path} ausente: rode pnpm build`).toBe(true);
    const css = readFileSync(path, 'utf8');
    expect(css.length).toBeGreaterThan(LAYER_ORDER.length);
    expect(normalize(css).startsWith(normalize(LAYER_ORDER))).toBe(true);
  });
});
