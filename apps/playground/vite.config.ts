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
    alias: [
      // Mais específicos primeiro: o alias de prefixo pegaria '@eds-ui/behavior/export', '/mask', '/fields' e '/format'.
      {
        find: /^@eds-ui\/behavior\/export\/(csv|json|xlsx|pdf)$/,
        replacement: fromSource('../../packages/behavior/src/export/formats/$1.ts'),
      },
      {
        find: '@eds-ui/behavior/export',
        replacement: fromSource('../../packages/behavior/src/export-entry.ts'),
      },
      {
        find: '@eds-ui/behavior/balloon',
        replacement: fromSource('../../packages/behavior/src/balloon-entry.ts'),
      },
      {
        find: '@eds-ui/behavior/theme',
        replacement: fromSource('../../packages/behavior/src/theme-entry.ts'),
      },
      {
        find: '@eds-ui/behavior/fields',
        replacement: fromSource('../../packages/behavior/src/fields-entry.ts'),
      },
      {
        find: '@eds-ui/behavior/format',
        replacement: fromSource('../../packages/behavior/src/format-entry.ts'),
      },
      {
        find: '@eds-ui/behavior/mask',
        replacement: fromSource('../../packages/behavior/src/mask-entry.ts'),
      },
      {
        find: '@eds-ui/behavior',
        replacement: fromSource('../../packages/behavior/src/index.ts'),
      },
      { find: '@eds-ui/react', replacement: fromSource('../../packages/react/src/index.ts') },
      { find: '@eds-ui/icons', replacement: fromSource('../../packages/icons/src/index.ts') },
    ],
  },
});
