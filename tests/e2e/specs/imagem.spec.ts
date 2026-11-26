import { expect, test } from '@playwright/test';
import { abrirExemplo, camadas } from '../support/docs.ts';
import { criarPng } from '../support/png.ts';

for (const camada of camadas) {
  test.describe(`Galeria e visualizador (${camada})`, () => {
    test('abre o visualizador no clique, navega com as setas e devolve o foco ao item', async ({
      page,
    }) => {
      const bloco = await abrirExemplo(
        page,
        '/componentes/gallery',
        'Galeria com legendas',
        camada,
      );
      const miniaturas = bloco.getByRole('link');
      await miniaturas.first().click();

      const visualizador = page.getByRole('dialog', { name: 'Fotos da obra (imagens fictícias)' });
      await expect(visualizador).toBeVisible();
      await expect(visualizador.getByRole('img')).toHaveAttribute(
        'alt',
        'Paisagem azul, fundação concluída',
      );
      await expect(visualizador.locator('.eds-lightbox-caption')).toHaveText('Fundação concluída');
      // Foco inicial no Fechar; sem laço: no primeiro item "anterior" está desabilitado.
      await expect(visualizador.getByRole('button', { name: 'Fechar' })).toBeFocused();
      await expect(visualizador.getByRole('button', { name: 'Imagem anterior' })).toBeDisabled();

      await page.keyboard.press('ArrowRight');
      await expect(visualizador.getByRole('img')).toHaveAttribute(
        'alt',
        'Paisagem laranja, estrutura em andamento',
      );
      await expect(visualizador.locator('.eds-lightbox-caption')).toHaveText(
        'Estrutura em andamento',
      );
      await expect(visualizador.getByRole('status')).toContainText('2 de 4');

      await visualizador.getByRole('button', { name: 'Próxima imagem' }).click();
      await page.keyboard.press('ArrowLeft');
      await expect(visualizador.getByRole('img')).toHaveAttribute(
        'alt',
        'Paisagem laranja, estrutura em andamento',
      );

      await page.keyboard.press('Escape');
      await expect(visualizador).toBeHidden();
      await expect(miniaturas.nth(1)).toBeFocused();
    });
  });

  test.describe(`Cortador de imagem (${camada})`, () => {
    test('escolher uma imagem abre "Ajustar foto" e Aplicar põe um arquivo pronto no campo', async ({
      page,
    }) => {
      const bloco = await abrirExemplo(
        page,
        '/componentes/image-cropper',
        'Foto do perfil',
        camada,
      );
      const campo = bloco.locator('input[type="file"]');
      await campo.setInputFiles({
        name: 'foto-ficticia.png',
        mimeType: 'image/png',
        buffer: criarPng(320, 200),
      });

      const dialogo = page.getByRole('dialog', { name: 'Ajustar foto' });
      await expect(dialogo).toBeVisible();
      await expect(dialogo.getByRole('group', { name: 'Área de corte' })).toBeVisible();

      // Teclado no palco: + amplia (o valor do zoom acompanha).
      const zoom = dialogo.getByRole('slider', { name: 'Zoom' });
      const antes = Number(await zoom.inputValue());
      await dialogo.getByRole('group', { name: 'Área de corte' }).focus();
      await page.keyboard.press('+');
      await expect.poll(async () => Number(await zoom.inputValue())).toBeGreaterThan(antes);

      await dialogo.getByRole('button', { name: 'Aplicar' }).click();
      await expect(dialogo).toBeHidden();

      // O navegador entregou o arquivo recortado: imagem comprimida, não o PNG original.
      const resultado = await campo.evaluate((el) => {
        const arquivo = (el as HTMLInputElement).files?.[0];
        return arquivo ? { tipo: arquivo.type, nome: arquivo.name } : null;
      });
      expect(resultado).not.toBeNull();
      expect(resultado?.tipo).toMatch(/^image\/(webp|jpeg|png)$/);
      expect(resultado?.nome).not.toBe('foto-ficticia.png');
    });

    test('Cancelar fecha o diálogo e deixa o campo sem arquivo', async ({ page }) => {
      const bloco = await abrirExemplo(
        page,
        '/componentes/image-cropper',
        'Foto do perfil',
        camada,
      );
      const campo = bloco.locator('input[type="file"]');
      await campo.setInputFiles({
        name: 'foto-ficticia.png',
        mimeType: 'image/png',
        buffer: criarPng(160, 160),
      });
      const dialogo = page.getByRole('dialog', { name: 'Ajustar foto' });
      await expect(dialogo).toBeVisible();

      await dialogo.getByRole('button', { name: 'Cancelar' }).click();
      await expect(dialogo).toBeHidden();
      expect(await campo.evaluate((el) => (el as HTMLInputElement).files?.length ?? 0)).toBe(0);
    });
  });
}
