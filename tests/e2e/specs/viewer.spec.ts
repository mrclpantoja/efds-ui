import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { abrirExemplo, camadas, focoPresoEm } from '../support/docs.ts';

/**
 * Visualizador de arquivos. Os arquivos são fictícios, gerados em `apps/docs/public/arquivos/`.
 * O PDF só é embutido onde o navegador tem leitor; os cenários conferem os dois casos.
 */
const ROTA = '/componentes/file-viewer';
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

const visualizador = (page: Page): Locator => page.locator('dialog.eds-viewer');
const palco = (page: Page): Locator => page.locator('dialog.eds-viewer .eds-viewer-stage');
const titulo = (page: Page): Locator => page.locator('dialog.eds-viewer .eds-viewer-title');

/** Abre um anexo do primeiro exemplo (link no HTML, botão no React) e devolve o gatilho. */
async function abrirAnexo(
  page: Page,
  camada: (typeof camadas)[number],
  rotulo: string,
): Promise<Locator> {
  const area = await abrirExemplo(page, ROTA, 'Anexos do processo', camada);
  const gatilho = area.getByRole(camada === 'html' ? 'link' : 'button', {
    name: rotulo,
    exact: true,
  });
  await gatilho.click();
  await expect(visualizador(page)).toBeVisible();
  return gatilho;
}

/** Espera o arquivo sair do carregamento (pronto ou aviso). */
async function aguardarPalco(page: Page): Promise<string> {
  await expect(palco(page)).not.toHaveAttribute('data-state', 'loading');
  return (await palco(page).getAttribute('data-state')) ?? '';
}

