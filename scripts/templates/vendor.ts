/**
 * Copia os arquivos de `dist/` para `templates/<t>/html/vendor/efds-ui/` (fora do Git).
 *
 *   node scripts/templates/vendor.ts [--template painel|cadastro|portal]
 *
 * Rode depois de `pnpm build`.
 */

import { existsSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import process from 'node:process';
import { parseArgs } from 'node:util';
import { TEMPLATES, templatesDir, vendorTemplate } from './lib.ts';

const { values } = parseArgs({
  options: { template: { type: 'string' }, source: { type: 'string' } },
});

// Template fora deste repositório: --source <pasta com html/>.
if (values.source) {
  const source = resolve(values.source);
  const html = join(source, 'html');
  if (!existsSync(html)) {
    console.error(`Sem pasta html em ${source}.`);
    process.exit(1);
  }
  const copied = vendorTemplate(basename(source), undefined, html);
  console.log(
    `${basename(source)}: ${copied.length} arquivos em ${join(html, 'vendor', 'efds-ui')}`,
  );
  process.exit(0);
}

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
