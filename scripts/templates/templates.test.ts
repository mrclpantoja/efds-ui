import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { verifyLicense } from '../../templates/license/src/core.ts';
import { generateKeyPair, publicKeyOf } from '../../templates/license/src/sign.ts';
import {
  issueLicense,
  LICENSE_VENDOR_FILE,
  licenseJsFile,
  vendorTemplate,
  VENDOR_FILES,
} from './lib.ts';
import { inlineTsconfig, parseCatalog, transformPackageJson } from './pack-lib.ts';

describe('emissão', () => {
  const pair = generateKeyPair();

  it('a chave emitida passa na verificação do navegador', () => {
    const { license, key } = issueLicense({
      product: 'painel',
      type: 'single',
      domains: ['exemplo.gov.br'],
      secretKey: pair.secretKey,
    });
    expect(publicKeyOf(pair.secretKey)).toBe(pair.publicKey);
    expect(license.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(
      verifyLicense(JSON.parse(JSON.stringify(license)), key, {
        publicKey: pair.publicKey,
        hostname: 'app.exemplo.gov.br',
      }).ok,
    ).toBe(true);
    expect(licenseJsFile(license)).toMatch(/^window\.EFDS_LICENSE = \{/);
  });

  it('single sem domínio é recusado', () => {
    expect(() =>
      issueLicense({ product: 'painel', type: 'single', secretKey: pair.secretKey }),
    ).toThrow(/domain/);
  });
});

describe('vendor', () => {
  const seed = (base: string, files: { from: string[] }[]) => {
    for (const file of files) {
      const path = join(base, ...file.from);
      mkdirSync(join(path, '..'), { recursive: true });
      writeFileSync(path, 'x');
    }
  };

  it('gratuito: copia só core, themes e behavior, sem a verificação de licença', () => {
    const base = mkdtempSync(join(tmpdir(), 'efds-vendor-'));
    try {
      expect(() => vendorTemplate('painel', base)).toThrow(/pnpm build/);
      seed(base, VENDOR_FILES);
      const copied = vendorTemplate('painel', base);
      expect(copied).toHaveLength(3);
      expect(
        existsSync(join(base, 'templates/painel/html/vendor/efds-ui/license/efds-license-gate.js')),
      ).toBe(false);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });

  it('premium (--source): inclui a verificação de licença e exige o build dela', () => {
    const base = mkdtempSync(join(tmpdir(), 'efds-vendor-'));
    try {
      seed(base, VENDOR_FILES);
      const html = join(base, 'externo', 'html');
      mkdirSync(html, { recursive: true });
      expect(() => vendorTemplate('erp', base, html)).toThrow(/efds-license-gate/);
      seed(base, [LICENSE_VENDOR_FILE]);
      expect(vendorTemplate('erp', base, html)).toHaveLength(4);
      expect(readFileSync(join(html, 'vendor/efds-ui/license/efds-license-gate.js'), 'utf8')).toBe(
        'x',
      );
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });

  it('gratuito reexecutado remove a licença que sobrou de um vendor antigo', () => {
    const base = mkdtempSync(join(tmpdir(), 'efds-vendor-'));
    try {
      seed(base, VENDOR_FILES);
      const old = join(base, 'templates/painel/html/vendor/efds-ui/license/efds-license-gate.js');
      mkdirSync(join(old, '..'), { recursive: true });
      writeFileSync(old, 'antigo');
      vendorTemplate('painel', base);
      expect(existsSync(old)).toBe(false);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });
});

describe('pack-lib', () => {
  it('lê o catalog', () => {
    const yaml =
      "packages:\n  - a\n\ncatalog:\n  '@noble/curves': ^2.4.0\n  react: ^19.3.1\n\nother: 1\n";
    expect(parseCatalog(yaml)).toEqual({ '@noble/curves': '^2.4.0', react: '^19.3.1' });
  });

  it('troca workspace, catalog e a licença', () => {
    const out = transformPackageJson(
      {
        dependencies: {
          '@efds-ui/react': 'workspace:*',
          '@efds-ui/template-license': 'workspace:*',
          react: 'catalog:',
        },
        devDependencies: { '@efds-ui/typescript-config': 'workspace:*', vite: 'catalog:' },
      },
      { catalog: { react: '^19.3.1', vite: '^8.3.8' }, version: '0.1.1' },
    );
    expect(out.dependencies).toEqual({
      '@efds-ui/react': '^0.1.1',
      '@efds-ui/template-license': 'file:./vendor/template-license',
      react: '^19.3.1',
    });
    expect(out.devDependencies).toEqual({ vite: '^8.3.8' });
  });

  it('recusa workspace desconhecido', () => {
    expect(() =>
      transformPackageJson(
        { dependencies: { '@efds-ui/x': 'workspace:*' } },
        { catalog: {}, version: '1' },
      ),
    ).toThrow(/@efds-ui\/x/);
  });

  it('embute o tsconfig compartilhado', () => {
    const shared: Record<string, { extends?: string; compilerOptions: Record<string, unknown> }> = {
      'react.json': { extends: './base.json', compilerOptions: { jsx: 'react-jsx' } },
      'base.json': { compilerOptions: { strict: true, jsx: 'x' } },
    };
    const out = inlineTsconfig(
      {
        extends: '@efds-ui/typescript-config/react.json',
        compilerOptions: { noEmit: true },
        include: ['src'],
      },
      (f) => shared[f]!,
    );
    expect(out).toEqual({
      compilerOptions: { strict: true, jsx: 'react-jsx', noEmit: true },
      include: ['src'],
    });
  });
});