for (const camada of camadas) {
  test.describe(`Visualizador de arquivos (${camada})`, () => {
    test('abre o PDF, nomeia o diálogo pelo arquivo e prende o foco', async ({ page }) => {
      await abrirAnexo(page, camada, 'Relatório (PDF)');
      const dialogo = page.getByRole('dialog', { name: 'Relatório de vistoria.pdf' });
      await expect(dialogo).toBeVisible();
      await expect(dialogo).toHaveAttribute('data-mode', 'dark');
      await expect(dialogo.locator('.eds-viewer-position')).toHaveText('1 de 6');
      await expect(dialogo.getByRole('button', { name: 'Fechar' })).toBeFocused();
      await expect(dialogo.getByRole('button', { name: 'Anterior' })).toBeDisabled();

      const embutido = await page.evaluate(() => navigator.pdfViewerEnabled !== false);
      if (embutido) {
        await expect(dialogo.locator('iframe[title="Relatório de vistoria.pdf"]')).toBeAttached();
      } else {
        await expect(palco(page)).toHaveAttribute('data-state', 'unsupported');
        await expect(dialogo.getByRole('heading', { name: 'Sem pré-visualização' })).toBeVisible();
      }

      for (let i = 0; i < 12; i += 1) {
        await page.keyboard.press('Tab');
        expect(await focoPresoEm(page, 'dialog.eds-viewer')).toBe(true);
      }
    });

    test('percorre os seis tipos com o teclado e mostra cada um do jeito certo', async ({
      page,
    }) => {
      await abrirAnexo(page, camada, 'Relatório (PDF)');
      const dialogo = visualizador(page);
      await page.keyboard.press('ArrowRight');
      await expect(titulo(page)).toHaveText('Foto da obra.jpg');
      await expect(dialogo.getByRole('img', { name: 'Foto da obra.jpg' })).toBeVisible();
      expect(await aguardarPalco(page)).toBe('ready');
      await expect(dialogo.locator('[role="status"]')).toContainText(
        'Arquivo 2 de 6: Foto da obra.jpg.',
      );

      await page.keyboard.press('ArrowRight');
      await expect(titulo(page)).toHaveText('Vídeo da vistoria.webm');
      await expect(dialogo.locator('video[controls]')).toBeAttached();
      expect(await aguardarPalco(page)).toBe('ready');

      await page.keyboard.press('ArrowRight');
      await expect(titulo(page)).toHaveText('Áudio da reunião.wav');
      await expect(dialogo.locator('audio[controls]')).toBeAttached();

      await page.keyboard.press('ArrowRight');
      await expect(titulo(page)).toHaveText('Resumo da vistoria.txt');
      const texto = dialogo.getByRole('region', { name: 'Resumo da vistoria.txt' });
      await expect(texto).toContainText('RESUMO DA VISTORIA');
      // Tags no arquivo aparecem como texto, nunca viram elementos.
      await expect(texto).toContainText('<b>isto não é negrito</b>');
      await expect(texto.locator('b')).toHaveCount(0);

      await page.keyboard.press('ArrowRight');
      await expect(titulo(page)).toHaveText('Pacote de documentos.zip');
      await expect(palco(page)).toHaveAttribute('data-state', 'unsupported');
      await expect(dialogo.getByRole('heading', { name: 'Sem pré-visualização' })).toBeVisible();
      await expect(palco(page).getByRole('link', { name: 'Baixar' })).toHaveAttribute(
        'href',
        '/arquivos/pacote-ficticio.zip',
      );
      await expect(dialogo.getByRole('button', { name: 'Próximo' })).toBeDisabled();

      await page.keyboard.press('Home');
      await expect(titulo(page)).toHaveText('Relatório de vistoria.pdf');
    });

    test('com o foco no vídeo as setas ficam para ele; Esc fecha e devolve o foco ao gatilho', async ({
      page,
    }) => {
      const gatilho = await abrirAnexo(page, camada, 'Vídeo');
      const dialogo = visualizador(page);
      await expect(titulo(page)).toHaveText('Vídeo da vistoria.webm');
      await dialogo.locator('video').focus();
      await page.keyboard.press('ArrowRight');
      await expect(titulo(page)).toHaveText('Vídeo da vistoria.webm');

      await page.keyboard.press('Escape');
      await expect(dialogo).toBeHidden();
      await expect(gatilho).toBeFocused();
    });

    test('o clique no fundo não fecha o diálogo', async ({ page }) => {
      await abrirAnexo(page, camada, 'Foto da obra');
      await page.mouse.click(2, 2);
      await expect(visualizador(page)).toBeVisible();
    });

    test('falha ao carregar mostra o erro com Tentar de novo, Baixar e Abrir em nova aba', async ({
      page,
    }) => {
      await page.route('**/arquivos/foto-obra.jpg', (rota) => rota.abort());
      await abrirAnexo(page, camada, 'Foto da obra');
      await expect(palco(page)).toHaveAttribute('data-state', 'error');
      const dialogo = visualizador(page);
      await expect(dialogo.getByText('Não foi possível abrir o arquivo')).toBeVisible();
      await expect(palco(page).getByRole('link', { name: 'Baixar' })).toBeVisible();
      await expect(palco(page).getByRole('link', { name: 'Abrir em nova aba' })).toHaveAttribute(
        'target',
        '_blank',
      );

      await page.unroute('**/arquivos/foto-obra.jpg');
      await palco(page).getByRole('button', { name: 'Tentar de novo' }).click();
      await expect(palco(page)).toHaveAttribute('data-state', 'ready');
      await expect(dialogo.getByRole('img', { name: 'Foto da obra.jpg' })).toBeVisible();
    });
  });

  test.describe(`Visualizador: imagem (${camada})`, () => {
    test('um arquivo só não tem navegação; zoom, giro, ajuste e arrasto funcionam por teclado e ponteiro', async ({
      page,
    }) => {
      const area = await abrirExemplo(page, ROTA, 'Imagem com zoom e giro', camada);
      await area
        .getByRole(camada === 'html' ? 'link' : 'button', { name: 'Ver fachada norte' })
        .click();
      const dialogo = visualizador(page);
      await expect(dialogo).toBeVisible();
      await expect(dialogo.getByRole('button', { name: 'Próximo' })).toHaveCount(0);
      await expect(dialogo.locator('.eds-viewer-position')).toBeHidden();
      await expect(palco(page)).toHaveAttribute('data-state', 'ready');
      const zoom = () => palco(page).evaluate((el) => el.style.getPropertyValue('--_viewer-zoom'));

      await page.keyboard.press('+');
      await expect.poll(zoom).toBe('1.5');
      await expect(palco(page)).toHaveAttribute('data-zoomed', '');
      await expect(dialogo.locator('[role="status"]')).toContainText('Zoom');

      await page.keyboard.press('r');
      await expect(palco(page)).toHaveAttribute('data-rotated', '');
      await expect(dialogo.locator('[role="status"]')).toContainText('Girada 90 graus.');

      await page.keyboard.press('0');
      await expect.poll(zoom).toBe('1');
      await expect(palco(page)).not.toHaveAttribute('data-zoomed', '');
      await expect(palco(page)).not.toHaveAttribute('data-rotated', '');

      // Ampliada, a imagem se move com Shift e setas e com o arrasto.
      await page.keyboard.press('+');
      await page.keyboard.press('+');
      const x = () => palco(page).evaluate((el) => el.style.getPropertyValue('--_viewer-x'));
      await page.keyboard.press('Shift+ArrowRight');
      await expect.poll(x).toBe('40px');
      const caixa = await dialogo.locator('.eds-viewer-image').boundingBox();
      expect(caixa).not.toBeNull();
      if (caixa) {
        const cx = caixa.x + caixa.width / 2;
        const cy = caixa.y + caixa.height / 2;
        await page.mouse.move(cx, cy);
        await page.mouse.down();
        await page.mouse.move(cx - 30, cy - 10, { steps: 4 });
        await page.mouse.up();
        await expect.poll(x).toBe('10px');
      }

      await dialogo.getByRole('button', { name: 'Ajustar à tela' }).click();
      await expect.poll(zoom).toBe('1');
      await expect.poll(x).toBe('0px');

      await dialogo.getByRole('button', { name: 'Tamanho real' }).click();
      await expect(palco(page)).toHaveAttribute('data-zoomed', '');
    });
  });
}

