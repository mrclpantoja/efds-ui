/**
 * Gera o par de chaves Ed25519 do emissor.
 *
 *   node scripts/templates/keygen.ts
 *
 * A chave privada vai para o arquivo em `EFDS_LICENSE_PRIVATE_KEY` (ou `~/.efds-license/private.key`)
 * e nunca é sobrescrita. A pública é gravada em `templates/license/src/public-key.ts`.
 * Guarde a privada fora do repositório e faça backup: sem ela não há como emitir novas chaves.
 */

import { chmodSync, existsSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { parseArgs } from 'node:util';
import { generateKeyPair } from '../../templates/license/src/sign.ts';
import { ensureDir, privateKeyPath, root } from './lib.ts';

const { values } = parseArgs({
  options: {
    'public-file': { type: 'string' },
  },
});

const privatePath = privateKeyPath();
const publicFile =
  values['public-file'] ?? join(root, 'templates', 'license', 'src', 'public-key.ts');

if (existsSync(privatePath)) {
  console.error(`Recusado: já existe uma chave privada em ${privatePath}. Nada foi alterado.`);
  process.exit(1);
}

const pair = generateKeyPair();
ensureDir(dirname(privatePath));
writeFileSync(privatePath, `${pair.secretKey}\n`, { mode: 0o600, flag: 'wx' });
try {
  chmodSync(privatePath, 0o600);
} catch {
  // Windows: as permissões vêm da pasta do usuário.
}

writeFileSync(
  publicFile,
  `/**
 * Chave pública Ed25519 de produção (base64url). Gerada por \`pnpm templates:keygen\`;
 * a chave privada nunca entra em repositório.
 */
export const PUBLIC_KEY = '${pair.publicKey}';
`,
);

console.log(`Chave privada gravada em ${privatePath} (faça backup, não versione).`);
console.log(`Chave pública gravada em ${publicFile}.`);
console.log('Refaça "pnpm build" para embutir a nova chave pública nos templates.');
