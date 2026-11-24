/**
 * Entrada da pré-renderização (só no build: `vite build --ssr`). Gera o HTML de cada rota para os
 * buscadores e para a primeira pintura; no navegador, o React assume a página (`main.tsx`).
 */
import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { Layout } from './Layout';
import { setServerPath } from './router';
import { routes, sections } from './routes';

export { routes, sections };
export * from './seo';

export function render(path: string): string {
  setServerPath(path);
  return renderToString(
    <StrictMode>
      <Layout />
    </StrictMode>,
  );
}
