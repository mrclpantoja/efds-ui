/**
 * Publica os pacotes @efds-ui/* no npm. Feito para rodar no GitHub Actions (fluxo
 * `.github/workflows/publish.yml`), que entrega a proveniência pela publicação confiável (OIDC).
 *
 *   node scripts/publish.ts --dry-run    empacota e simula a publicação (não envia nada)
 *   node scripts/publish.ts              publica (só no CI; fora dele, recusa)
 *
 * Regras:
 * - todos os pacotes precisam estar na mesma versão; no CI, a tag precisa ser `v<versão>`;
 * - `pnpm pack` resolve `workspace:` e `catalog:`; quem envia é o `npm publish` do tarball;
 * - versão já publicada é pulada (rodar de novo depois de uma falha no meio é seguro).
 */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';

const root = join(import.meta.dirname, '..');
/** Ordem de dependência: quem é dependido sai antes. */
const PACKAGES = ['core', 'behavior', 'icons', 'themes', 'react', 'editor'];

const dryRun = process.argv.includes('--dry-run');
const inCi = process.env.GITHUB_ACTIONS === 'true';

function run(command: string, args: string[], cwd: string, allowFail = false) {
  // No Windows o pnpm/npm são shims e exigem shell; os args são gerados por este script.
  const result =
    process.platform === 'win32'
      ? spawnSync([command, ...args.map((a) => `"${a}"`)].join(' '), {
          cwd,
          encoding: 'utf8',
          shell: true,
        })
      : spawnSync(command, args, { cwd, encoding: 'utf8' });
  if (result.status !== 0 && !allowFail) {
    throw new Error(`${command} ${args.join(' ')} falhou:\n${result.stdout}${result.stderr}`);
  }
  return result;
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

if (!dryRun && !inCi) {
  fail('Publicação real só pelo GitHub Actions (proveniência). Localmente, use --dry-run.');
}

const versions = PACKAGES.map((pkg) => {
  const manifest = JSON.parse(
    readFileSync(join(root, 'packages', pkg, 'package.json'), 'utf8'),
  ) as { name: string; version: string; private?: boolean };
  if (manifest.private) fail(`${manifest.name} está "private": true.`);
  return { pkg, name: manifest.name, version: manifest.version };
});
const version = versions[0]?.version ?? fail('Nenhum pacote.');
const mismatch = versions.filter((v) => v.version !== version);
if (mismatch.length > 0) {
  fail(`Versões diferentes: ${versions.map((v) => `${v.name}@${v.version}`).join(', ')}.`);
}
const tag = process.env.GITHUB_REF_TYPE === 'tag' ? process.env.GITHUB_REF_NAME : undefined;
if (inCi && !dryRun && tag !== `v${version}`) {
  fail(`A tag (${tag ?? 'nenhuma'}) precisa ser v${version}.`);
}

const work = mkdtempSync(join(tmpdir(), 'efds-publish-'));
try {
  for (const { pkg, name } of versions) {
    const spec = `${name}@${version}`;
    const published = run('npm', ['view', spec, 'version'], root, true).stdout.trim() === version;
    if (published && !dryRun) {
      console.log(`${spec}: já publicado, pulando.`);
      continue;
    }

    const out = join(work, pkg);
    run('pnpm', ['pack', '--pack-destination', out], join(root, 'packages', pkg));
    const tgz = readdirSync(out).find((f) => f.endsWith('.tgz'));
    if (!tgz) throw new Error(`tarball de ${name} não encontrado.`);

    if (published) {
      // O npm recusa até a simulação sobre versão existente: aqui só valida o empacotamento.
      console.log(`${spec}: já existe no npm; empacotado, envio não simulado.`);
      continue;
    }
    const args = ['publish', join(out, tgz), '--access', 'public'];
    if (inCi) args.push('--provenance');
    if (dryRun) args.push('--dry-run');
    run('npm', args, root);
    console.log(`${spec}: ${dryRun ? 'simulado' : 'publicado'}.`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  rmSync(work, { recursive: true, force: true });
}
