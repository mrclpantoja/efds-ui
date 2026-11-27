import { expect, test } from '@playwright/test';
import { abrirExemplo, camadas } from '../support/docs.ts';

// Valem depois que a rota /componentes/form-submit estiver registrada em apps/docs/src/routes.tsx.
const ROTA = '/componentes/form-submit';

for (const camada of camadas) {
  test.describe(`Estado de envio (${camada})`, () => {
    test('enviando: aria-busy, o outro botão indisponível, Enter não envia de novo; depois "Salvo" e volta', async ({
      page,
    }) => {
      const bloco = await abrirExemplo(page, ROTA, 'Envio com resultado no botão', camada);
      const salvar = bloco.getByRole('button', { name: 'Salvar', exact: true });
      const rascunho = bloco.getByRole('button', { name: 'Salvar rascunho' });

      await salvar.click();
      await expect(salvar).toHaveAttribute('aria-busy', 'true');
      await expect(rascunho).toHaveAttribute('aria-disabled', 'true');
      // O botão continua focável (sem disabled) e o Enter é ignorado.
      await expect(salvar).toBeEnabled();
      await expect(salvar).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(salvar).toHaveAttribute('aria-busy', 'true');

      const salvo = bloco.getByRole('button', { name: 'Salvo' });
      await expect(salvo).toHaveAttribute('data-state', 'success');
      await expect(salvo).not.toHaveAttribute('aria-busy', 'true');
      await expect(rascunho).not.toHaveAttribute('aria-disabled', 'true');
      await expect(page.getByRole('status').filter({ hasText: 'Salvo' })).toBeAttached();

      // Depois de 2 s o botão volta ao normal.
      await expect(bloco.getByRole('button', { name: 'Salvar', exact: true })).toBeVisible({
        timeout: 5_000,
      });
    });

    test('falha: texto de erro no botão, foco nele e o campo segue editável', async ({ page }) => {
      const bloco = await abrirExemplo(page, ROTA, 'Envio com resultado no botão', camada);
      await bloco.getByRole('checkbox', { name: 'Simular falha no servidor' }).check();
      await bloco.getByRole('button', { name: 'Salvar', exact: true }).click();

      const erro = bloco.getByRole('button', { name: 'Não foi possível salvar' });
      await expect(erro).toHaveAttribute('data-state', 'error');
      await expect(erro).toBeFocused();
      const campo = bloco.getByRole('textbox', { name: /Nome do projeto/ });
      await expect(campo).toBeEditable();
      // A cor não é o único sinal: o texto mudou. Tentar de novo é possível na hora.
      await erro.click();
      await expect(
        bloco.getByRole('button', { name: 'Salvar', exact: true }).or(erro),
      ).toBeVisible();
    });

    test('fetch: 2xx dá "Salvo"; resposta de erro dá "Não foi possível salvar"', async ({
      page,
    }) => {
      await page.route('**/favicon.svg*', (rota) =>
        rota.request().method() === 'POST'
          ? rota.fulfill({ status: 500, body: 'erro' })
          : rota.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg/>' }),
      );
      const bloco = await abrirExemplo(page, ROTA, 'Envio por fetch', camada);

      await bloco.getByRole('button', { name: 'Enviar', exact: true }).click();
      await expect(bloco.getByRole('button', { name: 'Salvo' })).toHaveAttribute(
        'data-state',
        'success',
      );
      await expect(bloco.getByRole('button', { name: 'Enviar', exact: true })).toBeVisible({
        timeout: 5_000,
      });

      await bloco.getByRole('button', { name: 'Enviar e falhar' }).click();
      await expect(bloco.getByRole('button', { name: 'Não foi possível salvar' })).toHaveAttribute(
        'data-state',
        'error',
      );
    });

    test('o PageLoader não bloqueia a página durante o envio', async ({ page }) => {
      const bloco = await abrirExemplo(page, ROTA, 'Envio com resultado no botão', camada);
      await bloco.getByRole('button', { name: 'Salvar', exact: true }).click();
      // Passa do atraso de 300 ms do loader: nenhum diálogo modal aparece.
      await page.waitForTimeout(600);
      await expect(page.locator('dialog[open]')).toHaveCount(0);
    });
  });
}
