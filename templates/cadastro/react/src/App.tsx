import { useEffect, useState } from 'react';
import { DetalhePage } from './pages/DetalhePage';
import { FormPage } from './pages/FormPage';
import { ListaPage } from './pages/ListaPage';
import { shellState } from './Shell';

/** Rotas por hash: `#/`, `#/novo`, `#/editar/FOR-0001` e `#/fornecedor/FOR-0001`. */
function useHashRoute(): string {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onHashChange = () => {
      shellState.navigated = true;
      setHash(window.location.hash);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  return hash.replace(/^#/, '') || '/';
}

export function App() {
  const route = useHashRoute();
  const [, area, id] = route.split('/');

  if (area === 'novo') return <FormPage key="novo" />;
  if (area === 'editar' && id) return <FormPage key={`editar-${id}`} id={id} />;
  if (area === 'fornecedor' && id) return <DetalhePage key={`det-${id}`} id={id} />;
  return <ListaPage />;
}
