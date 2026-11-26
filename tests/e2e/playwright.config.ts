import { defineConfig, devices } from '@playwright/test';
import { join } from 'node:path';
import process from 'node:process';

const PORT = 4173;
/** Relatórios e anexos ficam em node_modules (ignorado pelo Git, pelo Prettier e pelo ESLint). */
const SAIDA = join(import.meta.dirname, 'node_modules', '.e2e');
const CI = Boolean(process.env.CI);
/** Localmente só o Chrome instalado: Firefox e WebKit rodam no CI (`playwright install --with-deps`). */
const ALL = CI || process.env.E2E_ALL === '1';

/**
 * No CI, o chromium vem do Playwright; localmente usa o Chrome do sistema (`channel: 'chrome'`),
 * sem baixar navegador.
 */
const chromium = {
  ...devices['Desktop Chrome'],
  ...(CI ? {} : { channel: 'chrome' as const }),
};

export default defineConfig({
  testDir: './specs',
  // O build (`pnpm build`) tem de existir: os testes rodam contra o site pré-renderizado.
  webServer: {
    command: `node support/serve.ts ${PORT}`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: !CI,
    timeout: 30_000,
  },
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
  },
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  workers: CI ? 2 : undefined,
  outputDir: join(SAIDA, 'test-results'),
  reporter: CI
    ? [['github'], ['html', { open: 'never', outputFolder: join(SAIDA, 'report') }]]
    : [['list']],
  expect: { timeout: 7_000 },
  timeout: 45_000,
  // Capturas por plataforma: só o Linux do CI gera e confere (ver docs/architecture/testes.md).
  snapshotPathTemplate: '{testDir}/../__screenshots__/{platform}/{projectName}/{arg}{ext}',
  projects: [
    {
      name: 'chromium',
      use: chromium,
      testIgnore: /visual\.spec\.ts/,
    },
    ...(ALL
      ? [
          {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
            testIgnore: /visual\.spec\.ts/,
          },
          {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] },
            testIgnore: /visual\.spec\.ts/,
          },
        ]
      : []),
    {
      name: 'visual',
      use: { ...chromium, viewport: { width: 1000, height: 800 }, deviceScaleFactor: 1 },
      testMatch: /visual\.spec\.ts/,
    },
  ],
});
