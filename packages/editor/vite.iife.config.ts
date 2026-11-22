import { defineConfig } from 'vite';

// Pacote único para <script src defer>: leva o ProseMirror junto e mescla `window.EDS.editor`.
export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: 'src/iife.ts',
      formats: ['iife'],
      name: 'EDSEditor',
      fileName: () => 'eds-editor.js',
    },
  },
});
