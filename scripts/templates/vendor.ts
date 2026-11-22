/**
 * Copia os arquivos de `dist/` para `templates/<t>/html/vendor/efds-ui/` (fora do Git).
 *
 *   node scripts/templates/vendor.ts [--template painel|cadastro|portal]
 *
 * Rode depois de `pnpm build`.
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { parseArgs } from 'node:util';
import { TEMPLATES, templatesDir, vendorTemplate } from './lib.ts';

const { values } = parseArgs({ options: { template: { type: 'string' } } });

const names: readonly string[] = values.template ? [values.template] : TEMPLATES;
for (const name of names) {
  if (!(TEMPLATES as readonly string[]).includes(name)) {
    console.error(`Template desconhecido: ${name}.`);
    process.exit(1);
  }
  if (!existsSync(join(templatesDir, name, 'html'))) {
    console.log(`${name}: sem pasta html, ignorado.`);
    continue;
  }
  const copied = vendorTemplate(name);
  console.log(`${name}: ${copied.length} arquivos em templates/${name}/html/vendor/efds-ui/`);
}
