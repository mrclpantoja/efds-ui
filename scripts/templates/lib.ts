/** Núcleo dos scripts de templates (chaves, emissão, vendor), separado para ser testável. */

import { randomUUID } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { parseLicense, type License, type LicenseType } from '../../templates/license/src/core.ts';
import { publicKeyOf, signLicense } from '../../templates/license/src/sign.ts';

export const root = join(import.meta.dirname, '..', '..');
export const templatesDir = join(root, 'templates');
export const TEMPLATES = ['painel', 'cadastro', 'portal'] as const;

/** Caminho do arquivo da chave privada: `EFDS_LICENSE_PRIVATE_KEY` ou `~/.efds-license/private.key`. */
export function privateKeyPath(): string {
  return process.env.EFDS_LICENSE_PRIVATE_KEY || join(homedir(), '.efds-license', 'private.key');
}

export function readPrivateKey(path = privateKeyPath()): string {
  if (!existsSync(path)) {
    throw new Error(`Chave privada não encontrada em ${path}. Rode "pnpm templates:keygen" antes.`);
  }
  return readFileSync(path, 'utf8').trim();
}

export interface IssueOptions {
  product: string;
  type: LicenseType;
  domains?: string[];
  id?: string;
  /** Padrão: hoje (AAAA-MM-DD, UTC). */
  issuedAt?: string;
  secretKey: string;
}

export interface IssuedLicense {
  license: License;
  key: string;
}

export function issueLicense(options: IssueOptions): IssuedLicense {
  const license: Record<string, unknown> = {
    v: 1,
    id: options.id ?? randomUUID(),
    product: options.product,
    type: options.type,
    issuedAt: options.issuedAt ?? new Date().toISOString().slice(0, 10),
  };
  if (options.domains && options.domains.length > 0) license.domains = options.domains;
  const parsed = parseLicense(license);
  if (!parsed) {
    throw new Error(
      options.type === 'single'
        ? 'A licença "single" exige ao menos um --domain.'
        : 'Licença inválida: confira --product, --type e --domain.',
    );
  }
  return { license: parsed, key: signLicense(parsed, options.secretKey) };
}

export function licenseJsFile(license: License): string {
  return `window.EFDS_LICENSE = ${JSON.stringify(license, null, 2)};\n`;
}

export function configJsFile(key: string): string {
  return `// Chave de licença do efDS.ui. Cole entre as aspas a chave que acompanha o seu arquivo de licença.\nwindow.EFDS_LICENSE_KEY = '${key}';\n`;
}

export { publicKeyOf };

export function ensureDir(dir: string): void {
  mkdirSync(dir, { recursive: true });
}

export function writeText(path: string, content: string): void {
  ensureDir(dirname(path));
  writeFileSync(path, content);
}

/** Arquivos de `dist/` que cada template HTML recebe em `vendor/efds-ui/`. */
export const VENDOR_FILES: { from: string[]; to: string[] }[] = [
  { from: ['packages', 'core', 'dist', 'index.css'], to: ['core', 'index.css'] },
  { from: ['packages', 'themes', 'dist', 'index.css'], to: ['themes', 'index.css'] },
  {
    from: ['packages', 'behavior', 'dist', 'eds-behavior.js'],
    to: ['behavior', 'eds-behavior.js'],
  },
  {
    from: ['templates', 'license', 'dist', 'efds-license-gate.js'],
    to: ['license', 'efds-license-gate.js'],
  },
];

export function vendorDir(template: string): string {
  return join(templatesDir, template, 'html', 'vendor', 'efds-ui');
}

/** Copia os arquivos de `dist/` para o template. Devolve os caminhos copiados. */
/** `htmlDir`: pasta html/ de um template fora deste repositório (opção `--source`). */
export function vendorTemplate(template: string, base = root, htmlDir?: string): string[] {
  const missing = VENDOR_FILES.map((f) => join(base, ...f.from)).filter((p) => !existsSync(p));
  if (missing.length > 0) {
    throw new Error(`Faltam arquivos de build (rode "pnpm build"):\n  ${missing.join('\n  ')}`);
  }
  const target = htmlDir
    ? join(htmlDir, 'vendor', 'efds-ui')
    : join(base, 'templates', template, 'html', 'vendor', 'efds-ui');
  rmSync(target, { recursive: true, force: true });
  const copied: string[] = [];
  for (const file of VENDOR_FILES) {
    const dest = join(target, ...file.to);
    ensureDir(dirname(dest));
    copyFileSync(join(base, ...file.from), dest);
    copied.push(dest);
  }
  return copied;
}
