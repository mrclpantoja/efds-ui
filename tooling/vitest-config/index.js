import { fileURLToPath } from 'node:url';

/** Preset Vitest: jsdom + matchers do jest-dom. Use com `defineConfig({ ...preset })`. */
export const preset = {
  test: {
    environment: 'jsdom',
    setupFiles: [fileURLToPath(new URL('./setup.js', import.meta.url))],
    restoreMocks: true,
    // Necessário para o cleanup automático do Testing Library.
    globals: true,
  },
};
