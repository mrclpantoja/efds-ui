/**
 * Pré-renderização do site (roda no fim do `pnpm build` da doc):
 *
 * - um `index.html` por rota (`dist/componentes/button/index.html`), com o conteúdo da página já
 *   no HTML e título, descrição, link canônico, Open Graph e dados estruturados próprios — sem
 *   isso o buscador veria uma página vazia, igual para todas as rotas;
 * - `404.html` (sem indexação), `sitemap.xml` e `robots.txt`.
 *
 * O React assume a página no navegador (`main.tsx`). Depende de `vite build --ssr` ter gerado
 * `dist-ssr/entry-server.js`, que é apagado no fim.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const docs = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(docs, 'dist');
const ssrDir = join(docs, 'dist-ssr');

// React de produção na renderização (sem os avisos e a lentidão do modo de desenvolvimento).
process.env.NODE_ENV ??= 'production';
const ssr = await import(pathToFileURL(join(ssrDir, 'entry-server.js')).href);
const { routes, render, pageTitle, pageDescription, canonicalUrl } = ssr;
const { SITE_NAME, SITE_URL, SITE_DESCRIPTION, OG_IMAGE } = ssr;

const template = readFileSync(join(dist, 'index.html'), 'utf8');
const HEAD = /<title>[\s\S]*?<!--\/seo-->/;
const ROOT = '<div id="root"></div>';
if (!HEAD.test(template) || !template.includes(ROOT)) {
  throw new Error('index.html sem o bloco <title>…<!--/seo--> ou sem <div id="root"></div>.');
}

const esc = (text) =>
  String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
/** JSON dentro de <script>: `<` escapado para não fechar a tag. */
const jsonLd = (data) =>
  `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;

function structuredData(route) {
  const url = canonicalUrl(route.path);
  if (route.path === '/') {
    return [
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: SITE_NAME,
        url,
        inLanguage: 'pt-BR',
      },
      {
        '@context': 'https://schema.org',
        '@type': 'SoftwareSourceCode',
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        url,
        codeRepository: 'https://github.com/mrclpantoja/efds-ui',
        programmingLanguage: ['CSS', 'HTML', 'JavaScript', 'TypeScript', 'React'],
        license: 'https://opensource.org/licenses/MIT',
        inLanguage: 'pt-BR',
        isAccessibleForFree: true,
      },
    ];
  }
  // A seção (Ações, Formulários...) não tem página própria: fora da trilha, porque o Google exige
  // `item` (URL) em todo elemento da BreadcrumbList.
  const items = [
    { name: SITE_NAME, item: `${SITE_URL}/` },
    { name: route.title, item: url },
  ];
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, ...it })),
    },
  ];
}

function head(route, { noindex = false } = {}) {
  const title = esc(pageTitle(route));
  const description = esc(pageDescription(route));
  const lines = [`<title>${title}</title>`, `<meta name="description" content="${description}" />`];
  if (noindex) {
    lines.push('<meta name="robots" content="noindex" />');
  } else {
    const url = canonicalUrl(route.path);
    lines.push(
      `<link rel="canonical" href="${url}" />`,
      '<meta property="og:type" content="website" />',
      `<meta property="og:site_name" content="${SITE_NAME}" />`,
      '<meta property="og:locale" content="pt_BR" />',
      `<meta property="og:url" content="${url}" />`,
      `<meta property="og:title" content="${title}" />`,
      `<meta property="og:description" content="${description}" />`,
      `<meta property="og:image" content="${OG_IMAGE}" />`,
      '<meta property="og:image:width" content="1200" />',
      '<meta property="og:image:height" content="630" />',
      '<meta name="twitter:card" content="summary_large_image" />',
      ...structuredData(route).map(jsonLd),
    );
  }
  return lines.join('\n    ');
}

function page(route, path, options) {
  const body = render(path);
  return template
    .replace(HEAD, () => head(route, options))
    .replace(ROOT, () => `<div id="root">${body}</div>`);
}

function write(file, content) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

for (const route of routes) {
  const file = route.path === '/' ? join(dist, 'index.html') : join(dist, route.path, 'index.html');
  write(file, page(route, route.path));
}
write(join(dist, '404.html'), page(undefined, '/404', { noindex: true }));

const today = new Date().toISOString().slice(0, 10);
const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...routes.map(
    (r) => `  <url><loc>${canonicalUrl(r.path)}</loc><lastmod>${today}</lastmod></url>`,
  ),
  '</urlset>',
  '',
].join('\n');
write(join(dist, 'sitemap.xml'), sitemap);
write(
  join(dist, 'robots.txt'),
  `User-agent: *\nAllow: /\nDisallow: /mock/\n\nSitemap: ${SITE_URL}/sitemap.xml\n`,
);

rmSync(ssrDir, { recursive: true, force: true });
console.log(`Pré-renderização: ${routes.length} páginas, 404.html, sitemap.xml e robots.txt.`);
