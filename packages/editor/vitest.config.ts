import { fileURLToPath } from 'node:url';
import { preset } from '@efds-ui/vitest-config';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    ...preset.test,
    setupFiles: [
      ...preset.test.setupFiles,
      fileURLToPath(new URL('./src/setup.ts', import.meta.url)),
    ],
  },
});
