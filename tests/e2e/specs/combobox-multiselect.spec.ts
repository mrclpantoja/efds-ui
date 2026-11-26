import { expect, test } from '@playwright/test';
import { abrirExemplo, camadas } from '../support/docs.ts';

for (const camada of camadas) {
  test.describe(`Combobox (${camada})`, () => {
    test('filtra ao digitar, navega com setas e escolhe com Enter', async ({ page }) => {
      const bloco = await abrirExemplo(page, '/componentes/combobox', 'Lista local', camada);
      const campo = bloco.getByRole('combobox', { name: 'Cidade' });

      await campo.click();
      await campo.fill('pe');
      await expect(campo).toHaveAttribute('aria-expanded', 'true');
      await expect(page.getByRole('option', { name: 'Pelotas' })).toBeVisible();
      await expect(page.getByRole('option', { name: 'Porto Alegre' })).toBeHidden();

      await page.keyboard.press('ArrowDown');
      await expect(campo).toHaveAttribute('aria-activedescendant', /.+/);
      await page.keyboard.press('Enter');

      await expect(campo).toHaveValue('Pelotas');
      await expect(campo).toHaveAttribute('aria-expanded', 'false');
      await expect(page.getByRole('listbox')).toBeHidden();
    });

    test('abre a lista com a seta, ignora a opção indisponível e fecha com Esc', async ({
      page,
    }) => {
      const bloco = await abrirExemplo(page, '/componentes/combobox', 'Lista local', camada);
      const campo = bloco.getByRole('combobox', { name: 'Cidade' });

      await campo.focus();
      await page.keyboard.press('ArrowDown');
      await expect(page.getByRole('listbox', { name: 'Cidade' })).toBeVisible();
      await expect(page.getByRole('option', { name: /Potiraguá/ })).toHaveAttribute(
        'aria-disabled',
        'true',
      );

      // Percorre a lista inteira (e volta ao início): a opção indisponível nunca fica ativa.
      for (let i = 0; i < 6; i += 1) {
        await page.keyboard.press('ArrowDown');
        const ativa = await campo.getAttribute('aria-activedescendant');
        expect(ativa).toBeTruthy();
        await expect(page.locator(`[id="${ativa}"]`)).not.toHaveAttribute('aria-disabled', 'true');
      }

      await campo.fill('');
      await page.keyboard.press('ArrowDown');
      await expect(campo).toHaveAttribute('aria-expanded', 'true');
      await page.keyboard.press('Escape');
      await expect(campo).toHaveAttribute('aria-expanded', 'false');
      await expect(campo).toBeFocused();
    });

    test('texto sem correspondência mostra "Nenhum resultado"', async ({ page }) => {
      const bloco = await abrirExemplo(page, '/componentes/combobox', 'Lista local', camada);
      const campo = bloco.getByRole('combobox', { name: 'Cidade' });
      await campo.fill('zzz');
      await expect(bloco.getByText('Nenhum resultado')).toBeVisible();
    });
  });

  test.describe(`MultiSelect (${camada})`, () => {
    // O exemplo React já nasce com uma cidade escolhida (defaultValue); o HTML, sem nenhuma.
    // Os cenários contam a diferença em relação ao início.
    test('escolhe várias opções pelo teclado, mostra etiquetas e remove com Backspace', async ({
      page,
    }) => {
      const bloco = await abrirExemplo(page, '/componentes/multi-select', 'Lista local', camada);
      const campo = bloco.getByRole('combobox', { name: 'Cidades atendidas' });
      const etiquetas = bloco.locator('.eds-combobox-tags > li');
      const inicio = await etiquetas.count();
      const escolhidas = bloco.getByRole('option', { selected: true });

      await campo.focus();
      await page.keyboard.press('ArrowDown');
      await expect(campo).toHaveAttribute('aria-expanded', 'true');
      // Escolhe duas opções ainda não escolhidas; a lista continua aberta entre elas.
      for (let feitas = 0; feitas < 2;) {
        await page.keyboard.press('ArrowDown');
        const ativa = await campo.getAttribute('aria-activedescendant');
        const marcada = await page.locator(`[id="${ativa}"]`).getAttribute('aria-selected');
        if (marcada === 'true') continue;
        await page.keyboard.press('Enter');
        feitas += 1;
        await expect(etiquetas).toHaveCount(inicio + feitas);
        await expect(campo).toHaveAttribute('aria-expanded', 'true');
      }
      await expect(escolhidas).toHaveCount(inicio + 2);

      await page.keyboard.press('Escape');
      await expect(campo).toHaveAttribute('aria-expanded', 'false');

      await page.keyboard.press('Backspace');
      await expect(etiquetas).toHaveCount(inicio + 1);
    });

    test('filtrar e escolher com Enter acrescenta a etiqueta e limpa o texto digitado', async ({
      page,
    }) => {
      const bloco = await abrirExemplo(page, '/componentes/multi-select', 'Lista local', camada);
      const campo = bloco.getByRole('combobox', { name: 'Cidades atendidas' });
      const etiquetas = bloco.locator('.eds-combobox-tags > li');
      const inicio = await etiquetas.count();

      await campo.fill('santa');
      await expect(bloco.getByRole('option', { name: 'Santa Maria' })).toBeVisible();
      await expect(bloco.getByRole('option', { name: 'Pelotas' })).toBeHidden();
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      await expect(etiquetas).toHaveCount(inicio + 1);
      await expect(etiquetas.filter({ hasText: 'Santa Maria' })).toHaveCount(1);
      await expect(campo).toHaveValue('');
    });
  });
}
