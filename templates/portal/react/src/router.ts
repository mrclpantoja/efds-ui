import { useEffect, useState } from 'react';

/** Rota lida do hash: `#/servicos?busca=iptu` vira `{ path: '/servicos', params: busca=iptu }`. */
export interface Route {
  path: string;
  params: URLSearchParams;
  /** O hash inteiro; serve de chave para remontar a página quando os parâmetros mudam. */
  key: string;
}

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, '') || '/';
  const [path = '/', query = ''] = raw.split('?');
  return { path: path === '' ? '/' : path, params: new URLSearchParams(query), key: raw };
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export const go = (to: string) => {
  window.location.hash = to;
};

/** Endereços do portal (um só lugar, para os links não divergirem). */
export const href = {
  home: '#/',
  carta: (query?: { busca?: string; categoria?: string }) => {
    const params = new URLSearchParams();
    if (query?.busca) params.set('busca', query.busca);
    if (query?.categoria) params.set('categoria', query.categoria);
    const text = params.toString();
    return text ? `#/servicos?${text}` : '#/servicos';
  },
  servico: (slug: string) => `#/servico/${slug}`,
  solicitar: (slug?: string) => (slug ? `#/solicitar?servico=${slug}` : '#/solicitar'),
  protocolo: (number?: string) =>
    number ? `#/protocolo?protocolo=${encodeURIComponent(number)}` : '#/protocolo',
  acessibilidade: '#/acessibilidade',
};
