import { expect, test, type Page } from '@playwright/test';
import { abrirExemplo, camadas, textos } from '../support/docs.ts';

/** Rótulo do nó com foco (o `.eds-tree-label` é o contrato de markup da árvore). */
async function rotuloFocado(page: Page): Promise<string> {
  return page.evaluate(
    () =>
      document.activeElement?.querySelector(':scope > .eds-tree-row .eds-tree-label')
        ?.textContent ?? '',
  );
}

for (const camada of camadas) {
  test.describe(`Tree (${camada})`, () => {
    test('teclado APG: setas percorrem, expandem e recolhem; Home e End vão às pontas', async ({
      page,
    }) => {
      const bloco = await abrirExemplo(page, '/componentes/tree', 'Árvore estática', camada);
      const arvore = bloco.getByRole('tree');
      const itens = arvore.getByRole('treeitem');

      // Roving tabindex: um único nó na sequência do Tab.
      await expect(arvore.locator('[role="treeitem"][tabindex="0"]')).toHaveCount(1);

      await itens.first().focus();
      expect(await rotuloFocado(page)).toBe('Diretoria Fictícia');

      await page.keyboard.press('ArrowDown');
      expect(await rotuloFocado(page)).toBe('Sede Modelo');

      // Nó aberto: Seta para a direita desce ao primeiro filho.
      await page.keyboard.press('ArrowRight');
      expect(await rotuloFocado(page)).toBe('Financeiro de Exemplo');

      // Folha: Seta para a esquerda sobe ao pai.
      await page.keyboard.press('ArrowLeft');
      expect(await rotuloFocado(page)).toBe('Sede Modelo');

      // Nó aberto: Seta para a esquerda recolhe, e os filhos somem da árvore acessível.
      await page.keyboard.press('ArrowLeft');
      await expect(arvore.getByRole('treeitem', { name: 'Sede Modelo' })).toHaveAttribute(
        'aria-expanded',
        'false',
      );
      await expect(arvore.getByRole('treeitem', { name: 'Compras' })).toBeHidden();

      // Nó fechado: Seta para a direita expande, sem mover o foco.
      await page.keyboard.press('ArrowRight');
      await expect(arvore.getByRole('treeitem', { name: 'Compras' })).toBeVisible();
      expect(await rotuloFocado(page)).toBe('Sede Modelo');

      await page.keyboard.press('End');
      expect(await rotuloFocado(page)).toBe('Conselho Consultivo');
      await page.keyboard.press('Home');
      expect(await rotuloFocado(page)).toBe('Diretoria Fictícia');
    });

    test('Espaço seleciona o nó e aria-level/setsize descrevem a hierarquia', async ({ page }) => {
      const bloco = await abrirExemplo(page, '/componentes/tree', 'Árvore estática', camada);
      const arvore = bloco.getByRole('tree');
      const financeiro = arvore.getByRole('treeitem', { name: 'Financeiro de Exemplo' });

      await expect(financeiro).toHaveAttribute('aria-level', '3');
      await expect(financeiro).toHaveAttribute('aria-setsize', '2');
      await expect(financeiro).toHaveAttribute('aria-posinset', '1');

      await financeiro.focus();
      await page.keyboard.press('Space');
      await expect(financeiro).toHaveAttribute('aria-selected', 'true');
    });
  });

  test.describe(`Sortable (${camada})`, () => {
    const ordem = (bloco: ReturnType<Page['locator']>) => textos(bloco.getByRole('listitem'));

    test('Espaço pega, setas movem, Espaço solta e o resultado é anunciado', async ({ page }) => {
      const bloco = await abrirExemplo(
        page,
        '/componentes/sortable',
        'Lista simples (sem pegador)',
        camada,
      );
      const itens = bloco.getByRole('listitem');
      await expect(itens).toHaveCount(4);
      expect(await ordem(bloco)).toEqual([
        'Revisar contrato',
        'Enviar proposta',
        'Agendar reunião',
        'Conciliar extrato',
      ]);

      await itens.first().focus();
      await page.keyboard.press('Space');
      await expect(itens.first()).toHaveAttribute('data-grabbed', '');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Space');

      expect(await ordem(bloco)).toEqual([
        'Enviar proposta',
        'Agendar reunião',
        'Revisar contrato',
        'Conciliar extrato',
      ]);
      await expect(bloco.getByRole('status')).toHaveText(
        'Revisar contrato solto na posição 3 de 4 em Prioridades da semana.',
      );
      // O foco acompanha o item movido.
      await expect(itens.filter({ hasText: 'Revisar contrato' })).toBeFocused();
    });

    test('Esc cancela o movimento e restaura a ordem original', async ({ page }) => {
      const bloco = await abrirExemplo(
        page,
        '/componentes/sortable',
        'Lista simples (sem pegador)',
        camada,
      );
      const itens = bloco.getByRole('listitem');
      await itens.first().focus();
      await page.keyboard.press('Space');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Escape');

      expect(await ordem(bloco)).toEqual([
        'Revisar contrato',
        'Enviar proposta',
        'Agendar reunião',
        'Conciliar extrato',
      ]);
      await expect(itens.first()).not.toHaveAttribute('data-grabbed', '');
    });
  });
}
