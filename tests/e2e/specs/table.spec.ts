import { expect, test } from '@playwright/test';
import { abrirExemplo, camadas, textos } from '../support/docs.ts';

/**
 * O Firefox do Playwright derruba a aba ("Page crashed") ao ler o texto destes exemplos depois de
 * carregados (CI, Linux). Ordenação e arrastar foram validados no Firefox real na Fase 7; Chromium e
 * WebKit cobrem estes cenários. Retirar o fixme quando o Playwright corrigir.
 */
const FIREFOX_CRASH = 'Firefox do Playwright: Page crashed ao ler o texto do exemplo';

for (const camada of camadas) {
  test.describe(`Table (${camada})`, () => {
    test('ordena por coluna, alterna crescente/decrescente e atualiza aria-sort', async ({
      page,
      browserName,
    }) => {
      test.fixme(browserName === 'firefox', FIREFOX_CRASH);
      const bloco = await abrirExemplo(
        page,
        '/componentes/table',
        'Ordenação, seleção e paginação',
        camada,
      );
      const codigos = bloco.locator('tbody tr td:nth-child(2)');
      const total = bloco.getByRole('columnheader', { name: 'Total' });
      const codigo = bloco.getByRole('columnheader', { name: 'Código' });

      const totais = async () =>
        (await textos(bloco.locator('tbody tr td.eds-table-num'))).map((texto) =>
          Number(texto.replace(/[^\d,]/g, '').replace(',', '.')),
        );
      const ordenado = (valores: number[], sentido: 1 | -1) =>
        valores.every((v, i) => i === 0 || (valores[i - 1] ?? 0) * sentido <= v * sentido);

      await expect(codigo).toHaveAttribute('aria-sort', 'ascending');
      await expect(codigos.first()).toHaveText('PED-0001');

      await total.getByRole('button', { name: 'Total' }).click();
      await expect(total).toHaveAttribute('aria-sort', 'ascending');
      await expect(codigo).toHaveAttribute('aria-sort', 'none');
      await expect.poll(async () => ordenado(await totais(), 1)).toBe(true);

      await total.getByRole('button', { name: 'Total' }).click();
      await expect(total).toHaveAttribute('aria-sort', 'descending');
      await expect.poll(async () => ordenado(await totais(), -1)).toBe(true);

      // Teclado: o botão de ordenação é nativo (Enter ativa).
      await codigo.getByRole('button', { name: 'Código' }).focus();
      await page.keyboard.press('Enter');
      await expect(codigo).toHaveAttribute('aria-sort', 'ascending');
      await expect(codigos.first()).toHaveText('PED-0001');
    });

    test('seleciona linhas, o "selecionar todos" fica indeterminado e depois marca tudo', async ({
      page,
    }) => {
      const bloco = await abrirExemplo(
        page,
        '/componentes/table',
        'Ordenação, seleção e paginação',
        camada,
      );
      const todos = bloco.getByRole('checkbox', { name: 'Selecionar todos desta página' });
      const linha1 = bloco.getByRole('checkbox', { name: 'Selecionar PED-0001' });
      const linha3 = bloco.getByRole('checkbox', { name: 'Selecionar PED-0003' });
      const indeterminado = () => todos.evaluate((el) => (el as HTMLInputElement).indeterminate);

      // O exemplo já traz PED-0003 selecionada: seleção parcial.
      await expect(linha3).toBeChecked();
      await expect(linha1).not.toBeChecked();
      expect(await indeterminado()).toBe(true);

      await todos.check();
      await expect(linha1).toBeChecked();
      await expect(bloco.getByRole('checkbox', { name: 'Selecionar PED-0002' })).toBeChecked();
      expect(await indeterminado()).toBe(false);

      await todos.uncheck();
      await expect(linha1).not.toBeChecked();
      await expect(linha3).not.toBeChecked();

      await linha1.check();
      expect(await indeterminado()).toBe(true);
      await expect(todos).not.toBeChecked();
    });

    test('o filtro local ignora acento e caixa, mostra o resultado e Esc limpa', async ({
      page,
    }) => {
      const bloco = await abrirExemplo(
        page,
        '/componentes/table',
        'Busca local (filtro de linhas)',
        camada,
      );
      const busca = bloco.getByRole('searchbox', { name: 'Buscar pedido' });
      const linhas = bloco.locator('tbody tr:visible');
      const total = await linhas.count();
      expect(total).toBeGreaterThan(2);

      // "clinica" sem acento acha "Clínica Fictícia".
      await busca.fill('CLINICA');
      await expect(linhas).toHaveCount(1);
      await expect(linhas.first()).toContainText('Clínica Fictícia');
      await expect(bloco.getByRole('status').filter({ hasText: 'resultado' })).toHaveText(
        '1 resultado.',
      );

      await busca.press('Escape');
      await expect(busca).toHaveValue('');
      await expect(linhas).toHaveCount(total);
    });

    test('filtro sem correspondência mostra a linha de vazio', async ({ page }) => {
      const bloco = await abrirExemplo(
        page,
        '/componentes/table',
        'Busca local (filtro de linhas)',
        camada,
      );
      await bloco.getByRole('searchbox', { name: 'Buscar pedido' }).fill('zzzzz');
      await expect(bloco.getByRole('status').filter({ hasText: /resultado|nenhum/i })).toHaveCount(
        1,
      );
      await expect(bloco.getByText('PED-0001')).toBeHidden();
    });
  });
}
