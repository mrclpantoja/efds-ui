import { expect, test } from '@playwright/test';
import { abrirExemplo, camadas, focoPresoEm } from '../support/docs.ts';

for (const camada of camadas) {
  test.describe(`Modal (${camada})`, () => {
    test('abre com foco em Cancelar, prende o Tab e devolve o foco ao fechar com Esc', async ({
      page,
    }) => {
      const bloco = await abrirExemplo(page, '/componentes/modal', 'Confirmação', camada);
      const gatilho = bloco.getByRole('button', { name: 'Excluir projeto' });
      await gatilho.click();

      const dialogo = page.getByRole('dialog', { name: 'Excluir projeto?' });
      await expect(dialogo).toBeVisible();
      await expect(dialogo.getByRole('button', { name: 'Cancelar' })).toBeFocused();

      // Foco preso: Tab e Shift+Tab nunca caem em elemento da página por trás.
      for (let i = 0; i < 5; i += 1) {
        await page.keyboard.press('Tab');
        expect(await focoPresoEm(page, 'dialog')).toBe(true);
      }
      await page.keyboard.press('Shift+Tab');
      expect(await focoPresoEm(page, 'dialog')).toBe(true);

      await page.keyboard.press('Escape');
      await expect(dialogo).toBeHidden();
      await expect(gatilho).toBeFocused();
    });

    test('clicar no fundo fecha o diálogo sem dados a perder e devolve o foco', async ({
      page,
    }) => {
      const bloco = await abrirExemplo(page, '/componentes/modal', 'Confirmação', camada);
      const gatilho = bloco.getByRole('button', { name: 'Excluir projeto' });
      const dialogo = page.getByRole('dialog', { name: 'Excluir projeto?' });

      await gatilho.click();
      await expect(dialogo).toBeVisible();
      // O canto da janela é o backdrop (o diálogo fica no centro).
      await page.mouse.click(4, 4);
      await expect(dialogo).toBeHidden();
      await expect(gatilho).toBeFocused();
    });

    test('o botão de confirmação do rodapé fecha o diálogo', async ({ page }) => {
      const bloco = await abrirExemplo(page, '/componentes/modal', 'Confirmação', camada);
      const gatilho = bloco.getByRole('button', { name: 'Excluir projeto' });
      const dialogo = page.getByRole('dialog', { name: 'Excluir projeto?' });

      await gatilho.click();
      await dialogo.getByRole('button', { name: 'Excluir', exact: true }).click();
      await expect(dialogo).toBeHidden();
      await expect(gatilho).toBeFocused();
    });

    test('formulário com backdrop estático: clicar fora não fecha e Esc fecha', async ({
      page,
    }) => {
      const bloco = await abrirExemplo(page, '/componentes/modal', 'Formulário', camada);
      const gatilho = bloco.getByRole('button', { name: 'Novo projeto' });
      await gatilho.click();

      const dialogo = page.getByRole('dialog', { name: 'Novo projeto' });
      await expect(dialogo).toBeVisible();
      await expect(dialogo.getByLabel('Nome do projeto')).toBeFocused();

      await dialogo.getByLabel('Nome do projeto').fill('Projeto Horizonte');
      await page.mouse.click(4, 4);
      await expect(dialogo).toBeVisible();

      await page.keyboard.press('Escape');
      await expect(dialogo).toBeHidden();
      await expect(gatilho).toBeFocused();
    });

    test('Cancelar fecha o formulário', async ({ page }) => {
      const bloco = await abrirExemplo(page, '/componentes/modal', 'Formulário', camada);
      const gatilho = bloco.getByRole('button', { name: 'Novo projeto' });
      await gatilho.click();
      const dialogo = page.getByRole('dialog', { name: 'Novo projeto' });
      await dialogo.getByRole('button', { name: 'Cancelar' }).click();
      await expect(dialogo).toBeHidden();
      await expect(gatilho).toBeFocused();
    });
  });
}
