import { defineConfig } from 'vite';

// Saída ESM (tree-shakeable). O IIFE para <script> sai de vite.iife.config.ts.
export default defineConfig({
  build: {
    lib: { entry: 'src/index.ts', formats: ['es'], fileName: 'index' },
  },
});