test.describe('Visualizador: ações do autor (React)', () => {
  test('o espaço do rodapé recebe Aprovar e Recusar para o arquivo mostrado', async ({ page }) => {
    const area = await abrirExemplo(page, ROTA, 'Ações do autor no rodapé', 'react');
    await area.getByRole('button', { name: 'Revisar anexos' }).click();
    const dialogo = visualizador(page);
    await dialogo.getByRole('button', { name: 'Aprovar' }).click();
    await page.keyboard.press('ArrowRight');
    await dialogo.getByRole('button', { name: 'Recusar' }).click();
    await dialogo.getByRole('button', { name: 'Fechar' }).click();
    await expect(dialogo).toBeHidden();
    await expect(area).toContainText('Relatório de vistoria.pdf: aprovado');
    await expect(area).toContainText('Foto da obra.jpg: recusado');
  });
});

test.describe('Visualizador: layout e acessibilidade', () => {
  test('a 375 px ocupa a tela toda, sem rolagem lateral, e o cabeçalho não transborda', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 700 });
    await abrirAnexo(page, 'html', 'Foto da obra');
    const caixa = await visualizador(page).boundingBox();
    expect(caixa).toMatchObject({ x: 0, y: 0, width: 375 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      375,
    );
    const cabecalho = await page.locator('dialog.eds-viewer .eds-viewer-header').evaluate((el) => ({
      cabe: el.scrollWidth <= el.clientWidth,
    }));
    expect(cabecalho.cabe).toBe(true);
    await expect(visualizador(page).getByRole('button', { name: 'Próximo' })).toBeVisible();
  });

  for (const modo of ['light', 'dark'] as const) {
    test(`axe-core com o visualizador aberto (${modo})`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await abrirAnexo(page, 'html', 'Foto da obra');
      await page.evaluate((m) => document.documentElement.setAttribute('data-mode', m), modo);
      await expect(palco(page)).toHaveAttribute('data-state', 'ready');
      const resultado = await new AxeBuilder({ page })
        .withTags(TAGS)
        .include('dialog.eds-viewer')
        .analyze();
      expect(
        resultado.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' '))}`),
      ).toEqual([]);
    });
  }
});
