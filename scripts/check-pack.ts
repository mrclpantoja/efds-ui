/**
 * Verifica que os tarballs dos pacotes publicáveis são consumíveis. Roda depois de `pnpm build`.
 *
 *   node scripts/check-pack.ts            empacota, lista e valida cada tarball
 *
 * Nunca publica nada: usa só `pnpm pack`, num diretório temporário fora do repositório.
 */

import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import process from 'node:process';
import { checkIife, checkTarball, formatSize, type PackManifest } from './pack/check.ts';

const root = join(import.meta.dirname, '..');
const PACKAGES = ['core', 'themes', 'react', 'icons', 'behavior'];
/** Arquivos que o tarball precisa ter além dos alvos do manifest. */
const REQUIRED: Record<string, string[]> = { behavior: ['dist/eds-behavior.js'] };
const EXPECTED_VERSION = '0.1.0';

function run(command: string, args: string[], cwd: string): string {
  // No Windows o pnpm é um shim (.cmd/.ps1) e exige shell; aí a linha vai inteira, com aspas,
  // em vez de args soltos (DEP0190). Os args são caminhos gerados por este script.
  const result =
    process.platform === 'win32'
      ? spawnSync([command, ...args.map((a) => `"${a}"`)].join(' '), {
          cwd,
          encoding: 'utf8',
          shell: true,
        })
      : spawnSync(command, args, { cwd, encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} falhou:\n${result.stdout}${result.stderr}`);
  }
  return result.stdout;
}

function listFiles(dir: string): { path: string; size: number }[] {
  const found: { path: string; size: number }[] = [];
  const walk = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else
        found.push({ path: relative(dir, full).split('\\').join('/'), size: statSync(full).size });
    }
  };
  walk(dir);
  return found.sort((a, b) => a.path.localeCompare(b.path));
}

const work = mkdtempSync(join(tmpdir(), 'eds-pack-'));
let failed = false;
const tarballs: Record<string, string> = {};

try {
  for (const pkg of PACKAGES) {
    const out = join(work, 'tarballs');
    mkdirSync(out, { recursive: true });
    run('pnpm', ['pack', '--pack-destination', out], join(root, 'packages', pkg));
    const tgz = readdirSync(out).find((f) => f === `eds-ui-${pkg}-${EXPECTED_VERSION}.tgz`);
    if (!tgz) throw new Error(`tarball de @eds-ui/${pkg} não encontrado em ${out}`);
    tarballs[pkg] = join(out, tgz);

    const extracted = join(work, 'extracted', pkg);
    mkdirSync(extracted, { recursive: true });
    run('tar', ['-xzf', tarballs[pkg], '-C', extracted], work);
    const base = join(extracted, 'package');
    const files = listFiles(base);
    const manifest = JSON.parse(readFileSync(join(base, 'package.json'), 'utf8')) as PackManifest;
    const problems = checkTarball(
      manifest,
      files.map((f) => f.path),
      EXPECTED_VERSION,
      REQUIRED[pkg],
    );
    if (pkg === 'behavior') {
      problems.push(...checkIife(readFileSync(join(base, 'dist', 'eds-behavior.js'), 'utf8')));
    }

    const total = files.reduce((sum, f) => sum + f.size, 0);
    console.log(
      `\n@eds-ui/${pkg}@${manifest.version}  ${files.length} arquivos, ${formatSize(total)} descompactado, ${formatSize(statSync(tarballs[pkg]).size)} tgz`,
    );
    for (const f of files) console.log(`  ${formatSize(f.size).padStart(9)}  ${f.path}`);
    if (problems.length > 0) {
      failed = true;
      console.error(`\n  FALHOU @eds-ui/${pkg}:`);
      for (const p of problems) console.error(`  - ${p}`);
    } else {
      console.log('  OK');
    }
  }
} catch (error) {
  failed = true;
  console.error(error instanceof Error ? error.message : error);
} finally {
  rmSync(work, { recursive: true, force: true });
}

if (failed) {
  console.error('\npack:check falhou.');
  process.exit(1);
}
console.log('\npack:check OK.');
