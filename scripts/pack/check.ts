/** Verificação do conteúdo de um tarball do `pnpm pack`. Funções puras: sem I/O. */

export interface PackManifest {
  name?: string;
  version?: string;
  main?: string;
  module?: string;
  types?: string;
  style?: string;
  exports?: unknown;
  files?: string[];
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  [key: string]: unknown;
}

/** Arquivos permitidos fora de `dist/`. */
const ROOT_ALLOWED = /^(package\.json|README\.md|CHANGELOG\.md|LICENSE(\.[a-z]+)?)$/i;

const JUNK: [RegExp, string][] = [
  [/\.(test|spec)\.[cm]?[jt]sx?(\.map)?$/, 'arquivo de teste'],
  [/(^|\/)test-utils(\/|$)/, 'test-utils'],
  [/\.tsbuildinfo$/, '.tsbuildinfo'],
  [/(^|\/)tsconfig[^/]*\.json$/, 'config do TypeScript'],
  [/(^|\/)(vite|vitest)\.config\.[^/]+$/, 'config do Vite/Vitest'],
  [/(^|\/)(eslint\.config\.[^/]+|\.eslintrc[^/]*|\.prettierrc[^/]*)$/, 'config de lint/formatação'],
  [/(^|\/)\.gitkeep$/, '.gitkeep'],
];

/** Alvos de arquivo declarados no manifest (exports, main, module, types, style). */
export function manifestTargets(manifest: PackManifest): string[] {
  const targets = new Set<string>();
  const walk = (value: unknown): void => {
    if (typeof value === 'string') targets.add(value);
    else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === 'object') Object.values(value).forEach(walk);
  };
  walk(manifest.exports);
  for (const key of ['main', 'module', 'types', 'style'] as const) {
    const value = manifest[key];
    if (typeof value === 'string') targets.add(value);
  }
  return [...targets].sort();
}

const normalize = (target: string): string => target.replace(/^\.\//, '');

/** Quantos arquivos do tarball (caminhos relativos a `package/`) satisfazem o alvo; `*` casa qualquer trecho. */
export function matchTarget(target: string, files: readonly string[]): number {
  const wanted = normalize(target);
  if (!wanted.includes('*')) return files.includes(wanted) ? 1 : 0;
  const escaped = wanted.split('*').map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp(`^${escaped.join('.+')}$`);
  return files.filter((file) => pattern.test(file)).length;
}

/** `workspace:` (ou `link:`/`file:`) restante nos campos de dependência. */
export function unresolvedDeps(manifest: PackManifest): string[] {
  const fields = [
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'optionalDependencies',
  ] as const;
  const found: string[] = [];
  for (const field of fields) {
    for (const [name, range] of Object.entries(manifest[field] ?? {})) {
      if (/^(workspace|link|file|portal):/.test(range)) found.push(`${field}.${name}=${range}`);
    }
  }
  return found;
}

/** Condição (ex.: `development`, que aponta para `src`) em qualquer nível de `exports`. */
function hasCondition(value: unknown, condition: string): boolean {
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(
    ([key, inner]) => key === condition || hasCondition(inner, condition),
  );
}

/**
 * @param manifest `package.json` lido de dentro do tarball
 * @param files caminhos do tarball relativos a `package/`
 * @returns lista de problemas; vazia quando o tarball é consumível
 */
export function checkTarball(
  manifest: PackManifest,
  files: readonly string[],
  expectedVersion?: string,
): string[] {
  const problems: string[] = [];

  if (expectedVersion && manifest.version !== expectedVersion) {
    problems.push(`versão ${manifest.version ?? '(ausente)'} (esperada ${expectedVersion})`);
  }
  for (const required of ['package.json', 'README.md']) {
    if (!files.includes(required)) problems.push(`falta ${required}`);
  }
  if (!files.some((f) => f.startsWith('dist/'))) problems.push('falta dist/');

  for (const file of files) {
    const junk = JUNK.find(([pattern]) => pattern.test(file));
    if (junk) problems.push(`lixo (${junk[1]}): ${file}`);
    else if (!file.startsWith('dist/') && !ROOT_ALLOWED.test(file)) {
      problems.push(`fora de dist/: ${file}`);
    }
  }

  for (const target of manifestTargets(manifest)) {
    if (!target.startsWith('./')) problems.push(`alvo sem "./": ${target}`);
    else if (matchTarget(target, files) === 0) {
      problems.push(`alvo inexistente no tarball: ${target}`);
    }
  }
  if (hasCondition(manifest.exports, 'development')) {
    problems.push('exports ainda tem a condição "development" (aponta para src)');
  }
  for (const dep of unresolvedDeps(manifest)) problems.push(`dependência não resolvida: ${dep}`);

  return problems;
}

export function formatSize(bytes: number): string {
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} kB`;
}
