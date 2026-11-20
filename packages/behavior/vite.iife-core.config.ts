import { defineConfig } from 'vite';

// Pacote único para <script src defer>: expõe window.EDS e liga tudo sozinho (src/iife-core.ts).
export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: 'src/iife-core.ts',
      formats: ['iife'],
      name: 'EDS',
      fileName: () => 'eds-behavior-core.js',
    },
  },
});
