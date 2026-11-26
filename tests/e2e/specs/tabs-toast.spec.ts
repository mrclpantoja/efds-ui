import { expect, test } from '@playwright/test';
import { abrirExemplo, camadas } from '../support/docs.ts';

for (const camada of camadas) {
  test.describe(`Tabs (${camada})`, () => {
    test('setas movem a seleção, Home/End vão às pontas e o painel acompanha', async ({ page }) => {
      const bloco = await abrirExemplo(page, '/componentes/tabs', 'Básico', camada);
      const lista = bloco.getByRole('tablist', { name: 'Seções do pedido' });
      const resumo = lista.getByRole('tab', { name: 'Resumo' });
      const itens = lista.getByRole('tab', { name: 'Itens' });
      const historico = lista.getByRole('tab', { name: 'Histórico' });

      await expect(resumo).toHaveAttribute('aria-selected', 'true');
      // Só a aba selecionada está na sequência do Tab (roving tabindex).
      await expect(resumo).toHaveAttribute('tabindex', '0');
      await expect(itens).toHaveAttribute('tabindex', '-1');

      await resumo.focus();
      await page.keyboard.press('ArrowRight');
      await expect(itens).toBeFocused();
      await expect(itens).toHaveAttribute('aria-selected', 'true');
      await expect(bloco.getByRole('tabpanel', { name: 'Itens' })).toBeVisible();
      await expect(bloco.getByText('Caderno A5, caneta azul')).toBeVisible();

      await page.keyboard.press('ArrowRight');
      await expect(historico).toBeFocused();
      await expect(historico).toHaveAttribute('aria-selected', 'true');

      await page.keyboard.press('Home');
      await expect(resumo).toBeFocused();
      await expect(resumo).toHaveAttribute('aria-selected', 'true');

      await page.keyboard.press('End');
      await expect(lista.getByRole('tab').last()).toBeFocused();
    });

    test('aba indisponível é alcançada pelas setas, mas não é ativada', async ({ page }) => {
      // O HTML tem a aba Anexos no exemplo "Básico"; o React, num exemplo à parte.
      const [titulo, lista, primeira] =
        camada === 'html'
          ? (['Básico', 'Seções do pedido', 'Resumo'] as const)
          : (['Aba indisponível', 'Seções do cadastro', 'Dados'] as const);
      const bloco = await abrirExemplo(page, '/componentes/tabs', titulo, camada);
      const tablist = bloco.getByRole('tablist', { name: lista });
      const anexos = tablist.getByRole('tab', { name: 'Anexos' });

      await tablist.getByRole('tab', { name: primeira }).focus();
      await page.keyboard.press('ArrowLeft');
      await expect(anexos).toBeFocused();
      await expect(anexos).toHaveAttribute('aria-disabled', 'true');
      await expect(anexos).toHaveAttribute('aria-selected', 'false');
      await expect(tablist.getByRole('tab', { name: primeira })).toHaveAttribute(
        'aria-selected',
        'true',
      );
    });
  });

  test.describe(`Toast (${camada})`, () => {
    test('mostra o toast numa região viva e fecha pelo botão', async ({ page }) => {
      const bloco = await abrirExemplo(page, '/componentes/toast', 'Disparar toasts', camada);
      await bloco.getByRole('button', { name: 'Sucesso' }).click();

      const toast = page.locator('.eds-toast', { hasText: 'O contrato foi assinado e arquivado.' });
      await expect(toast).toBeVisible();
      // O toast mora numa região com aria-live.
      await expect(page.locator('[aria-live]:has(.eds-toast)')).toHaveCount(1);

      await toast.getByRole('button', { name: /Fechar/ }).click();
      await expect(toast).toBeHidden();
    });

    test('toast de erro permanece até ser fechado', async ({ page }) => {
      const bloco = await abrirExemplo(page, '/componentes/toast', 'Disparar toasts', camada);
      await bloco.getByRole('button', { name: 'Erro', exact: true }).click();
      const toast = page.locator('.eds-toast', {
        hasText: 'Não foi possível enviar a nota fiscal.',
      });
      await expect(toast).toBeVisible();
      await toast.getByRole('button', { name: /Fechar/ }).click();
      await expect(toast).toBeHidden();
    });
  });
}

test.describe('Toast com ação (HTML)', () => {
  test('Desfazer fecha o toast e dispara o toast de restauração', async ({ page }) => {
    const bloco = await abrirExemplo(page, '/componentes/toast', 'Com ação (Desfazer)', 'html');
    await bloco.getByRole('button', { name: 'Excluir pedido' }).click();
    const excluido = page.locator('.eds-toast', { hasText: 'Pedido PED-0001 excluído.' });
    await expect(excluido).toBeVisible();
    await excluido.getByRole('button', { name: 'Desfazer' }).click();
    await expect(excluido).toBeHidden();
    await expect(
      page.locator('.eds-toast', { hasText: 'Pedido PED-0001 restaurado.' }),
    ).toBeVisible();
  });
});
