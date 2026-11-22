import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { LicenseGate } from '@efds-ui/template-license/react';
import '@fontsource-variable/inter';
import '@efds-ui/core/index.css';
import '@efds-ui/themes/index.css';
import './painel.css';
import license from './efds-license.json';
import { App } from './App';
import { aplicarAparencia, lerAparencia } from './preferencias';

// Antes do primeiro desenho: a aparência escolhida já vale (sem piscar o tema padrão).
aplicarAparencia(lerAparencia());

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <LicenseGate license={license} licenseKey={import.meta.env.VITE_EFDS_LICENSE_KEY}>
        <App />
      </LicenseGate>
    </StrictMode>,
  );
}
