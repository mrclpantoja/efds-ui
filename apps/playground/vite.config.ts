import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/** Os pacotes do workspace vêm do código-fonte: o dev server reflete a edição sem rebuild. */
const fromSource = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  plugins: [react()],
  // IPv4 explícito: o Firefox resolve localhost para 127.0.0.1 e o padrão do Vite escuta só em ::1.
  server: { host: '127.0.0.1' },
  resolve: {
    alias: {
      '@eds-ui/behavior': fromSource('../../packages/behavior/src/index.ts'),
      '@eds-ui/react': fromSource('../../packages/react/src/index.ts'),
      '@eds-ui/icons': fromSource('../../packages/icons/src/index.ts'),
    },
  },
});
