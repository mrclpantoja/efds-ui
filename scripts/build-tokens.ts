/**
 * Gerador de tokens JSON → CSS do eDS.ui. Contrato: docs/architecture/tokens.md.
 *
 *   node scripts/build-tokens.ts            gera/atualiza os CSS (e remove os órfãos)
 *   node scripts/build-tokens.ts --check    não escreve; sai com 1 se algo estiver desatualizado
 */

import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { diffOutputs } from './tokens/check.ts';
import { compileTokens, formatIssue, type SourceInput } from './tokens/compile.ts';
import { GENERATED_MARKER } from './tokens/render.ts';

const root = join(import.meta.dirname, '..');
const SOURCE_DIRS = ['packages/core/tokens', 'packages/themes/tokens'];
const OUTPUT_DIRS = ['packages/core/src/tokens', 'packages/themes/src/tokens'];

function listFiles(dir: string, extension: string): string[] {
  const absolute = join(root, dir);
  if (!existsSync(absolute)) return [];
  const found: string[] = [];
  for (const entry of readdirSync(absolute, { withFileTypes: true })) {
    const child = `${dir}/${entry.name}`;
    if (entry.isDirectory()) found.push(...listFiles(child, extension));
    else if (entry.name.endsWith(extension)) found.push(child);
  }
  return found.sort();
}

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8').replace(/\r\n/g, '\n');
}

function main(): number {
  const check = process.argv.includes('--check');

  const sources: SourceInput[] = SOURCE_DIRS.flatMap((dir) => listFiles(dir, '.json')).map(
    (path) => ({ path, text: read(path) }),
  );
  const { issues, outputs } = compileTokens(sources);
  if (issues.length > 0) {
    console.error(`Tokens inválidos (${issues.length}):`);
    for (const issue of issues) console.error(`  - ${formatIssue(issue)}`);
    return 1;
  }

  // Só CSS com o cabeçalho de gerado são candidatos a órfão; arquivos à mão nunca são tocados.
  const existing = new Map<string, string>();
  for (const path of OUTPUT_DIRS.flatMap((dir) => listFiles(dir, '.css'))) {
    const text = read(path);
    if (text.includes(GENERATED_MARKER)) existing.set(path, text);
  }
  const { stale, orphans } = diffOutputs(outputs, existing);

  if (check) {
    if (stale.length === 0 && orphans.length === 0) {
      console.log(`Tokens em dia (${outputs.size} arquivo(s) CSS).`);
      return 0;
    }
    console.error('Tokens desatualizados; rode "pnpm tokens" e versione o resultado:');
    for (const path of stale) console.error(`  - ${path} (desatualizado ou ausente)`);
    for (const path of orphans) console.error(`  - ${path} (órfão: o JSON de origem não existe)`);
    return 1;
  }

  for (const path of stale) {
    const absolute = join(root, path);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, outputs.get(path) as string, 'utf8');
  }
  for (const path of orphans) rmSync(join(root, path));
  console.log(
    `Tokens: ${outputs.size} arquivo(s) CSS; ${stale.length} escrito(s), ${orphans.length} órfão(s) removido(s).`,
  );
  return 0;
}

process.exitCode = main();
