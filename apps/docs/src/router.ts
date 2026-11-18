import { useSyncExternalStore } from 'react';

/**
 * Roteamento por hash (`#/comecar/instalacao`). Sem biblioteca: o site só precisa saber o
 * caminho atual. `navigation.navigated` diz ao Layout que a mudança veio de uma navegação
 * (e não da carga inicial), para mover o foco para o h1.
 */
export const navigation = { navigated: false };

function subscribe(onChange: () => void) {
  const onHashChange = () => {
    navigation.navigated = true;
    onChange();
  };
  window.addEventListener('hashchange', onHashChange);
  return () => window.removeEventListener('hashchange', onHashChange);
}

const getHash = () => window.location.hash;

/** `#/componentes/button?x` → `/componentes/button`; hash vazio → `/`. */
export function parsePath(hash: string): string {
  const path = hash.replace(/^#/, '').split('?')[0] ?? '';
  const clean = path.length > 1 ? path.replace(/\/+$/, '') : path;
  return clean.startsWith('/') ? clean : `/${clean}`;
}

export function useRoutePath(): string {
  return parsePath(useSyncExternalStore(subscribe, getHash, () => ''));
}

/** `href` de um link interno para um caminho do registro de rotas. */
export const toHref = (path: string) => `#${path}`;
