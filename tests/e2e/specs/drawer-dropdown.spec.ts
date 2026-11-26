import { expect, test } from '@playwright/test';
import { abrirExemplo, camadas, focoPresoEm } from '../support/docs.ts';

for (const camada of camadas) {
  test.describe(`Drawer (${camada})`, () => {
    test('abre com foco no primeiro campo, prende o Tab, fecha com Esc e devolve o foco', async ({
      page,
    }) => {
      const bloco = await abrirExemplo(
        page,
        '/componentes/drawer',
        'Filtros (borda final)',
        camada,
      );
      const gatilho = bloco.getByRole('button', { name: 'Filtros' });
      await gatilho.click();

      const gaveta = page.getByRole('dialog', { name: 'Filtros' });
      await expect(gaveta).toBeVisible();
      await expect(gaveta.getByLabel('Buscar')).toBeFocused();

      for (let i = 0; i < 12; i += 1) {
        await page.keyboard.press('Tab');
        expect(await focoPresoEm(page, 'dialog')).toBe(true);
      }

      await page.keyboard.press('Escape');
      await expect(gaveta).toBeHidden();
      await expect(gatilho).toBeFocused();
    });

    test('clicar no fundo fecha a gaveta', async ({ page }) => {
      const bloco = await abrirExemplo(
        page,
        '/componentes/drawer',
        'Filtros (borda final)',
        camada,
      );
      await bloco.getByRole('button', { name: 'Filtros' }).click();
      const gaveta = page.getByRole('dialog', { name: 'Filtros' });
      await expect(gaveta).toBeVisible();
      // A gaveta ocupa a borda final: o canto inicial da janela é o backdrop.
      await page.mouse.click(4, 400);
      await expect(gaveta).toBeHidden();
    });
  });

  test.describe(`Dropdown (${camada})`, () => {
    test('abre pelo gatilho, navega por Tab, fecha com Esc e devolve o foco', async ({ page }) => {
      const bloco = await abrirExemplo(page, '/componentes/dropdown', 'Menu de ações', camada);
      const gatilho = bloco.getByRole('button', { name: 'Ações do pedido' });
      await gatilho.click();

      const editar = page.getByRole('button', { name: 'Editar pedido' });
      const exportar = page.getByRole('button', { name: 'Exportar PDF' });
      await expect(editar).toBeVisible();

      // Padrão disclosure: os itens são botões alcançáveis por Tab.
      await page.keyboard.press('Tab');
      await expect(editar).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(exportar).toBeFocused();

      await page.keyboard.press('Escape');
      await expect(editar).toBeHidden();
      await expect(gatilho).toBeFocused();
    });

    test('escolher um item fecha o menu e clicar fora também', async ({ page }) => {
      const bloco = await abrirExemplo(page, '/componentes/dropdown', 'Menu de ações', camada);
      const gatilho = bloco.getByRole('button', { name: 'Ações do pedido' });
      const editar = page.getByRole('button', { name: 'Editar pedido' });

      await gatilho.click();
      await editar.click();
      await expect(editar).toBeHidden();

      await gatilho.click();
      await expect(editar).toBeVisible();
      await page.getByRole('heading', { level: 1 }).click();
      await expect(editar).toBeHidden();
    });

    test('item indisponível fica com aria-disabled', async ({ page }) => {
      const bloco = await abrirExemplo(page, '/componentes/dropdown', 'Menu de ações', camada);
      await bloco.getByRole('button', { name: 'Ações do pedido' }).click();
      await expect(page.getByRole('button', { name: /Duplicar/ })).toHaveAttribute(
        'aria-disabled',
        'true',
      );
    });
  });
}
