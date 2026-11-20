import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import '@eds-ui/core/index.css';
import '@eds-ui/themes/index.css';
import './site.css';
import { alert, configure, confirm, loader, prompt, toast } from '@eds-ui/behavior';
import { Layout } from './Layout';

// O site é React: o loader automático ficaria bloqueando a navegação da documentação. Fica em
// modo manual, e `window.EDS` expõe só o que os exemplos HTML chamam (o mesmo nome que o
// `eds-behavior.js` cria ao ser carregado por <script>). Os previews HTML são ligados um a um,
// por `init(previewEl)` (components/Example.tsx), nunca por `init(document)`.
configure({ loader: { mode: 'manual' } });
(window as unknown as { EDS: object }).EDS = {
  toast,
  loader,
  alert,
  confirm,
  prompt,
};

const root = document.getElementById('root');
if (!root) throw new Error('Elemento #root não encontrado.');

createRoot(root).render(
  <StrictMode>
    <Layout />
  </StrictMode>,
);
