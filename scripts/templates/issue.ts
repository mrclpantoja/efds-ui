/**
 * Emite uma licença de template e imprime a chave.
 *
 *   node scripts/templates/issue.ts --product painel --type free --out <pasta>
 *   node scripts/templates/issue.ts --product erp --type single --domain exemplo.gov.br --out <pasta> --write-key both
 *
 * Grava `efds-license.json` e `efds-license.js` em <pasta>. Com `--write-key`, grava também
 * `efds-config.js` (html) e/ou `.env` (react) com a chave.
 */

import { join, resolve } from 'node:path';
import process from 'node:process';
import { parseArgs } from 'node:util';
import type { LicenseType } from '../../templates/license/src/core.ts';
import { configJsFile, issueLicense, licenseJsFile, readPrivateKey, writeText } from './lib.ts';

const { values } = parseArgs({
  options: {
    product: { type: 'string' },
    type: { type: 'string' },
    domain: { type: 'string', multiple: true },
    id: { type: 'string' },
    out: { type: 'string' },
    'write-key': { type: 'string' },
  },
});

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

const type = values.type;
if (!values.product) fail('Falta --product.');
if (type !== 'free' && type !== 'single' && type !== 'multi') {
  fail('--type deve ser free, single ou multi.');
}
if (!values.out) fail('Falta --out <pasta>.');
const writeKey = values['write-key'];
if (writeKey !== undefined && !['html', 'react', 'both'].includes(writeKey)) {
  fail('--write-key deve ser html, react ou both.');
}

const out = resolve(values.out);
const { license, key } = issueLicense({
  product: values.product,
  type: type as LicenseType,
  domains: values.domain,
  id: values.id,
  secretKey: readPrivateKey(),
});

writeText(join(out, 'efds-license.json'), `${JSON.stringify(license, null, 2)}\n`);
writeText(join(out, 'efds-license.js'), licenseJsFile(license));
if (writeKey === 'html' || writeKey === 'both')
  writeText(join(out, 'efds-config.js'), configJsFile(key));
if (writeKey === 'react' || writeKey === 'both') {
  writeText(join(out, '.env'), `VITE_EFDS_LICENSE_KEY=${key}\n`);
}

console.log(`Licença ${license.id} (${license.product}, ${license.type}) gravada em ${out}.`);
console.log(`Chave: ${key}`);
