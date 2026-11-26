import { expect, test } from '@playwright/test';
import { abrir, abrirExemplo, camadas } from '../support/docs.ts';

for (const camada of camadas) {
  test.describe(`PageLoader (${camada})`, () => {
    test('bloqueia a página com um diálogo modal enquanto a promessa não termina', async ({
      page,
    }) => {
      const bloco = await abrirExemplo(
        page,
        '/componentes/page-loader',
        'Disparo manual com track()',
        camada,
      );
      await bloco.getByRole('button', { name: /Buscar processo/ }).click();

      // Atraso de 300 ms antes de aparecer (evita piscar em respostas rápidas).
      const carregando = page.getByRole('dialog', { name: /Buscando processo/ });
      await expect(carregando).toBeVisible();
      await expect(carregando).toContainText('Aguarde um instante.');

      // O Esc não cancela uma operação em andamento.
      await page.keyboard.press('Escape');
      await expect(carregando).toBeVisible();

      // Ao terminar (2,5 s no exemplo), o diálogo some e a página volta a ser operável.
      await expect(carregando).toBeHidden({ timeout: 15_000 });
      await expect(bloco.getByRole('button', { name: /Buscar processo/ })).toBeEnabled();
    });
  });
}

test.describe('Sidebar off-canvas no celular (docs, React)', () => {
  test.use({ viewport: { width: 375, height: 800 } });

  test('abre pelo botão do cabeçalho, mostra "Fechar menu" e devolve o foco ao gatilho', async ({
    page,
  }) => {
    await abrir(page, '/componentes/modal');
    const gatilho = page.getByRole('button', { name: 'Abrir navegação' });
    const menu = page.getByRole('navigation', { name: 'Documentação' });

    await expect(menu).toBeHidden();
    await gatilho.click();
    await expect(menu).toBeVisible();

    const fechar = menu.getByRole('button', { name: 'Fechar menu' });
    await expect(fechar).toBeVisible();
    await fechar.click();
    await expect(menu).toBeHidden();
    await expect(gatilho).toBeFocused();
  });

  test('Esc também fecha e devolve o foco; escolher um link navega e fecha o menu', async ({
    page,
  }) => {
    await abrir(page, '/componentes/modal');
    const gatilho = page.getByRole('button', { name: 'Abrir navegação' });
    const menu = page.getByRole('navigation', { name: 'Documentação' });

    await gatilho.click();
    await expect(menu).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(gatilho).toBeFocused();

    await gatilho.click();
    await menu.getByRole('link', { name: 'Drawer', exact: true }).click();
    await expect(page).toHaveURL(/\/componentes\/drawer$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Drawer' })).toBeVisible();
    await expect(menu).toBeHidden();
  });
});

test.describe('Sidebar off-canvas no celular (HTML + behavior)', () => {
  test.use({ viewport: { width: 375, height: 800 } });

  test('o shell em HTML abre, mostra "Fechar menu" e devolve o foco ao gatilho', async ({
    page,
    request,
  }) => {
    // A demonstração vem de `pnpm site:build` (templates:vendor + templates:site).
    const resposta = await request.get('/demos/painel/html/');
    test.skip(!resposta.ok(), 'demonstração do template Painel ausente em apps/docs/dist/demos');

    await page.goto('/demos/painel/html/');
    await page.waitForFunction(() => !!(window as unknown as { EDS?: unknown }).EDS);
    const gatilho = page.getByRole('button', { name: 'Abrir navegação' });
    const menu = page.getByRole('navigation', { name: 'Principal' });

    await expect(menu).toBeHidden();
    await gatilho.click();
    await expect(menu).toBeVisible();
    await expect(gatilho).toHaveAttribute('aria-expanded', 'true');

    await menu.getByRole('button', { name: 'Fechar menu' }).click();
    await expect(menu).toBeHidden();
    await expect(gatilho).toBeFocused();
    await expect(gatilho).toHaveAttribute('aria-expanded', 'false');

    await gatilho.click();
    await expect(menu).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(gatilho).toBeFocused();
  });
});

test.describe('Sidebar no desktop (docs, React)', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('fica fixa na tela, sem botão de abrir e sem "Fechar menu" visível', async ({ page }) => {
    await abrir(page, '/componentes/modal');
    const menu = page.getByRole('navigation', { name: 'Documentação' });
    await expect(menu).toBeVisible();
    await expect(menu.getByRole('button', { name: 'Fechar menu' })).toBeHidden();
    await expect(page.getByRole('button', { name: 'Abrir navegação' })).toBeHidden();
    await expect(menu.getByRole('link', { name: 'Modal', exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});
