import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import '@efds-ui/core/index.css';
import '@efds-ui/themes/index.css';
import './site.css';
import { alert, configure, confirm, loader, prompt, toast } from '@efds-ui/behavior';
import { Layout } from './Layout';
import { installDocsMocks } from './mock-api';

// O site é React: o loader automático ficaria bloqueando a navegação da documentação. Fica em
// modo manual, e `window.EDS` expõe só o que os exemplos HTML chamam (o mesmo nome que o
// `eds-behavior.js` cria ao ser carregado por <script>). Os previews HTML são ligados um a um,
// por `init(previewEl)` (components/Example.tsx), nunca por `init(document)`.
// Lookup e CEP dos exemplos consultam serviços FICTÍCIOS locais (mock-api.ts); o `cepUrl` é só da
// documentação: em produção o autor escolhe o serviço (o padrão do pacote é vazio).
installDocsMocks();
configure({ loader: { mode: 'manual' }, cepUrl: '/mock/cep/{cep}' });
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
