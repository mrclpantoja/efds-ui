import { defineConfig } from 'vite';

// Trava de licença para <script src defer>: lê window.EFDS_LICENSE e window.EFDS_LICENSE_KEY.
export default defineConfig({
  build: {
    emptyOutDir: true,
    lib: {
      entry: 'src/iife.ts',
      formats: ['iife'],
      name: 'EFDSLicenseGate',
      fileName: () => 'efds-license-gate.js',
    },
  },
});
