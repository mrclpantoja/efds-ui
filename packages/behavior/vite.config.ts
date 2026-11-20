import { defineConfig } from 'vite';

// Saída ESM (tree-shakeable), com duas entradas: `index` (tudo) e `export` (só os geradores de
// arquivo, para o @eds-ui/react). O IIFE para <script> sai de vite.iife.config.ts.
export default defineConfig({
  build: {
    lib: {
      entry: { index: 'src/index.ts', 'export-entry': 'src/export-entry.ts' },
      formats: ['es'],
      fileName: (_format, name) => `${name}.js`,
    },
  },
});
