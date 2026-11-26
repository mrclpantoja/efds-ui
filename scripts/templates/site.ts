/**
 * Copia as demonstrações dos templates gratuitos para o build do site de documentação:
 *   apps/docs/dist/demos/<template>/html   (páginas + vendor)
 *   apps/docs/dist/demos/<template>/react  (build do app React)
 *
 * Toda página de demonstração recebe `<meta name="robots" content="noindex">`: são telas de
 * exemplo com dados fictícios, conteúdo raso para a busca (a página Templates é que se indexa).
 * Não bloquear `/demos/` no robots.txt: o buscador precisa ler a página para ver o noindex.
 *
 * Antes: `pnpm build` (gera os apps React) e `pnpm templates:vendor`.
 * Uso: node scripts/templates/site.ts
 */
import { cpSync, existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
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

const NOINDEX = '<meta name="robots" content="noindex" />';
let pages = 0;
for (const entry of readdirSync(out, { recursive: true, withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith('.html')) continue;
  const file = join(entry.parentPath, entry.name);
  const html = readFileSync(file, 'utf8');
  if (html.includes('name="robots"')) continue;
  const head = html.match(/<head[^>]*>/i);
  if (!head) throw new Error(`Página de demonstração sem <head>: ${file}`);
  writeFileSync(
    file,
    html.replace(
      head[0],
      `${head[0]}
    ${NOINDEX}`,
    ),
  );
  pages += 1;
}
console.log(`noindex em ${pages} páginas de demonstração.`);
