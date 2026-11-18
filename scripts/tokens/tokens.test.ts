import { describe, expect, it } from 'vitest';
import { diffOutputs } from './check.ts';
import { compileTokens, formatIssue } from './compile.ts';
import { parseTokenFile } from './parse.ts';
import { outputPathFor, renderCss, resolveValue } from './render.ts';

const PRIMITIVES = 'packages/core/tokens/primitives/colors.json';
const SEMANTIC = 'packages/core/tokens/semantic/colors.json';
const DARK = 'packages/themes/tokens/mode-dark.json';

const json = (value: unknown): string => JSON.stringify(value, null, 2);

const fixtures = () => [
  {
    path: PRIMITIVES,
    text: json({ $selector: ':where(:root)', $description: 'Primitivos', 'gray-900': '#0F172A' }),
  },
  {
    path: SEMANTIC,
    text: json({ $selector: ':where(:root)', 'color-text': '{gray-900}' }),
  },
  {
    path: DARK,
    text: json({ $selector: '[data-mode="dark"]', 'color-text': '{gray-900}' }),
  },
];

describe('resolveValue', () => {
  it('resolve uma referência', () => {
    expect(resolveValue('{gray-900}')).toBe('var(--eds-gray-900)');
  });

  it('resolve várias referências em um valor', () => {
    expect(resolveValue('color-mix(in oklch, {accent-500} 12%, {surface-base})')).toBe(
      'color-mix(in oklch, var(--eds-accent-500) 12%, var(--eds-surface-base))',
    );
  });

  it('copia valores sem referência literalmente', () => {
    expect(resolveValue('0 1px 2px rgb(0 0 0 / 0.1)')).toBe('0 1px 2px rgb(0 0 0 / 0.1)');
  });
});

describe('parseTokenFile', () => {
  it('rejeita chave fora de kebab-case apontando arquivo e chave', () => {
    const { issues } = parseTokenFile(
      PRIMITIVES,
      json({ $selector: ':root', colorText: '#000', 'ok-1': '#fff' }),
    );
    expect(issues).toHaveLength(1);
    expect(formatIssue(issues[0]!)).toContain(`${PRIMITIVES} [colorText]`);
  });

  it('exige $selector', () => {
    const { issues, file } = parseTokenFile(PRIMITIVES, json({ 'gray-900': '#000' }));
    expect(file).toBeUndefined();
    expect(issues[0]).toMatchObject({ file: PRIMITIVES, key: '$selector' });
  });

  it('detecta chave duplicada no mesmo arquivo', () => {
    const text = '{ "$selector": ":root", "a": "1", "a": "2" }';
    const { issues } = parseTokenFile(PRIMITIVES, text);
    expect(issues[0]).toMatchObject({ key: 'a', message: expect.stringContaining('duplicada') });
  });

  it('reporta JSON inválido', () => {
    const { issues } = parseTokenFile(PRIMITIVES, '{ nope');
    expect(issues[0]?.message).toContain('JSON inválido');
  });

  it('preserva a ordem das chaves e ignora metadados', () => {
    const { file } = parseTokenFile(
      PRIMITIVES,
      json({ $selector: ':root', $description: 'd', zz: '1', aa: '2' }),
    );
    expect(file?.tokens.map(([key]) => key)).toEqual(['zz', 'aa']);
  });
});

