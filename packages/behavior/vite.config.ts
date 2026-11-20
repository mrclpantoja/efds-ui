import { defineConfig } from 'vite';

// Saída ESM (tree-shakeable), com entradas: `index` (tudo), `export` (só os geradores de
// arquivo) e `mask` (só o núcleo da máscara), as duas últimas para o @eds-ui/react. O IIFE para <script> sai de vite.iife.config.ts.
export default defineConfig({
  build: {
    lib: {
      entry: {
        index: 'src/index.ts',
        'export-entry': 'src/export-entry.ts',
        'mask-entry': 'src/mask-entry.ts',
        // Um gerador por formato, para o @eds-ui/react carregar sob demanda.
        'export/formats/csv': 'src/export/formats/csv.ts',
        'export/formats/json': 'src/export/formats/json.ts',
        'export/formats/xlsx': 'src/export/formats/xlsx.ts',
        'export/formats/pdf': 'src/export/formats/pdf.ts',
      },
      formats: ['es'],
      fileName: (_format, name) => `${name}.js`,
    },
  },
});
