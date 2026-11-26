import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { DialogProvider, ToastProvider } from '@efds-ui/react';
import '@fontsource-variable/inter';
import '@efds-ui/core/index.css';
import '@efds-ui/themes/index.css';
import './cadastro.css';
import { App } from './App';
import { installMocks } from './mock';
import { StoreProvider } from './store';

installMocks();

const root = document.getElementById('root');
if (!root) throw new Error('Elemento #root não encontrado.');

createRoot(root).render(
  <StrictMode>
    <ToastProvider>
      <DialogProvider>
        <StoreProvider>
          <App />
        </StoreProvider>
      </DialogProvider>
    </ToastProvider>
  </StrictMode>,
);