describe('compileTokens', () => {
  it('resolve referências e gera os caminhos do contrato', () => {
    const { issues, outputs } = compileTokens(fixtures());
    expect(issues).toEqual([]);
    expect([...outputs.keys()]).toEqual([
      'packages/core/src/tokens/primitives-colors.css',
      'packages/core/src/tokens/semantic-colors.css',
      'packages/themes/src/tokens/mode-dark.css',
    ]);
    expect(outputs.get('packages/core/src/tokens/semantic-colors.css')).toContain(
      '--eds-color-text: var(--eds-gray-900);',
    );
  });

  it('falha com referência inexistente indicando arquivo e chave', () => {
    const sources = fixtures();
    sources[1] = {
      path: SEMANTIC,
      text: json({ $selector: ':where(:root)', 'color-text': '{nao-existe}' }),
    };
    const { issues, outputs } = compileTokens(sources);
    expect(outputs.size).toBe(0);
    expect(issues).toHaveLength(1);
    expect(formatIssue(issues[0]!)).toBe(
      `${SEMANTIC} [color-text]: referência {nao-existe} não existe em nenhum arquivo de tokens.`,
    );
  });

  it('aceita referência para chave definida em outra pasta', () => {
    const { issues } = compileTokens([
      { path: DARK, text: json({ $selector: '[data-mode="dark"]', x: '{gray-900}' }) },
      fixtures()[0]!,
    ]);
    expect(issues).toEqual([]);
  });

  it('detecta a mesma chave duas vezes no mesmo seletor', () => {
    const { issues } = compileTokens([
      ...fixtures(),
      {
        path: 'packages/core/tokens/semantic/extra.json',
        text: json({ $selector: ':where(:root)', 'color-text': '#000' }),
      },
    ]);
    expect(issues[0]?.message).toContain('duplicada no seletor');
  });

  it('detecta referência circular', () => {
    const { issues } = compileTokens([
      { path: PRIMITIVES, text: json({ $selector: ':root', a: '{b}', b: '{a}' }) },
    ]);
    expect(issues.some((issue) => issue.message.includes('circular'))).toBe(true);
  });

  it('não gera nada para entrada vazia', () => {
    expect(compileTokens([])).toEqual({ issues: [], outputs: new Map() });
  });
});

describe('renderCss', () => {
  it('é estável: mesma entrada, mesma saída; LF e newline final', () => {
    const first = compileTokens(fixtures()).outputs;
    const second = compileTokens(fixtures()).outputs;
    expect(second).toEqual(first);
    for (const css of first.values()) {
      expect(css.endsWith('}\n')).toBe(true);
      expect(css).not.toContain('\r');
    }
  });

  it('gera cabeçalho, layer e seletor', () => {
    const css = compileTokens(fixtures()).outputs.get(
      'packages/core/src/tokens/primitives-colors.css',
    );
    expect(css).toBe(
      [
        `/* Gerado por scripts/build-tokens.ts — não edite. Fonte: ${PRIMITIVES} */`,
        '/* Primitivos */',
        '',
        '/* prettier-ignore */',
        '@layer eds.tokens {',
        '  :where(:root) {',
        '    --eds-gray-900: #0F172A;',
        '  }',
        '}',
        '',
      ].join('\n'),
    );
  });

  it('não deixa $description fechar o comentário', () => {
    const { file } = parseTokenFile(
      PRIMITIVES,
      json({ $selector: ':root', $description: 'a */ b', x: '1' }),
    );
    expect(renderCss(file!)).not.toMatch(/\/\* a \*\/ b/);
  });
});

describe('outputPathFor', () => {
  it('mapeia core e themes e ignora outras pastas', () => {
    expect(outputPathFor('packages/core/tokens/primitives/colors.json')).toBe(
      'packages/core/src/tokens/primitives-colors.css',
    );
    expect(outputPathFor('packages/themes/tokens/mode-dark.json')).toBe(
      'packages/themes/src/tokens/mode-dark.css',
    );
    expect(outputPathFor('packages/react/tokens/x.json')).toBeNull();
  });
});

describe('diffOutputs (--check)', () => {
  const expected = compileTokens(fixtures()).outputs;

  it('não acusa nada quando o disco está em dia', () => {
    expect(diffOutputs(expected, new Map(expected))).toEqual({ stale: [], orphans: [] });
  });

  it('detecta arquivo desatualizado e ausente', () => {
    const existing = new Map(expected);
    existing.set('packages/core/src/tokens/semantic-colors.css', 'velho');
    existing.delete('packages/themes/src/tokens/mode-dark.css');
    expect(diffOutputs(expected, existing).stale).toEqual([
      'packages/core/src/tokens/semantic-colors.css',
      'packages/themes/src/tokens/mode-dark.css',
    ]);
  });

  it('detecta órfãos', () => {
    const existing = new Map(expected);
    existing.set('packages/core/src/tokens/sumiu.css', '/* Gerado por scripts/build-tokens.ts */');
    expect(diffOutputs(expected, existing).orphans).toEqual(['packages/core/src/tokens/sumiu.css']);
  });
});
