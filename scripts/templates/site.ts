/**
 * Copia as demonstrações dos templates gratuitos para o build do site de documentação:
 *   apps/docs/dist/demos/<template>/html   (páginas + vendor + licença de demonstração)
 *   apps/docs/dist/demos/<template>/react  (build do app React)
 *
 * Antes: `pnpm build` (gera os apps React e o gate) e `pnpm templates:vendor`.
 * Uso: node scripts/templates/site.ts
 */
import { cpSync, existsSync, rmSync } from 'node:fs';
import { basename, join } from 'node:path';
import { root, templatesDir, TEMPLATES } from './lib.ts';

const docsDist = join(root, 'apps', 'docs', 'dist');
if (!existsSync(join(docsDist, 'index.html'))) {
  console.error('Build da documentação ausente: rode "pnpm build" antes.');
  process.exit(1);
}

const out = join(docsDist, 'demos');
rmSync(out, { recursive: true, force: true });

for (const template of TEMPLATES) {
  const html = join(templatesDir, template, 'html');
  const reactDist = join(templatesDir, template, 'react', 'dist');
  if (!existsSync(join(html, 'vendor'))) {
    console.error(`Vendor ausente em ${template}: rode "pnpm templates:vendor".`);
    process.exit(1);
  }
  if (!existsSync(join(reactDist, 'index.html'))) {
    console.error(`Build React ausente em ${template}: rode "pnpm build".`);
    process.exit(1);
  }
  cpSync(html, join(out, template, 'html'), {
    recursive: true,
    filter: (path) => basename(path) !== '.gitignore',
  });
  cpSync(reactDist, join(out, template, 'react'), { recursive: true });
  console.log(`${template}: demos/${template}/html e demos/${template}/react`);
}
