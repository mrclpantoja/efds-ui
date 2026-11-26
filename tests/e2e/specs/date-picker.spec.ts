import { expect, test } from '@playwright/test';
import { abrirExemplo, camadas } from '../support/docs.ts';

/** Data fixa: o calendário abre no mês de "hoje", e o teste não pode depender do relógio real. */
const HOJE = new Date('2026-03-15T12:00:00-03:00');

for (const camada of camadas) {
  test.describe(`DatePicker (${camada})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.clock.setFixedTime(HOJE);
    });

    test('abre a grade no dia de hoje, navega com setas/PageDown e escolhe com Enter', async ({
      page,
    }) => {
      const bloco = await abrirExemplo(page, '/componentes/date-picker', 'Básico', camada);
      const campo = bloco.getByRole('textbox', { name: 'Vencimento' });
      const gatilho = bloco.getByRole('button', { name: /Escolher data/ });

      await gatilho.click();
      const calendario = page.getByRole('dialog', { name: 'Escolher data' });
      await expect(calendario).toBeVisible();
      await expect(gatilho).toHaveAttribute('aria-expanded', 'true');

      // O foco entra no dia de hoje (aria-current="date"), dentro da grade.
      const hoje = calendario.locator('[data-date="2026-03-15"]');
      await expect(hoje).toBeFocused();
      await expect(hoje).toHaveAttribute('aria-current', 'date');

      await page.keyboard.press('ArrowRight');
      await expect(calendario.locator('[data-date="2026-03-16"]')).toBeFocused();
      await page.keyboard.press('ArrowDown');
      await expect(calendario.locator('[data-date="2026-03-23"]')).toBeFocused();

      // PageDown vai ao mês seguinte, mantendo o dia.
      await page.keyboard.press('PageDown');
      await expect(calendario.locator('[data-date="2026-04-23"]')).toBeFocused();
      await expect(calendario.getByRole('heading', { name: 'abril de 2026' })).toBeVisible();

      await page.keyboard.press('Enter');
      await expect(calendario).toBeHidden();
      await expect(campo).toHaveValue('23/04/2026');
      await expect(gatilho).toHaveAccessibleName(/Atual: 23\/04\/2026/);
      await expect(gatilho).toBeFocused();
    });

    test('Esc fecha o calendário sem alterar o valor e devolve o foco ao botão', async ({
      page,
    }) => {
      const bloco = await abrirExemplo(page, '/componentes/date-picker', 'Básico', camada);
      const campo = bloco.getByRole('textbox', { name: 'Vencimento' });
      const gatilho = bloco.getByRole('button', { name: /Escolher data/ });

      await gatilho.click();
      const calendario = page.getByRole('dialog', { name: 'Escolher data' });
      await expect(calendario).toBeVisible();
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('Escape');

      await expect(calendario).toBeHidden();
      await expect(campo).toHaveValue('');
      await expect(gatilho).toBeFocused();
    });

    test('digitar aplica a máscara dd/mm/aaaa e o botão passa a citar o valor', async ({
      page,
    }) => {
      const bloco = await abrirExemplo(page, '/componentes/date-picker', 'Básico', camada);
      const campo = bloco.getByRole('textbox', { name: 'Vencimento' });
      await campo.click();
      await campo.pressSequentially('15032026');
      await expect(campo).toHaveValue('15/03/2026');
      await campo.blur();
      await expect(bloco.getByRole('button', { name: /Escolher data/ })).toHaveAccessibleName(
        /Atual: 15\/03\/2026/,
      );
    });
  });
}
