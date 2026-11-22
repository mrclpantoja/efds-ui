import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { LicenseGate } from '@efds-ui/template-license/react';
import '@fontsource-variable/inter';
import '@efds-ui/core/index.css';
import '@efds-ui/themes/index.css';
import './portal.css';
import { App } from './App';
import license from './efds-license.json';

const root = document.getElementById('root');
if (!root) throw new Error('Elemento #root não encontrado.');

createRoot(root).render(
  <StrictMode>
    <LicenseGate license={license} licenseKey={import.meta.env.VITE_EFDS_LICENSE_KEY}>
      <App />
    </LicenseGate>
  </StrictMode>,
);
