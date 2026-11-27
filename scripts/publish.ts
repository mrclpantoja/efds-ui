/**
 * Publica os pacotes @efds-ui/* no npm **em etapas** (`npm stage publish`). Feito para rodar no
 * GitHub Actions (fluxo `.github/workflows/publish.yml`), que entrega a proveniência pela
 * publicação confiável (OIDC). A versão enviada fica retida no npm até alguém aprovar com 2FA em
 * npmjs.com > Staged Packages (ou `npm stage approve <id>`); só então fica pública.
 *
 *   node scripts/publish.ts --dry-run    empacota e simula o envio (não envia nada)
 *   node scripts/publish.ts              envia para aprovação (só no CI; fora dele, recusa)
 *   node scripts/publish.ts --pack <dir> só empacota (job de build do CI, sem credencial)
 *   node scripts/publish.ts --from <dir> envia os tarballs já gerados (job de publicação do CI,
 *                                        o único com OIDC; não roda install nem build)
 *
 * Regras:
 * - todos os pacotes precisam estar na mesma versão; no CI, a tag precisa ser `v<versão>`;
 * - `pnpm pack` resolve `workspace:` e `catalog:`; o tarball é extraído e o `npm stage publish`
 *   roda na pasta extraída (o comando empacota a pasta atual e não aceita tarball);
 * - exige npm 11.15.0 ou mais novo;
 * - versão já publicada é pulada (rodar de novo depois de uma falha no meio é seguro). Versão
 *   enviada e ainda não aprovada não é vista pelo `npm view`: para reenviar, rejeite a anterior.
 */

import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';

const root = join(import.meta.dirname, '..');
/** Ordem de dependência: quem é dependido sai antes. */
const PACKAGES = ['core', 'behavior', 'icons', 'themes', 'react', 'editor'];

const dryRun = process.argv.includes('--dry-run');
const argValue = (flag: string) => {
  const i = process.argv.indexOf(flag);
  return i === -1 ? undefined : process.argv[i + 1];
};
const packDir = argValue('--pack');
const fromDir = argValue('--from');
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

if (!dryRun && !inCi && !packDir) {
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
if (inCi && !dryRun && !packDir && tag !== `v${version}`) {
  fail(`A tag (${tag ?? 'nenhuma'}) precisa ser v${version}.`);
}

if (packDir) {
  for (const { pkg } of versions) {
    run('pnpm', ['pack', '--pack-destination', join(packDir, pkg)], join(root, 'packages', pkg));
  }
  console.log(`Tarballs de ${version} em ${packDir}.`);
  process.exit(0);
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
    if (fromDir) {
      cpSync(join(fromDir, pkg), out, { recursive: true });
    } else {
      run('pnpm', ['pack', '--pack-destination', out], join(root, 'packages', pkg));
    }
    const tgz = readdirSync(out).find((f) => f.endsWith('.tgz'));
    if (!tgz) throw new Error(`tarball de ${name} não encontrado.`);

    if (published) {
      // O npm recusa até a simulação sobre versão existente: aqui só valida o empacotamento.
      console.log(`${spec}: já existe no npm; empacotado, envio não simulado.`);
      continue;
    }
    // O tarball do pnpm guarda tudo em `package/`.
    run('tar', ['-xzf', tgz], out);
    const args = ['stage', 'publish', '--access', 'public'];
    if (inCi) args.push('--provenance');
    if (dryRun) args.push('--dry-run');
    run('npm', args, join(out, 'package'));
    console.log(`${spec}: ${dryRun ? 'simulado' : 'enviado; aguardando aprovação no npmjs.com'}.`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  rmSync(work, { recursive: true, force: true });
}
