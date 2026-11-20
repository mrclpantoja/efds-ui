import { StrictMode, useEffect, useRef, useState, type ComponentType } from 'react';
import { createRoot } from 'react-dom/client';
import { init } from '@eds-ui/behavior';
import '@fontsource-variable/inter';
import '@eds-ui/core/index.css';
import '@eds-ui/themes/index.css';
import './foundations.css';
import { App } from './App';
import { Dashboard } from './screens/Dashboard';
import { Formulario } from './screens/Formulario';
import { Listagem } from './screens/Listagem';
import { shellState } from './screens/ReferenceShell';

/** Telas de referência por hash; qualquer outro hash mostra o playground. */
const screens: Partial<Record<string, ComponentType>> = {
  '#/dashboard': Dashboard,
  '#/listagem': Listagem,
  '#/formulario': Formulario,
};

const PLAYGROUND_TITLE = 'eDS.ui Playground';

function Router() {
  const [hash, setHash] = useState(() => window.location.hash);
  const previous = useRef(hash);

  useEffect(() => {
    const onHashChange = () => {
      shellState.navigated = true; // a tela que montar move o foco para o próprio h1
      setHash(window.location.hash);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Voltar de uma tela ao playground: título e foco no h1 do App. Âncoras internas do
  // playground (#asd-…) também trocam o hash, mas não vêm de uma tela: não mexem no foco.
  useEffect(() => {
    const cameFromScreen = screens[previous.current] !== undefined;
    previous.current = hash;
    if (screens[hash] || !cameFromScreen) return;
    shellState.navigated = false;
    document.title = PLAYGROUND_TITLE;
    document.getElementById('playground-titulo')?.focus();
  }, [hash]);

  // O @eds-ui/behavior liga só as raízes marcadas com `data-eds-live` (exemplos em HTML cru:
  // upload, datas, combobox, filtro da tabela). Os demais demos têm JS próprio em React e os
  // estados forçados ficam estáticos. O loader automático fica desligado.
  const showsPlayground = screens[hash] === undefined;
  useEffect(() => {
    if (!showsPlayground) return undefined;
    const stops = Array.from(document.querySelectorAll<HTMLElement>('[data-eds-live]')).map(
      (root) => init(root, { loader: { mode: 'manual' } }),
    );
    return () => {
      for (const stop of stops) stop();
    };
  }, [showsPlayground]);

  const Screen = screens[hash];
  return Screen ? <Screen key={hash} /> : <App />;
}

const root = document.getElementById('root');
if (!root) throw new Error('Elemento #root não encontrado.');

createRoot(root).render(
  <StrictMode>
    <Router />
  </StrictMode>,
);
