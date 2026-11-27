import { expect, test } from '@playwright/test';
import { abrirExemplo, camadas } from '../support/docs.ts';

for (const camada of camadas) {
  test.describe(`Cartão de opção (${camada})`, () => {
    test('rádio: setas movem a escolha; caixa de seleção: Espaço marca', async ({ page }) => {
      const bloco = await abrirExemplo(
        page,
        '/componentes/option-card',
        'Rádio e caixa de seleção',
        camada,
      );
      const pagar = bloco.getByRole('radio', { name: /A pagar/ });
      const receber = bloco.getByRole('radio', { name: /A receber/ });
      await pagar.focus();
      await page.keyboard.press('Space');
      await expect(pagar).toBeChecked();
      await page.keyboard.press('ArrowDown');
      await expect(receber).toBeChecked();
      await expect(receber).toBeFocused();
      // O desabilitado é pulado (voltar ao primeiro ou parar no último varia entre navegadores).
      const transferencia = bloco.getByRole('radio', { name: /Transferência/ });
      await expect(transferencia).toBeDisabled();
      await page.keyboard.press('ArrowDown');
      await expect(transferencia).not.toBeChecked();

      const sms = bloco.getByRole('checkbox', { name: /Mensagem de texto/ });
      await sms.focus();
      await page.keyboard.press('Space');
      await expect(sms).toBeChecked();
      await expect(sms).toHaveAttribute('aria-invalid', 'true');
      await expect(sms).toHaveAccessibleDescription('Escolha ao menos um canal.');
    });

    test('clicar em qualquer parte do cartão escolhe a opção', async ({ page }) => {
      const bloco = await abrirExemplo(
        page,
        '/componentes/option-card',
        'Rádio e caixa de seleção',
        camada,
      );
      await bloco.locator('label.eds-option-card', { hasText: 'A receber' }).click();
      await expect(bloco.getByRole('radio', { name: /A receber/ })).toBeChecked();
    });
  });

  test.describe(`Disco de ícone (${camada})`, () => {
    test('é decorativo e fica visível', async ({ page }) => {
      const bloco = await abrirExemplo(
        page,
        '/componentes/icon-disc',
        'Tons, tamanhos e título de página',
        camada,
      );
      const discos = bloco.locator('.eds-icon-disc');
      await expect(discos).toHaveCount(10);
      await expect(discos.first()).toBeVisible();
      await expect(discos.first().locator('svg')).toHaveAttribute('aria-hidden', 'true');
      await expect(bloco.getByRole('heading', { name: 'Contas a pagar' })).toBeVisible();
    });
  });

  test.describe(`Timeline horizontal (${camada})`, () => {
    test('a lista tem nome, entra na ordem de tabulação e marca o andamento', async ({ page }) => {
      const bloco = await abrirExemplo(
        page,
        '/componentes/timeline',
        'Horizontal, com andamento',
        camada,
      );
      const lista = bloco.getByRole('list', { name: 'Vencimentos do contrato' });
      await expect(lista).toHaveAttribute('tabindex', '0');
      await lista.focus();
      await expect(lista).toBeFocused();
      const itens = lista.locator('.eds-timeline-item');
      await expect(itens).toHaveCount(4);
      await expect(itens.nth(0)).toHaveAttribute('data-state', 'done');
      await expect(itens.nth(2)).toHaveAttribute('data-state', 'current');
      await expect(itens.nth(3)).toHaveAttribute('data-state', 'upcoming');
      // O estado também vai em texto (cor nunca sozinha).
      await expect(itens.nth(0)).toContainText('(paga)');
    });
  });

  test.describe(`Stepper indicador de seções (${camada})`, () => {
    test('o foco vai ao título da seção e a seção lida vira aria-current', async ({ page }) => {
      const bloco = await abrirExemplo(
        page,
        '/componentes/stepper',
        'Indicador de seções de uma página longa',
        camada,
      );
      const link = bloco.getByRole('link', { name: 'Valores' });
      await link.click();
      await expect(bloco.getByRole('group', { name: 'Valores' }).locator('legend')).toBeFocused();
      await expect(link).toHaveAttribute('aria-current', 'step');
    });

    test('conclui a seção ao preencher o obrigatório e anuncia uma vez', async ({ page }) => {
      const bloco = await abrirExemplo(
        page,
        '/componentes/stepper',
        'Indicador de seções de uma página longa',
        camada,
      );
      const item = bloco.locator('.eds-stepper-item').first();
      await expect(item).not.toHaveAttribute('data-state', 'done');
      await bloco.getByRole('textbox', { name: /Fornecedor/ }).fill('Fornecedor Exemplo');
      await expect(item).toHaveAttribute('data-state', 'done');
      await expect(item.getByRole('link')).toContainText('(concluída)');
      await expect(
        page.locator('[role="status"]', { hasText: 'Seção Dados concluída.' }),
      ).toHaveCount(1);
    });

    test('rolar até a seção troca o aria-current sem rolar sozinho', async ({ page }) => {
      const bloco = await abrirExemplo(
        page,
        '/componentes/stepper',
        'Indicador de seções de uma página longa',
        camada,
      );
      const revisao = bloco.getByRole('group', { name: 'Revisão' });
      await revisao.evaluate((el) => {
        const topo = el.getBoundingClientRect().top + window.scrollY - 40;
        window.scrollTo({ top: topo, behavior: 'instant' });
      });
      await expect(bloco.getByRole('link', { name: 'Revisão' })).toHaveAttribute(
        'aria-current',
        'step',
      );
    });
  });

  test.describe(`Lookup: autocompletar (${camada})`, () => {
    test('busca por nome, escolhe com as setas e Enter e mostra a descrição', async ({ page }) => {
      const bloco = await abrirExemplo(
        page,
        '/componentes/lookup',
        'Cliente, com autocompletar e busca em modal',
        camada,
      );
      const campo = bloco.getByRole('combobox', { name: 'Cliente' });
      await campo.click();
      await campo.fill('bore');
      await expect(page.getByRole('option', { name: /Boreal Serviços/ })).toBeVisible();
      await expect(campo).toHaveAttribute('aria-expanded', 'true');
      await page.keyboard.press('ArrowDown');
      await expect(campo).toHaveAttribute('aria-activedescendant', /.+/);
      await page.keyboard.press('Enter');
      await expect(campo).toHaveValue('11');
      await expect(bloco.locator('.eds-lookup-description')).toHaveText('Boreal Serviços');
      await expect(campo).toHaveAttribute('aria-expanded', 'false');
    });

    test('Esc fecha a lista sem apagar o texto; o código continua resolvendo ao sair', async ({
      page,
    }) => {
      const bloco = await abrirExemplo(
        page,
        '/componentes/lookup',
        'Cliente, com autocompletar e busca em modal',
        camada,
      );
      const campo = bloco.getByRole('combobox', { name: 'Cliente' });
      await campo.click();
      await campo.fill('aur');
      await expect(page.getByRole('option', { name: /Aurora/ })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(campo).toHaveAttribute('aria-expanded', 'false');
      await expect(campo).toHaveValue('aur');
      await campo.fill('12');
      await page.keyboard.press('Tab');
      await expect(bloco.locator('.eds-lookup-description')).toHaveText('Cedro Alimentos');
    });

    test('sem resultado oferece Cadastrar novo… e entrega o texto', async ({ page }) => {
      const bloco = await abrirExemplo(page, '/componentes/lookup', 'Cadastrar novo', camada);
      const campo = bloco.getByRole('combobox', { name: 'Cliente' });
      await campo.click();
      await campo.fill('zzz');
      const criar = page.getByRole('option', { name: 'Cadastrar novo…' });
      await expect(criar).toBeVisible();
      if (camada === 'html') {
        await bloco.locator('[data-eds-lookup]').evaluate((raiz) => {
          raiz.addEventListener('eds:lookup-create', (e) => {
            (window as unknown as { criado?: string }).criado = (
              e as CustomEvent<{ text: string }>
            ).detail.text;
          });
        });
      }
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      await expect(campo).toHaveAttribute('aria-expanded', 'false');
      if (camada === 'react') {
        await expect(bloco.getByText('Aqui abriria o seu cadastro')).toBeVisible();
        await bloco.getByRole('button', { name: /Salvar/ }).click();
        await expect(campo).toHaveValue(/^\d+$/);
      } else {
        expect(await page.evaluate(() => (window as unknown as { criado?: string }).criado)).toBe(
          'zzz',
        );
        await bloco.locator('[data-eds-lookup]').evaluate((raiz) => {
          const eds = (
            window as unknown as {
              EDS: { lookup: (el: Element) => { setValue: (v: object) => void } | null };
            }
          ).EDS;
          eds.lookup(raiz)?.setValue({ code: '15', description: 'Fornecedor novo' });
        });
        await expect(campo).toHaveValue('15');
      }
    });
  });
}
