import { defineConfig } from 'vite';

// Build ESM vendorizado dentro do download React (templates/license/dist/pkg).
export default defineConfig({
  build: {
    outDir: 'dist/pkg',
    emptyOutDir: true,
    lib: {
      entry: { index: 'src/index.ts', react: 'src/react.tsx' },
      formats: ['es'],
    },
    rolldownOptions: {
      external: ['react', 'react/jsx-runtime', /^@efds-ui\//, /^@noble\//],
    },
  },
});
