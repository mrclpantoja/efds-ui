import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@eds-ui/core/index.css';
import '@eds-ui/themes/index.css';
import { App } from './App';

const root = document.getElementById('root');
if (!root) throw new Error('Elemento #root não encontrado.');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
