import { expect, test } from '@playwright/test';
import { abrirExemplo, camadas } from '../support/docs.ts';

// Dados fictícios: documentos gerados por algoritmo, de ninguém.
const CPF_OK = '529.982.247-25';
const CPF_RUIM = '529.982.247-24';

for (const camada of camadas) {
  test.describe(`Validação de formulários (${camada})`, () => {
    const abrir = (page: import('@playwright/test').Page) =>
      abrirExemplo(page, '/comecar/validacao', 'Formulário com resumo de erros', camada);

    test('envio vazio mostra o resumo, com o foco, e nada é enviado', async ({ page }) => {
      const bloco = await abrir(page);
      await bloco.getByRole('button', { name: 'Cadastrar' }).click();

      const resumo = bloco.locator('.eds-error-summary');
      await expect(resumo).toBeVisible();
      await expect(resumo).toBeFocused();
      await expect(resumo.getByRole('heading', { name: 'Corrija 3 campos' })).toBeVisible();
      await expect(resumo.getByRole('link')).toHaveCount(3);
      await expect(resumo.getByRole('link', { name: 'CPF: preencha este campo.' })).toBeVisible();

      // Erro visível e associado em cada campo (sem balão nativo).
      const cpf = bloco.getByLabel('CPF', { exact: true });
      await expect(cpf).toHaveAttribute('aria-invalid', 'true');
      await expect(cpf).toHaveAccessibleDescription(/Preencha este campo\./);
    });

    test('o link do resumo leva o foco ao campo', async ({ page }) => {
      const bloco = await abrir(page);
      await bloco.getByRole('button', { name: 'Cadastrar' }).click();
      await bloco.locator('.eds-error-summary').getByRole('link', { name: /^CPF:/ }).click();
      await expect(bloco.getByLabel('CPF', { exact: true })).toBeFocused();
    });

    test('corrigir atualiza o resumo e ele some quando zera', async ({ page }) => {
      const bloco = await abrir(page);
      await bloco.getByRole('button', { name: 'Cadastrar' }).click();
      const resumo = bloco.locator('.eds-error-summary');

      await bloco.getByLabel('Nome completo').fill('Maria Exemplo');
      await expect(resumo.getByRole('heading', { name: 'Corrija 2 campos' })).toBeVisible();
      await expect(resumo.getByRole('link', { name: /^Nome completo:/ })).toHaveCount(0);

      await bloco.getByLabel('E-mail institucional').fill('maria@orgao.gov.br');
      await expect(resumo.getByRole('heading', { name: 'Corrija 1 campo' })).toBeVisible();

      await bloco.getByLabel('CPF', { exact: true }).fill(CPF_OK);
      await expect(resumo).toBeHidden();
      await expect(bloco.getByLabel('CPF', { exact: true })).not.toHaveAttribute(
        'aria-invalid',
        'true',
      );
    });

    test('CPF inválido: erro ao sair do campo; válido: o erro some', async ({ page }) => {
      const bloco = await abrir(page);
      const cpf = bloco.getByLabel('CPF', { exact: true });

      // Digitando pela primeira vez, nada de erro.
      await cpf.click();
      await page.keyboard.type(CPF_RUIM);
      await expect(cpf).not.toHaveAttribute('aria-invalid', 'true');

      // Ao sair do campo, o erro aparece, junto do campo.
      await page.keyboard.press('Tab');
      await expect(cpf).toHaveAttribute('aria-invalid', 'true');
      await expect(cpf).toHaveAccessibleDescription(/Informe um CPF válido\./);

      // Corrigir some com o erro, sem sair do campo.
      await cpf.fill(CPF_OK);
      await expect(cpf).not.toHaveAttribute('aria-invalid', 'true');
      await expect(cpf).not.toHaveAccessibleDescription(/Informe um CPF válido/);
    });

    test('mensagem própria do campo e envio com tudo válido', async ({ page }) => {
      const bloco = await abrir(page);
      const email = bloco.getByLabel('E-mail institucional');
      await email.fill('maria@exemplo');
      await page.keyboard.press('Tab');
      await expect(email).toHaveAccessibleDescription(
        'Use o e-mail institucional, como nome@orgao.gov.br.',
      );

      await bloco.getByLabel('Nome completo').fill('Maria Exemplo');
      await bloco.getByLabel('CPF', { exact: true }).fill(CPF_OK);
      await email.fill('maria@orgao.gov.br');
      await bloco.getByRole('button', { name: 'Cadastrar' }).click();
      await expect(bloco.locator('.eds-error-summary')).toBeHidden();
      await expect(bloco.locator('[aria-invalid="true"]')).toHaveCount(0);
    });

    test('o teclado percorre o resumo: Tab do resumo chega ao primeiro link', async ({ page }) => {
      const bloco = await abrir(page);
      await bloco.getByRole('button', { name: 'Cadastrar' }).focus();
      await page.keyboard.press('Enter');
      await expect(bloco.locator('.eds-error-summary')).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(bloco.locator('.eds-error-summary').getByRole('link').first()).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(bloco.getByLabel('Nome completo')).toBeFocused();
    });
  });

  test.describe(`Resumo de erros (${camada})`, () => {
    test('envio recusado leva o foco ao resumo; o título conta os campos', async ({ page }) => {
      const bloco = await abrirExemplo(
        page,
        '/componentes/error-summary',
        'Envio recusado',
        camada,
      );
      await bloco.getByRole('button', { name: 'Enviar mensagem' }).click();
      const resumo = bloco.locator('.eds-error-summary');
      await expect(resumo).toBeFocused();
      await expect(resumo.getByRole('heading', { name: 'Corrija 4 campos' })).toBeVisible();
      await resumo.getByRole('link', { name: /^Assunto:/ }).click();
      await expect(bloco.getByLabel('Assunto')).toBeFocused();
    });

    test('o resumo já visível é lido sem mover o foco da página', async ({ page }) => {
      const bloco = await abrirExemplo(
        page,
        '/componentes/error-summary',
        'Resumo já visível',
        camada,
      );
      await expect(bloco.locator('.eds-error-summary')).toBeVisible();
      await expect(bloco.locator('.eds-error-summary')).not.toBeFocused();
      await expect(bloco.getByRole('link', { name: /^CPF:/ })).toBeVisible();
    });
  });
}
