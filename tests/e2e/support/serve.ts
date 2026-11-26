/**
 * Servidor estático dos testes E2E, sem dependência. Existe porque o `vite preview` não serve as
 * rotas aninhadas da documentação sem a barra final (`/componentes/button`), e o site pré-renderizado
 * tem um `index.html` por rota.
 *
 *   node support/serve.ts [porta]
 *
 * Montagens (a primeira que casar vence):
 *   /__visual/   tests/e2e/visual/fixture   (página da regressão visual)
 *   /__core/     packages/core/dist
 *   /__themes/   packages/themes/dist
 *   /            apps/docs/dist             (rota sem arquivo → <rota>/index.html; senão 404.html)
 */
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import process from 'node:process';

const here = import.meta.dirname;
const repo = resolve(here, '..', '..', '..');
const MOUNTS: Array<[string, string]> = [
  ['/__visual/', join(here, '..', 'visual', 'fixture')],
  ['/__core/', join(repo, 'packages', 'core', 'dist')],
  ['/__themes/', join(repo, 'packages', 'themes', 'dist')],
  ['/', join(repo, 'apps', 'docs', 'dist')],
];

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

function resolveFile(pathname: string): { file: string; status: number } | null {
  for (const [prefix, base] of MOUNTS) {
    if (!pathname.startsWith(prefix)) continue;
    const rest = pathname.slice(prefix.length);
    const candidate = normalize(join(base, rest));
    // Nunca sai da raiz montada (../).
    if (candidate !== base && !candidate.startsWith(base + sep)) return null;
    if (existsSync(candidate)) {
      if (statSync(candidate).isDirectory()) {
        const index = join(candidate, 'index.html');
        if (existsSync(index)) return { file: index, status: 200 };
      } else {
        return { file: candidate, status: 200 };
      }
    }
    if (prefix === '/' && !extname(pathname)) {
      const notFound = join(base, '404.html');
      if (existsSync(notFound)) return { file: notFound, status: 404 };
    }
    return null;
  }
  return null;
}

const port = Number(process.argv[2] ?? 4173);

createServer((req, res) => {
  const pathname = decodeURIComponent((req.url ?? '/').split('?')[0] ?? '/');
  const hit = resolveFile(pathname);
  if (!hit) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Não encontrado');
    return;
  }
  res.writeHead(hit.status, {
    'Content-Type': TYPES[extname(hit.file)] ?? 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  res.end(readFileSync(hit.file));
}).listen(port, '127.0.0.1', () => {
  console.log(`E2E: servindo em http://127.0.0.1:${port}`);
});
