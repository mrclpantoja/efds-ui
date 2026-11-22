/** Transformações puras do empacotamento de templates (testáveis sem tocar o disco). */

/** Pacotes `@efds-ui/*` publicados no npm; os demais `workspace:*` precisam de tratamento próprio. */
export const PUBLISHED = [
  '@efds-ui/core',
  '@efds-ui/themes',
  '@efds-ui/icons',
  '@efds-ui/react',
  '@efds-ui/behavior',
  '@efds-ui/editor',
];

export const LICENSE_PACKAGE = '@efds-ui/template-license';
export const TSCONFIG_PACKAGE = '@efds-ui/typescript-config';

/** Lê o bloco `catalog:` do pnpm-workspace.yaml (linhas `nome: versão`). */
export function parseCatalog(yaml: string): Record<string, string> {
  const catalog: Record<string, string> = {};
  let inside = false;
  for (const line of yaml.split(/\r?\n/)) {
    if (/^catalog:\s*$/.test(line)) {
      inside = true;
      continue;
    }
    if (!inside) continue;
    if (/^\S/.test(line)) break;
    const match = /^\s+['"]?([^'":]+?)['"]?:\s*['"]?([^'"\s#]+)['"]?\s*$/.exec(line);
    if (match?.[1] && match[2]) catalog[match[1]] = match[2];
  }
  return catalog;
}

type Deps = Record<string, string>;
export interface PackageJson {
  dependencies?: Deps;
  devDependencies?: Deps;
  peerDependencies?: Deps;
  [key: string]: unknown;
}

export interface TransformOptions {
  catalog: Record<string, string>;
  /** Versão dos pacotes publicados (ex.: 0.1.1). */
  version: string;
}

/** Troca `workspace:*` e `catalog:` por versões reais; o verificador de licença vira `file:`. */
export function transformPackageJson(pkg: PackageJson, opts: TransformOptions): PackageJson {
  const out: PackageJson = JSON.parse(JSON.stringify(pkg));
  for (const field of ['dependencies', 'devDependencies', 'peerDependencies'] as const) {
    const deps = out[field];
    if (!deps) continue;
    for (const [name, range] of Object.entries(deps)) {
      if (name === TSCONFIG_PACKAGE) {
        delete deps[name];
      } else if (name === LICENSE_PACKAGE) {
        deps[name] = 'file:./vendor/template-license';
      } else if (range.startsWith('workspace:')) {
        if (!PUBLISHED.includes(name))
          throw new Error(`Dependência de workspace sem versão publicada: ${name}`);
        deps[name] = `^${opts.version}`;
      } else if (range.startsWith('catalog:')) {
        const version = opts.catalog[name];
        if (!version) throw new Error(`Sem versão no catalog para ${name}`);
        deps[name] = version;
      }
    }
  }
  // Ordem estável, como o npm gosta.
  for (const field of ['dependencies', 'devDependencies', 'peerDependencies'] as const) {
    const deps = out[field];
    if (deps)
      out[field] = Object.fromEntries(Object.entries(deps).sort(([a], [b]) => a.localeCompare(b)));
  }
  return out;
}

export interface TsConfigLike {
  extends?: string;
  compilerOptions?: Record<string, unknown>;
  [key: string]: unknown;
}

/** Se o tsconfig estende `@efds-ui/typescript-config/*`, embute as opções (o pacote não é publicado). */
export function inlineTsconfig(
  tsconfig: TsConfigLike,
  resolveShared: (file: string) => TsConfigLike,
): TsConfigLike {
  const base = tsconfig.extends;
  const prefix = `${TSCONFIG_PACKAGE}/`;
  if (typeof base !== 'string' || !base.startsWith(prefix)) return tsconfig;
  const chain: TsConfigLike[] = [];
  let file: string | undefined = base.slice(prefix.length);
  while (file) {
    const shared = resolveShared(file.replace(/^\.\//, ''));
    chain.unshift(shared);
    file = typeof shared.extends === 'string' ? shared.extends : undefined;
  }
  const merged: Record<string, unknown> = {};
  for (const item of chain) Object.assign(merged, item.compilerOptions);
  const { compilerOptions, ...rest } = tsconfig;
  delete rest.extends;
  return { ...rest, compilerOptions: { ...merged, ...compilerOptions } };
}
