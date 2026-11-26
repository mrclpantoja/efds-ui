import { expect, test } from '@playwright/test';
import { abrirExemplo, camadas } from '../support/docs.ts';

for (const camada of camadas) {
  test.describe(`Editor (${camada})`, () => {
    test('digita, aplica negrito pela barra e o botão reflete o estado', async ({ page }) => {
      const bloco = await abrirExemplo(page, '/componentes/editor', 'Editor básico', camada);
      const area = bloco.getByRole('textbox', { name: 'Descrição' });
      const negrito = bloco.getByRole('button', { name: 'Negrito' });
      await expect(area).toBeVisible();

      await area.click();
      await page.keyboard.press('Control+End');
      await page.keyboard.press('Enter');
      await page.keyboard.press('Enter'); // sai da lista
      await page.keyboard.type('Texto novo');
      await page.keyboard.press('Shift+Home');
      await negrito.click();

      await expect(negrito).toHaveAttribute('aria-pressed', 'true');
      await expect(area.locator('strong', { hasText: 'Texto novo' })).toBeVisible();

      // Atalho: Ctrl+B desfaz o negrito da mesma seleção.
      await area.focus();
      await page.keyboard.press('Control+B');
      await expect(area.locator('strong', { hasText: 'Texto novo' })).toHaveCount(0);
      await expect(negrito).toHaveAttribute('aria-pressed', 'false');
    });

    test('insere um link pelo diálogo da barra e recusa javascript:', async ({ page }) => {
      const bloco = await abrirExemplo(page, '/componentes/editor', 'Editor básico', camada);
      const area = bloco.getByRole('textbox', { name: 'Descrição' });

      await area.click();
      await page.keyboard.press('Control+End');
      await page.keyboard.press('Enter');
      await page.keyboard.press('Enter');
      await page.keyboard.type('Saiba mais');
      await page.keyboard.press('Shift+Home');

      await bloco.getByRole('button', { name: /Link/ }).click();
      // O campo do endereço recebe o foco; Enter confirma.
      await page.keyboard.type('https://exemplo.com.br/contato');
      await page.keyboard.press('Enter');
      const link = area.getByRole('link', { name: 'Saiba mais' });
      await expect(link).toHaveAttribute('href', 'https://exemplo.com.br/contato');

      // Endereço perigoso é recusado: nenhum link novo com javascript:.
      await area.focus();
      await page.keyboard.press('Control+End');
      await page.keyboard.press('Enter');
      await page.keyboard.type('Perigo');
      await page.keyboard.press('Shift+Home');
      await bloco.getByRole('button', { name: /Link/ }).click();
      await page.keyboard.type('javascript:alert(1)');
      await page.keyboard.press('Enter');
      await expect(area.locator('a[href^="javascript:" i]')).toHaveCount(0);
    });

    test('a barra é um toolbar com uma única parada de Tab e setas entre os comandos', async ({
      page,
    }) => {
      const bloco = await abrirExemplo(page, '/componentes/editor', 'Editor básico', camada);
      const barra = bloco.getByRole('toolbar', { name: 'Formatação' });
      await expect(barra.locator('[tabindex="0"]')).toHaveCount(1);

      await barra.getByRole('button', { name: 'Desfazer' }).focus();
      await page.keyboard.press('ArrowRight');
      await expect(barra.getByRole('button', { name: 'Refazer' })).toBeFocused();
    });
  });
}

test.describe('Editor (HTML): valor enviado no formulário', () => {
  test('o textarea original recebe o HTML saneado do conteúdo', async ({ page }) => {
    const bloco = await abrirExemplo(page, '/componentes/editor', 'Editor básico', 'html');
    const area = bloco.getByRole('textbox', { name: 'Descrição' });
    await area.click();
    await page.keyboard.press('Control+End');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Linha final');
    await expect(bloco.locator('textarea[data-eds-editor]')).toHaveValue(/<p>Linha final<\/p>/);
  });
});
