import { useSyncExternalStore } from 'react';

/**
 * Roteamento por caminho (`/comecar/instalacao`), pela History API e sem biblioteca: o site só
 * precisa saber o caminho atual. Cada rota também existe como HTML pré-renderizado no build
 * (`scripts/prerender.ts`), para os buscadores indexarem página por página.
 *
 * - Clique em link interno vira `pushState` (sem recarregar).
 * - Links antigos por hash (`/#/componentes/button`) e os `#/...` dos exemplos viram o caminho.
 * - `navigation.navigated` diz ao Layout que a mudança veio de uma navegação (e não da carga
 *   inicial), para mover o foco para o h1.
 */
export const navigation = { navigated: false };

const listeners = new Set<() => void>();
const notify = () => {
  navigation.navigated = true;
  for (const listener of listeners) listener();
};

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

/** Caminho usado na pré-renderização (no servidor não há `window`). */
let serverPath = '/';
export const setServerPath = (path: string) => {
  serverPath = path;
};

const getPath = () => window.location.pathname;

/** `/componentes/button/?x` → `/componentes/button`; vazio → `/`. */
export function parsePath(value: string): string {
  const path = value.replace(/^#/, '').split(/[?#]/)[0] ?? '';
  const clean = path.length > 1 ? path.replace(/\/+$/, '') : path;
  return clean.startsWith('/') ? clean : `/${clean}`;
}

export function useRoutePath(): string {
  return parsePath(useSyncExternalStore(subscribe, getPath, () => serverPath));
}

/** `href` de um link interno para um caminho do registro de rotas. */
export const toHref = (path: string) => path;

export function navigate(path: string, { replace = false } = {}) {
  const target = parsePath(path);
  if (target === parsePath(window.location.pathname) && !window.location.hash) return;
  window.history[replace ? 'replaceState' : 'pushState'](null, '', target);
  notify();
}

/** Caminho que o roteador assume: sem extensão de arquivo e fora das áreas servidas à parte. */
function isDocPath(pathname: string) {
  if (/^\/(demos|mock|img|assets)(\/|$)/.test(pathname)) return false;
  const last = pathname.split('/').pop() ?? '';
  return !last.includes('.');
}

/** Liga o roteador ao documento. Chamado uma vez, antes da primeira renderização. */
export function installRouter() {
  // Link antigo por hash: /#/componentes/button → /componentes/button.
  if (window.location.hash.startsWith('#/')) {
    window.history.replaceState(null, '', parsePath(window.location.hash));
  }

  window.addEventListener('popstate', notify);
  window.addEventListener('hashchange', () => {
    if (window.location.hash.startsWith('#/')) navigate(window.location.hash, { replace: true });
  });

  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = (event.target as Element | null)?.closest?.('a[href]');
    if (!(link instanceof HTMLAnchorElement)) return;
    if ((link.target && link.target !== '_self') || link.hasAttribute('download')) return;
    const href = link.getAttribute('href') ?? '';
    if (href.startsWith('#/')) {
      event.preventDefault();
      navigate(href);
      return;
    }
    if (href.startsWith('#')) return; // âncora na própria página
    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin || !isDocPath(url.pathname)) return;
    event.preventDefault();
    navigate(url.pathname);
  });
}
