import { defineConfig } from 'vite';

// Servidor estático para abrir as páginas HTML dos templates (`pnpm templates:dev`).
export default defineConfig({
  root: '..',
  server: { host: '127.0.0.1', port: 5180, strictPort: true },
});
