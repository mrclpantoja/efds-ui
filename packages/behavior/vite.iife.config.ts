import { defineConfig } from 'vite';

// Pacote único para <script src defer>: expõe window.EDS e liga tudo sozinho (src/iife.ts).
export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: 'src/iife.ts',
      formats: ['iife'],
      name: 'EDS',
      fileName: () => 'eds-behavior.js',
    },
  },
});
