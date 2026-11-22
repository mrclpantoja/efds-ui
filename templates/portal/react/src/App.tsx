import { useEffect, useRef, type ReactElement } from 'react';
import { SiteLayout, type NavId } from './components/SiteLayout';
import { Acessibilidade } from './pages/Acessibilidade';
import { Carta } from './pages/Carta';
import { Home } from './pages/Home';
import { Protocolo } from './pages/Protocolo';
import { Servico } from './pages/Servico';
import { Solicitar } from './pages/Solicitar';
import { useRoute, type Route } from './router';

interface Resolved {
  nav?: NavId;
  element: ReactElement;
}

function resolve(route: Route): Resolved {
  const { path, params } = route;
  if (path.startsWith('/servico/')) {
    return { element: <Servico slug={path.slice('/servico/'.length)} /> };
  }
  switch (path) {
    case '/servicos':
      return { nav: 'carta', element: <Carta params={params} /> };
    case '/solicitar':
      return { element: <Solicitar params={params} /> };
    case '/protocolo':
      return { nav: 'protocolo', element: <Protocolo params={params} /> };
    case '/acessibilidade':
      return { nav: 'acessibilidade', element: <Acessibilidade /> };
    default:
      return { nav: 'inicio', element: <Home /> };
  }
}

/** Site inteiro: roteamento por hash, sem biblioteca. */
export function App() {
  const route = useRoute();
  const { nav, element } = resolve(route);
  const first = useRef(true);

  // Troca de página: volta ao topo e leva o foco ao conteúdo (leitores de tela anunciam o título).
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    window.scrollTo(0, 0);
    document.getElementById('conteudo')?.focus({ preventScroll: true });
  }, [route.path]);

  return (
    <SiteLayout current={nav}>
      <div key={route.key}>{element}</div>
    </SiteLayout>
  );
}
