import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';

/**
 * Regressão visual: grupos de componentes × tema × modo × densidade, sobre a página estática
 * `visual/fixture/index.html` (CSS do core + temas, sem JS de componente, sem rede).
 *
 * Só o Linux do CI gera e confere as capturas (fontes e rasterização variam por sistema). Sem
 * captura para a plataforma o teste é PULADO: a primeira linha de base nasce do workflow
 * `visual-update.yml` (ver docs/architecture/testes.md). Em `VISUAL_UPDATE=1` o teste roda e grava.
 */
const GRUPOS = ['acoes', 'formularios', 'feedback', 'dados', 'navegacao'] as const;
const TEMAS = ['blue', 'green', 'purple', 'orange', 'neutral'] as const;
const MODOS = ['light', 'dark'] as const;

interface Combinacao {
  tema: (typeof TEMAS)[number];
  modo: (typeof MODOS)[number];
  densidade: 'compact' | 'comfortable' | 'spacious';
}

/** Todos os temas nos dois modos (10) e, só no tema padrão, as outras densidades (2). */
const COMBINACOES: Combinacao[] = [
  ...TEMAS.flatMap((tema) =>
    MODOS.map((modo): Combinacao => ({ tema, modo, densidade: 'comfortable' })),
  ),
  { tema: 'blue', modo: 'light', densidade: 'compact' },
  { tema: 'blue', modo: 'light', densidade: 'spacious' },
];

const ATUALIZANDO = process.env.VISUAL_UPDATE === '1';

for (const grupo of GRUPOS) {
  test.describe(`visual: ${grupo}`, () => {
    for (const { tema, modo, densidade } of COMBINACOES) {
      const nome = `${grupo}-${tema}-${modo}-${densidade}.png`;
      test(nome, async ({ page }, testInfo) => {
        test.skip(
          !ATUALIZANDO && !existsSync(testInfo.snapshotPath(nome)),
          'sem captura de referência para esta plataforma (gere com o workflow visual-update)',
        );

        await page.goto(`/__visual/?theme=${tema}&mode=${modo}&density=${densidade}`);
        // Fontes do sistema: espera só o que o navegador ainda estiver carregando.
        await page.evaluate(() => document.fonts.ready);
        const alvo = page.locator(`[data-visual="${grupo}"]`);
        await expect(alvo).toBeVisible();
        await expect(alvo).toHaveScreenshot(nome, {
          animations: 'disabled',
          caret: 'hide',
          maxDiffPixelRatio: 0.002,
        });
      });
    }
  });
}
