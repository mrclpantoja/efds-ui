import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { aguardarHidratacao } from '../support/docs.ts';

/**
 * axe-core em todas as rotas do site, com as regras da WCAG 2.2 AA. A lista vem do sitemap gerado
 * pelo build da documentação (uma entrada por rota registrada em `apps/docs/src/routes.tsx`).
 * Qualquer violação nova reprova o teste (as conhecidas ficam em `axe-conhecidas.json`).
 */
const RAIZ = join(import.meta.dirname, '..', '..', '..');

function rotasDoSitemap(): string[] {
  const xml = readFileSync(join(RAIZ, 'apps', 'docs', 'dist', 'sitemap.xml'), 'utf8');
  const caminhos = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    (m) => new URL(m[1] ?? '').pathname,
  );
  if (caminhos.length < 50) {
    throw new Error(`Sitemap com ${caminhos.length} rotas: rode pnpm build antes dos testes.`);
  }
  return caminhos;
}

const ROTAS = rotasDoSitemap();
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

interface Achado {
  regra: string;
  impacto: string | null | undefined;
  ajuda: string;
  alvos: string[];
}

async function auditar(page: import('@playwright/test').Page): Promise<Achado[]> {
  const resultado = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  return resultado.violations.map((v) => ({
    regra: v.id,
    impacto: v.impact,
    ajuda: v.help,
    alvos: v.nodes.map((n) => n.target.join(' ')),
  }));
}

/**
 * Violações já conhecidas e à espera de decisão do dono do projeto (`axe-conhecidas.json`). O teste
 * as tolera, MAS falha quando uma delas deixa de ocorrer (remova a entrada) e para qualquer
 * violação nova. A lista vazia é o estado desejado.
 */
interface Conhecida {
  rota: string;
  modo: 'claro' | 'escuro';
  regra: string;
  alvo: string;
  motivo: string;
}
const CONHECIDAS: Conhecida[] = JSON.parse(
  readFileSync(join(import.meta.dirname, '..', 'axe-conhecidas.json'), 'utf8'),
).conhecidas;

async function verificar(
  page: import('@playwright/test').Page,
  rota: string,
  modo: Conhecida['modo'],
): Promise<void> {
  const achados = await auditar(page);
  const doTeste = CONHECIDAS.filter((c) => c.rota === rota && c.modo === modo);
  const toleradas = new Set<Conhecida>();
  const novos = achados
    .map((a) => ({
      ...a,
      alvos: a.alvos.filter((alvo) => {
        const conhecida = doTeste.find((c) => c.regra === a.regra && c.alvo === alvo);
        if (conhecida) toleradas.add(conhecida);
        return !conhecida;
      }),
    }))
    .filter((a) => a.alvos.length > 0);
  expect(novos, 'violações novas').toEqual([]);
  const resolvidas = doTeste.filter((c) => !toleradas.has(c));
  expect(
    resolvidas,
    'violações conhecidas que não ocorrem mais: remova de axe-conhecidas.json',
  ).toEqual([]);
}

test.use({ reducedMotion: 'reduce' });

test.describe('axe-core (WCAG 2.2 AA), modo claro', () => {
  for (const rota of ROTAS) {
    test(`rota ${rota}`, async ({ page }) => {
      await page.goto(rota);
      await aguardarHidratacao(page);
      await verificar(page, rota, 'claro');
    });
  }

  test('página 404', async ({ page }) => {
    const resposta = await page.goto('/rota-que-nao-existe');
    expect(resposta?.status()).toBe(404);
    await aguardarHidratacao(page);
    await verificar(page, '/rota-que-nao-existe', 'claro');
  });
});

test.describe('axe-core (WCAG 2.2 AA), modo escuro', () => {
  // O contraste muda com o modo; um navegador basta para cobrir os tokens escuros.
  test.skip(({ browserName }) => browserName !== 'chromium', 'modo escuro: só no chromium');

  for (const rota of ROTAS) {
    test(`rota ${rota}`, async ({ page }) => {
      await page.goto(rota);
      await aguardarHidratacao(page);
      await page.evaluate(() => document.documentElement.setAttribute('data-mode', 'dark'));
      await verificar(page, rota, 'escuro');
    });
  }
});
