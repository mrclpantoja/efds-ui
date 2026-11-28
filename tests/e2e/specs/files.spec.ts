import { expect, test, type Locator } from '@playwright/test';
import { abrirExemplo, camadas } from '../support/docs.ts';

/**
 * Gerenciador de arquivos sobre o adaptador em memória da documentação (dados fictícios). Cada
 * cenário roda no HTML (`data-eds-files`) e no React (`<FileManager>`): o markup e o teclado são
 * os mesmos.
 */
const ROTA = '/componentes/files';
const TITULO = 'Gerenciador completo';

const linha = (bloco: Locator, nome: string) =>
  bloco.locator('tbody tr', { has: bloco.page().getByText(nome, { exact: true }) }).first();
const gerenciador = (bloco: Locator) => bloco.locator('.eds-files').first();

for (const camada of camadas) {
  test.describe(`Gerenciador de arquivos (${camada})`, () => {
    test('lista a raiz, navega pela trilha e pela árvore e sobe com Backspace', async ({
      page,
    }) => {
      const bloco = await abrirExemplo(page, ROTA, TITULO, camada);
      await expect(bloco.getByRole('table')).toBeVisible();
      // Sem evaluateAll: o Firefox do Playwright derruba a aba ao ler os textos (ver table.spec.ts).
      await expect(
        bloco.locator('tbody tr .eds-files-label', { hasText: 'Contratos' }),
      ).toHaveCount(1);

      await bloco.getByRole('link', { name: 'Contratos', exact: true }).click();
      await expect(bloco.getByRole('link', { name: 'Contrato social.pdf' })).toBeVisible();
      // O foco vai para o título da pasta depois de navegar.
      await expect(bloco.getByRole('heading', { name: 'Contratos' })).toBeFocused();
      await expect(bloco.getByRole('navigation', { name: 'Local' })).toContainText('Contratos');

      await page.keyboard.press('Backspace');
      await expect(bloco.getByRole('link', { name: 'Imagens', exact: true })).toBeVisible();

      const arvore = bloco.getByRole('tree', { name: 'Pastas' });
      await arvore.getByRole('treeitem', { name: 'Imagens', exact: true }).focus();
      await page.keyboard.press('Enter');
      await expect(bloco.getByRole('link', { name: 'Planta baixa.png' })).toBeVisible();
    });

    test('envia arquivos com progresso, lista os envios e mostra o resultado', async ({ page }) => {
      const bloco = await abrirExemplo(page, ROTA, TITULO, camada);
      await bloco.locator('input[type="file"]').setInputFiles([
        { name: 'recibo-1.txt', mimeType: 'text/plain', buffer: Buffer.from('um') },
        { name: 'recibo-2.txt', mimeType: 'text/plain', buffer: Buffer.from('dois') },
      ]);
      const envios = bloco.locator('.eds-files-upload');
      await expect(envios).toHaveCount(2);
      await expect(bloco.locator('.eds-files-upload[data-status="done"]')).toHaveCount(2);
      await expect(bloco.getByRole('link', { name: 'recibo-2.txt' })).toBeVisible();
      await bloco.getByRole('button', { name: 'Limpar lista de envios' }).click();
      await expect(bloco.locator('.eds-files-uploads')).toBeHidden();
    });

    test('mover por arrastar: item para uma pasta; Ctrl copia', async ({ page }) => {
      const bloco = await abrirExemplo(page, ROTA, TITULO, camada);
      const origem = linha(bloco, 'Leia-me.txt');
      const destino = bloco.getByRole('link', { name: 'Imagens', exact: true });
      await origem.dragTo(destino);
      await expect(bloco.getByRole('link', { name: 'Leia-me.txt' })).toBeHidden();
      await expect(gerenciador(bloco).locator(':scope > [role="status"]')).toContainText(
        '1 item movido para Imagens.',
      );
      await bloco.getByRole('link', { name: 'Imagens', exact: true }).click();
      await expect(bloco.getByRole('link', { name: 'Leia-me.txt' })).toBeVisible();
    });

    test('mover por teclado: recortar, ir à pasta e colar; e por "Mover para…"', async ({
      page,
    }) => {
      const bloco = await abrirExemplo(page, ROTA, TITULO, camada);
      await bloco.getByRole('link', { name: 'Ata da reunião.txt' }).focus();
      await page.keyboard.press('Control+x');
      await expect(linha(bloco, 'Ata da reunião.txt')).toHaveAttribute('data-cut', '');
      await bloco.getByRole('link', { name: 'Notas fiscais', exact: true }).click();
      await expect(bloco.getByRole('link', { name: 'NF-0001.pdf' })).toBeVisible();
      await page.keyboard.press('Control+v');
      await expect(bloco.getByRole('link', { name: 'Ata da reunião.txt' })).toBeVisible();

      // "Mover para…" com escolha da pasta numa árvore
      await bloco.getByRole('button', { name: 'Ações de NF-0001.pdf' }).click();
      await page.getByRole('button', { name: 'Mover para…', exact: true }).click();
      const dialogo = page.getByRole('dialog', { name: 'Mover para…' });
      await dialogo
        .getByRole('treeitem', { name: 'Arquivo morto', exact: true })
        .getByText('Arquivo morto')
        .click();
      await dialogo.getByRole('button', { name: 'Mover para cá' }).click();
      await expect(bloco.getByRole('link', { name: 'NF-0001.pdf' })).toBeHidden();
    });

    test('excluir vai para a lixeira com "Desfazer"; restaurar e esvaziar pela lixeira', async ({
      page,
    }) => {
      const bloco = await abrirExemplo(page, ROTA, TITULO, camada);
      await bloco.getByRole('link', { name: 'Leia-me.txt' }).focus();
      await page.keyboard.press('Delete');
      await expect(bloco.getByRole('link', { name: 'Leia-me.txt' })).toBeHidden();
      await page.getByRole('button', { name: 'Desfazer' }).click();
      await expect(bloco.getByRole('link', { name: 'Leia-me.txt' })).toBeVisible();

      await bloco.getByRole('link', { name: 'Leia-me.txt' }).focus();
      await page.keyboard.press('Delete');
      await expect(bloco.getByRole('link', { name: 'Leia-me.txt' })).toBeHidden();
      await bloco.getByRole('button', { name: 'Lixeira' }).click();
      await expect(bloco.getByRole('heading', { name: 'Lixeira' })).toBeVisible();
      await bloco.getByRole('checkbox', { name: 'Selecionar Leia-me.txt' }).check();
      await bloco.getByRole('button', { name: 'Restaurar' }).click();
      await expect(bloco.getByText('A lixeira está vazia')).toBeVisible();
      await bloco.getByRole('button', { name: 'Voltar aos arquivos' }).click();
      await expect(bloco.getByRole('link', { name: 'Leia-me.txt' })).toBeVisible();
    });

    test('versões: drawer com a lista e restauração', async ({ page }) => {
      const bloco = await abrirExemplo(page, ROTA, TITULO, camada);
      await bloco.getByRole('link', { name: 'Contratos', exact: true }).click();
      await bloco.getByRole('button', { name: 'Ações de Contrato social.pdf' }).click();
      await page.getByRole('button', { name: 'Versões', exact: true }).click();
      const gaveta = page.getByRole('dialog', { name: 'Versões de Contrato social.pdf' });
      await expect(gaveta.getByText('Atual')).toBeVisible();
      await expect(gaveta.getByRole('listitem')).toHaveCount(3);
      await gaveta
        .getByRole('button', { name: /Restaurar esta versão/ })
        .first()
        .click();
      await expect(gaveta).toBeHidden();
    });

    test('abre o arquivo no visualizador e devolve o foco ao fechar', async ({ page }) => {
      const bloco = await abrirExemplo(page, ROTA, TITULO, camada);
      await bloco.getByRole('link', { name: 'Contratos', exact: true }).click();
      await bloco.getByRole('link', { name: 'Contrato social.pdf' }).click();
      const visualizador = page.getByRole('dialog', { name: /Contrato social\.pdf/ });
      await expect(visualizador).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(visualizador).toBeHidden();
    });

    test('conflito de nome ao colar abre o diálogo com "Manter os dois"', async ({ page }) => {
      const bloco = await abrirExemplo(page, ROTA, TITULO, camada);
      await bloco.getByRole('link', { name: 'Notas fiscais', exact: true }).click();
      await bloco.getByRole('link', { name: 'NF-0001.pdf' }).focus();
      await page.keyboard.press('Control+c');
      // Colar na mesma pasta cria "(1)" sem perguntar
      await page.keyboard.press('Control+v');
      await expect(bloco.getByRole('link', { name: 'NF-0001 (1).pdf' })).toBeVisible();
      // Colar em outra pasta onde já existe o nome pergunta
      await bloco.getByRole('link', { name: 'Arquivos', exact: true }).first().click();
      await bloco.getByRole('link', { name: 'Imagens', exact: true }).click();
      await expect(bloco.getByRole('heading', { name: 'Imagens' })).toBeFocused();
      await page.keyboard.press('Control+v');
      await expect(bloco.getByRole('link', { name: 'NF-0001.pdf' })).toBeVisible();
      await page.keyboard.press('Control+v');
      const conflito = page.getByRole('dialog', { name: 'Já existe um item com este nome' });
      await expect(conflito).toBeVisible();
      await conflito.getByRole('button', { name: 'Manter os dois' }).click();
      await expect(bloco.getByRole('link', { name: 'NF-0001 (1).pdf' })).toBeVisible();
    });

    test('contêiner estreito: a árvore vira o painel "Pastas"', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 800 });
      const bloco = await abrirExemplo(page, ROTA, TITULO, camada);
      await expect(bloco.getByRole('tree', { name: 'Pastas' })).toBeHidden();
      await bloco.getByRole('button', { name: 'Pastas', exact: true }).click();
      const gaveta = page.getByRole('dialog', { name: 'Pastas' });
      await gaveta
        .getByRole('treeitem', { name: 'Imagens', exact: true })
        .getByText('Imagens')
        .click();
      await expect(bloco.getByRole('link', { name: 'Planta baixa.png' })).toBeVisible();
      const largura = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(largura).toBeLessThanOrEqual(390);
    });
  });
}
