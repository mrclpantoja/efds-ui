import { defineConfig } from 'vite';

// CSS puro: a entrada é o próprio index.css; o resultado é dist/index.css.
export default defineConfig({
  build: {
    rolldownOptions: {
      input: 'src/index.css',
      output: { assetFileNames: '[name][extname]' },
    },
  },
});
