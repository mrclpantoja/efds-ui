import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import '@efds-ui/core/index.css';
import '@efds-ui/themes/index.css';
import './painel.css';
import { App } from './App';
import { aplicarAparencia, lerAparencia } from './preferencias';

// Antes do primeiro desenho: a aparência escolhida já vale (sem piscar o tema padrão).
aplicarAparencia(lerAparencia());

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
