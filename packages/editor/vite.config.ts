import { defineConfig } from 'vite';

// ESM com duas entradas: `index` (núcleo vanilla) e `react/index` (wrapper). ProseMirror e React
// ficam externos (dependências do pacote); o IIFE para <script> leva tudo (vite.iife.config.ts).
export default defineConfig({
  build: {
    lib: {
      entry: { index: 'src/index.ts', 'react/index': 'src/react/index.ts' },
      formats: ['es'],
      fileName: (_format, name) => `${name}.js`,
    },
    rolldownOptions: {
      external: [/^prosemirror-/, 'react', 'react-dom', 'react/jsx-runtime'],
    },
  },
});
