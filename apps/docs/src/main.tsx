import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import '@eds-ui/core/index.css';
import '@eds-ui/themes/index.css';
import './site.css';
import { Layout } from './Layout';

const root = document.getElementById('root');
if (!root) throw new Error('Elemento #root não encontrado.');

createRoot(root).render(
  <StrictMode>
    <Layout />
  </StrictMode>,
);
