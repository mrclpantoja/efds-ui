import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: { entry: 'src/index.ts', formats: ['es'], fileName: 'index' },
    rolldownOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime', /^@eds-ui\//],
      // Um arquivo por módulo (espelha src/): o bundler do consumidor descarta o que não usa.
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].js',
      },
    },
  },
});
