import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/** Os pacotes do workspace vêm do código-fonte: o dev server reflete a edição sem rebuild. */
const fromSource = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  plugins: [react()],
  // IPv4 explícito: o Firefox resolve localhost para 127.0.0.1 e o padrão do Vite escuta só em ::1.
  // Caminhos relativos: a demonstração é publicada em subpasta do site.
  base: './',
  server: { host: '127.0.0.1', port: 5302 },
  resolve: {
    alias: [
      // Mais específicos primeiro: o alias de prefixo pegaria as subentradas do behavior.
      {
        find: /^@efds-ui\/behavior\/export\/(csv|json|xlsx|pdf)$/,
        replacement: fromSource('../../../packages/behavior/src/export/formats/$1.ts'),
      },
      {
        find: '@efds-ui/behavior/export',
        replacement: fromSource('../../../packages/behavior/src/export-entry.ts'),
      },
      {
        find: '@efds-ui/behavior/internal',
        replacement: fromSource('../../../packages/behavior/src/internal-entry.ts'),
      },
      {
        find: '@efds-ui/behavior/image',
        replacement: fromSource('../../../packages/behavior/src/image-entry.ts'),
      },
      {
        find: '@efds-ui/behavior/theme',
        replacement: fromSource('../../../packages/behavior/src/theme-entry.ts'),
      },
      {
        find: '@efds-ui/behavior/validate',
        replacement: fromSource('../../../packages/behavior/src/validate-entry.ts'),
      },
      {
        find: '@efds-ui/behavior/fields',
        replacement: fromSource('../../../packages/behavior/src/fields-entry.ts'),
      },
      {
        find: '@efds-ui/behavior/format',
        replacement: fromSource('../../../packages/behavior/src/format-entry.ts'),
      },
      {
        find: '@efds-ui/behavior/mask',
        replacement: fromSource('../../../packages/behavior/src/mask-entry.ts'),
      },
      {
        find: '@efds-ui/behavior',
        replacement: fromSource('../../../packages/behavior/src/index.ts'),
      },
      { find: '@efds-ui/react', replacement: fromSource('../../../packages/react/src/index.ts') },
      { find: '@efds-ui/icons', replacement: fromSource('../../../packages/icons/src/index.ts') },
    ],
  },
});
