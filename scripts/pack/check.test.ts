import { describe, expect, it } from 'vitest';
import {
  checkIife,
  checkTarball,
  formatSize,
  manifestTargets,
  matchTarget,
  unresolvedDeps,
  type PackManifest,
} from './check.ts';

const cssManifest: PackManifest = {
  version: '0.1.0',
  style: './dist/index.css',
  exports: {
    './index.css': './dist/index.css',
    './components/*.css': './dist/components/*.css',
  },
};
const cssFiles = ['package.json', 'README.md', 'dist/index.css', 'dist/components/button.css'];

describe('manifestTargets', () => {
  it('reúne exports aninhados, main e types, sem repetir', () => {
    const targets = manifestTargets({
      main: './dist/index.js',
      types: './dist/index.d.ts',
      exports: { '.': { types: './dist/index.d.ts', default: './dist/index.js' } },
    });
    expect(targets).toEqual(['./dist/index.d.ts', './dist/index.js']);
  });
});

describe('matchTarget', () => {
  it('casa arquivo exato e padrões com *', () => {
    expect(matchTarget('./dist/index.css', cssFiles)).toBe(1);
    expect(matchTarget('./dist/components/*.css', cssFiles)).toBe(1);
    expect(matchTarget('./dist/layout/*.css', cssFiles)).toBe(0);
    expect(matchTarget('./dist/ausente.css', cssFiles)).toBe(0);
  });
  it('trata "." do padrão literalmente', () => {
    expect(matchTarget('./dist/*.css', ['dist/xcss'])).toBe(0);
  });
});

describe('unresolvedDeps', () => {
  it('acusa workspace: e ignora versões resolvidas', () => {
    expect(
      unresolvedDeps({
        dependencies: { '@eds-ui/core': 'workspace:*' },
        peerDependencies: { react: '^18.0.0' },
      }),
    ).toEqual(['dependencies.@eds-ui/core=workspace:*']);
    expect(unresolvedDeps({ dependencies: { '@eds-ui/core': '0.1.0' } })).toEqual([]);
  });
});

describe('checkTarball', () => {
  it('aceita um tarball correto', () => {
    expect(checkTarball(cssManifest, cssFiles, '0.1.0')).toEqual([]);
  });
  it('acusa alvo inexistente, versão errada e condição development', () => {
    const problems = checkTarball(
      {
        ...cssManifest,
        exports: { './x.css': { development: './src/x.css', default: './dist/x.css' } },
      },
      cssFiles,
      '0.2.0',
    );
    expect(problems).toContain('versão 0.1.0 (esperada 0.2.0)');
    expect(problems).toContain('alvo inexistente no tarball: ./dist/x.css');
    expect(problems.some((p) => p.includes('"development"'))).toBe(true);
  });
  it('acusa lixo e arquivos fora de dist/', () => {
    const problems = checkTarball(cssManifest, [
      ...cssFiles,
      'src/index.css',
      'dist/Button.test.js',
      'dist/test-utils/render.js',
      'tsconfig.tsbuildinfo',
      'vite.config.ts',
    ]);
    expect(problems).toEqual(
      expect.arrayContaining([
        'fora de dist/: src/index.css',
        'lixo (arquivo de teste): dist/Button.test.js',
        'lixo (test-utils): dist/test-utils/render.js',
        'lixo (.tsbuildinfo): tsconfig.tsbuildinfo',
        'lixo (config do Vite/Vitest): vite.config.ts',
      ]),
    );
  });
  it('exige README, package.json e dist/', () => {
    expect(checkTarball({ version: '0.1.0' }, [])).toEqual(
      expect.arrayContaining(['falta package.json', 'falta README.md', 'falta dist/']),
    );
  });
  it('acusa workspace: no manifest empacotado', () => {
    const problems = checkTarball({ ...cssManifest, dependencies: { a: 'workspace:*' } }, cssFiles);
    expect(problems).toContain('dependência não resolvida: dependencies.a=workspace:*');
  });
});

describe('arquivos obrigatórios e IIFE', () => {
  it('acusa arquivo obrigatório ausente', () => {
    const problems = checkTarball(cssManifest, cssFiles, '0.1.0', ['dist/eds-behavior.js']);
    expect(problems).toContain('falta dist/eds-behavior.js');
    expect(checkTarball(cssManifest, cssFiles, '0.1.0', ['dist/index.css'])).toEqual([]);
  });
  it('aceita script clássico com a global EDS e o auto-init', () => {
    const source = 'var EDS=(function(e){return e})({});s.hasAttribute(`data-eds-manual`);';
    expect(checkIife(source)).toEqual([]);
  });
  it('rejeita módulo ES, ausência da global e do auto-init', () => {
    expect(checkIife('var EDS=1;data-eds-manual;export{a as b};')).toContain(
      'IIFE contém import/export de módulo',
    );
    expect(checkIife('import{a}from"x";var EDS=1;data-eds-manual')).toContain(
      'IIFE contém import/export de módulo',
    );
    expect(checkIife('(function(){})();data-eds-manual')).toContain(
      'IIFE não declara a global EDS',
    );
    expect(checkIife('var EDS=1;')).toContain('IIFE sem o auto-init (data-eds-manual)');
  });
});

describe('formatSize', () => {
  it('formata bytes e kB', () => {
    expect(formatSize(512)).toBe('512 B');
    expect(formatSize(2048)).toBe('2.0 kB');
  });
});
