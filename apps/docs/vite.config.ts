import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

/** Os pacotes do workspace vêm do código-fonte: o dev server reflete a edição sem rebuild. */
const fromSource = (path: string) => fileURLToPath(new URL(path, import.meta.url));

const templatesDir = fileURLToPath(new URL('../../templates/', import.meta.url));
const types: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};

/**
 * No dev server, /demos/<template>/html/* vem de templates/<template>/html (rode
 * `pnpm templates:vendor`) e /demos/<template>/react/* do build do app (`pnpm build`).
 * Sem isso o Vite devolveria o index.html do site. No build, quem copia é `pnpm templates:site`.
 */
function demos(): Plugin {
  return {
    name: 'efds-docs-demos',
    configureServer(server) {
      server.middlewares.use('/demos', (req, res, next) => {
        const url = decodeURIComponent((req.url ?? '/').split('?')[0] ?? '/');
        const match = /^\/(painel|cadastro|portal)\/(html|react)(\/.*)?$/.exec(url);
        if (!match) return next();
        const [, template = '', kind = '', rest = '/'] = match;
        const base = join(templatesDir, template, kind === 'html' ? 'html' : 'react/dist');
        let file = normalize(join(base, rest));
        if (!file.startsWith(base)) return next();
        if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
        if (!existsSync(file)) {
          res.statusCode = 404;
          res.end('Demonstração não encontrada: rode pnpm build e pnpm templates:vendor.');
          return;
        }
        res.setHeader('Content-Type', types[extname(file)] ?? 'application/octet-stream');
        res.end(readFileSync(file));
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), demos()],
  // IPv4 explícito: o Firefox resolve localhost para 127.0.0.1 e o padrão do Vite escuta só em ::1.
  // Porta fixa: o playground usa a 5173 e os roteiros apontam para a 5199.
  server: { host: '127.0.0.1', port: 5199 },
  resolve: {
    alias: [
      // Mais específicos primeiro: o alias de prefixo pegaria '@efds-ui/behavior/export', '/mask', '/fields' e '/format'.
      {
        find: /^@efds-ui\/behavior\/export\/(csv|json|xlsx|pdf)$/,
        replacement: fromSource('../../packages/behavior/src/export/formats/$1.ts'),
      },
      {
        find: '@efds-ui/behavior/export',
        replacement: fromSource('../../packages/behavior/src/export-entry.ts'),
      },
      {
        find: '@efds-ui/editor/react',
        replacement: fromSource('../../packages/editor/src/react/index.ts'),
      },
      { find: '@efds-ui/editor', replacement: fromSource('../../packages/editor/src/index.ts') },
      {
        find: '@efds-ui/behavior/balloon',
        replacement: fromSource('../../packages/behavior/src/balloon-entry.ts'),
      },
      {
        find: '@efds-ui/behavior/image',
        replacement: fromSource('../../packages/behavior/src/image-entry.ts'),
      },
      {
        find: '@efds-ui/behavior/theme',
        replacement: fromSource('../../packages/behavior/src/theme-entry.ts'),
      },
      {
        find: '@efds-ui/behavior/fields',
        replacement: fromSource('../../packages/behavior/src/fields-entry.ts'),
      },
      {
        find: '@efds-ui/behavior/format',
        replacement: fromSource('../../packages/behavior/src/format-entry.ts'),
      },
      {
        find: '@efds-ui/behavior/mask',
        replacement: fromSource('../../packages/behavior/src/mask-entry.ts'),
      },
      {
        find: '@efds-ui/behavior',
        replacement: fromSource('../../packages/behavior/src/index.ts'),
      },
      { find: '@efds-ui/react', replacement: fromSource('../../packages/react/src/index.ts') },
      { find: '@efds-ui/icons', replacement: fromSource('../../packages/icons/src/index.ts') },
    ],
  },
});
