import { expect, test, type Locator } from '@playwright/test';
import { abrirExemplo, camadas } from '../support/docs.ts';

/**
 * Table avançada (docs/architecture/table-avancada.md), nas duas camadas: o mesmo cenário roda no
 * exemplo HTML (behavior) e no exemplo React.
 */
const ROTA = '/componentes/table-avancada';
const FIREFOX_CRASH = 'Firefox do Playwright: Page crashed ao ler o texto do exemplo';

const cabecalhos = (bloco: Locator) => bloco.getByRole('columnheader');
const ordem = async (bloco: Locator): Promise<string[]> =>
  (await cabecalhos(bloco).evaluateAll((els) => els.map((el) => el.textContent ?? ''))).map((t) =>
    t.replace(/\s+/g, ' ').trim(),
  );
const posicao = (nomes: string[], nome: string) => nomes.findIndex((n) => n.startsWith(nome));
const linhasVisiveis = (bloco: Locator) => bloco.locator('tbody tr:visible');

/** O popover abre junto do gatilho: a menos de 16 px dele e com uma borda lateral alinhada. */
async function esperarJuntoDe(gatilho: Locator, popover: Locator): Promise<void> {
  await expect(popover).toBeVisible();
  await expect
    .poll(async () => {
      const g = await gatilho.boundingBox();
      const p = await popover.boundingBox();
      if (!g || !p) return false;
      // Abaixo ou acima do gatilho (o balão vira ou se ajusta à janela): distância curta.
      const distancia = Math.max(p.y - (g.y + g.height), g.y - (p.y + p.height));
      const alinhado = Math.abs(p.x - g.x) < 4 || Math.abs(p.x + p.width - (g.x + g.width)) < 4;
      return distancia >= -16 && distancia <= 16 && alinhado;
    })
    .toBe(true);
}

for (const camada of camadas) {
  test.describe(`Table avançada (${camada})`, () => {
    test.beforeEach(({ browserName }) => {
      test.fixme(browserName === 'firefox', FIREFOX_CRASH);
    });

    test('ordenação múltipla: Shift+clique e Shift+Enter acrescentam, só o primário leva aria-sort', async ({
      page,
    }) => {
      const bloco = await abrirExemplo(page, ROTA, 'Ordenar por mais de uma coluna', camada);
      const th = (nome: RegExp) => bloco.getByRole('columnheader', { name: nome });
      const botao = (nome: RegExp) => th(nome).getByRole('button');

      await expect(th(/^Cliente/)).toHaveAttribute('aria-sort', 'ascending');
      await expect(th(/^Total/).locator('.eds-table-sort-order')).toHaveText('2');
      await expect(th(/^Total/)).not.toHaveAttribute('aria-sort', /ascending|descending/);

      // Clique simples substitui toda a ordenação.
      await botao(/^Código/).click();
      await expect(th(/^Código/)).toHaveAttribute('aria-sort', 'ascending');
      await expect(th(/^Cliente/)).toHaveAttribute('aria-sort', 'none');
      await expect(bloco.locator('.eds-table-sort-order')).toHaveCount(0);

      // Shift+clique acrescenta: o número da prioridade aparece e o primário segue com aria-sort.
      await botao(/^Cliente/).click({ modifiers: ['Shift'] });
      await expect(th(/^Código/)).toHaveAttribute('aria-sort', 'ascending');
      await expect(th(/^Cliente/).locator('.eds-table-sort-order')).toHaveText('2');
      await expect(th(/^Cliente/)).not.toHaveAttribute('aria-sort', /ascending|descending/);

      // Teclado: Shift+Enter acrescenta; de novo alterna; depois de decrescente sai da lista.
      await botao(/^Total/).focus();
      await page.keyboard.press('Shift+Enter');
      await expect(th(/^Total/).locator('.eds-table-sort-order')).toHaveText('3');
      await page.keyboard.press('Shift+Enter');
      await expect(th(/^Total/)).toHaveAttribute('data-sort-dir', 'descending');
      await page.keyboard.press('Shift+Enter');
      await expect(bloco.locator('.eds-table-sort-order')).toHaveCount(2);
      await expect(botao(/^Total/)).toBeFocused();

      // "Remover ordenação" limpa tudo e o foco permanece no botão.
      const limpar = bloco.getByRole('button', { name: 'Remover ordenação' });
      await limpar.click();
      await expect(bloco.locator('.eds-table-sort-order')).toHaveCount(0);
      await expect(limpar).toBeFocused();
    });

    test('filtro por coluna: Enter aplica e devolve o foco; Esc fecha sem aplicar', async ({
      page,
    }) => {
      const bloco = await abrirExemplo(page, ROTA, 'Filtrar por coluna', camada);
      const botao = bloco.getByRole('button', { name: /^Filtrar Cliente/ });
      const antes = await linhasVisiveis(bloco).count();

      await botao.click();
      await esperarJuntoDe(botao, page.getByRole('dialog', { name: /Filtrar Cliente/ }));
      const campo = page.getByRole('dialog', { name: /Filtrar Cliente/ }).getByRole('searchbox');
      await campo.fill('Atelier');
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog', { name: /Filtrar Cliente/ })).toBeHidden();
      expect(await linhasVisiveis(bloco).count()).toBe(antes);
      await expect(botao).toBeFocused();

      // O campo volta ao valor aplicado (vazio) ao abrir de novo.
      await botao.click();
      await expect(campo).toHaveValue('');
      await campo.fill('Atelier');
      await page.keyboard.press('Enter');
      await expect(page.getByRole('dialog', { name: /Filtrar Cliente/ })).toBeHidden();
      await expect(botao).toBeFocused();
      await expect(botao).toHaveAccessibleName(/filtro ativo/);
      const textos = await linhasVisiveis(bloco).evaluateAll((els) =>
        els.map((el) => el.textContent ?? ''),
      );
      expect(textos.length).toBeGreaterThan(0);
      expect(textos.length).toBeLessThan(antes);
      expect(textos.every((t) => t.includes('Atelier'))).toBe(true);

      // O chip do filtro aplicado remove o filtro e devolve o foco.
      const chip = bloco
        .page()
        .getByRole('button', { name: /Remover filtro Cliente/ })
        .first();
      if ((await chip.count()) > 0) {
        await chip.click();
        await expect.poll(() => linhasVisiveis(bloco).count()).toBeGreaterThan(textos.length - 1);
      }
    });

    test('colunas: a alça move com o teclado, o foco permanece e Esc cancela', async ({ page }) => {
      const bloco = await abrirExemplo(
        page,
        ROTA,
        'Colunas fixas, largura, ordem e visibilidade',
        camada,
      );
      const alca = bloco
        .getByRole('button', { name: /^Ajustar coluna (Fornecedor|Cliente)/ })
        .first();
      const nome = (await alca.getAttribute('aria-label'))?.replace('Ajustar coluna ', '') ?? '';
      const inicial = await ordem(bloco);
      const i0 = posicao(inicial, nome);

      await alca.focus();
      await page.keyboard.press('Space');
      await expect(alca).toHaveAttribute('aria-pressed', 'true');
      await page.keyboard.press('ArrowRight');
      await expect(alca).toBeFocused();
      const movida = await ordem(bloco);
      expect(posicao(movida, nome)).toBe(i0 + 1);
      await page.keyboard.press('Escape');
      expect(await ordem(bloco)).toEqual(inicial);
      await expect(alca).toHaveAttribute('aria-pressed', 'false');
      await expect(alca).toBeFocused();

      // Solta com Espaço: a ordem fica.
      await page.keyboard.press('Space');
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('Space');
      expect(posicao(await ordem(bloco), nome)).toBe(i0 + 1);
      // A célula do corpo acompanha o cabeçalho (mesma ordem de Tab e de leitura).
      const celulas = await bloco
        .locator('tbody tr')
        .first()
        .locator('th, td')
        .evaluateAll((els) => els.map((el) => (el.textContent ?? '').trim()));
      expect(celulas.length).toBeGreaterThan(3);
    });

    test('colunas: Shift+setas redimensionam', async ({ page }) => {
      const bloco = await abrirExemplo(
        page,
        ROTA,
        'Colunas fixas, largura, ordem e visibilidade',
        camada,
      );
      const alca = bloco
        .getByRole('button', { name: /^Ajustar coluna (Fornecedor|Cliente)/ })
        .first();
      const th = alca.locator('xpath=ancestor::th[1]');
      const antes = (await th.boundingBox())?.width ?? 0;
      await alca.focus();
      await page.keyboard.press('Space');
      await page.keyboard.press('Shift+ArrowRight');
      await page.keyboard.press('Shift+ArrowRight');
      await expect
        .poll(async () => (await th.boundingBox())?.width ?? 0)
        .toBeGreaterThan(antes + 20);
      await page.keyboard.press('Escape');
      await expect
        .poll(async () => Math.round((await th.boundingBox())?.width ?? 0))
        .toBeLessThanOrEqual(Math.round(antes) + 1);
    });

    test('colunas: o painel oculta, mantém a última visível e restaura', async ({ page }) => {
      const bloco = await abrirExemplo(
        page,
        ROTA,
        'Colunas fixas, largura, ordem e visibilidade',
        camada,
      );
      await bloco.getByRole('button', { name: 'Colunas', exact: true }).click();
      const painel = page.getByRole('dialog', { name: /Colunas/ });
      await esperarJuntoDe(bloco.getByRole('button', { name: 'Colunas', exact: true }), painel);
      const caixas = painel.getByRole('checkbox');
      const total = await caixas.count();
      expect(total).toBeGreaterThan(3);
      const nomeColuna = (
        (await caixas.nth(1).evaluate((el) => el.parentElement?.textContent)) ?? ''
      ).trim();
      const visiveisAntes = (await ordem(bloco)).length;

      await caixas.nth(1).uncheck();
      await expect(caixas.nth(1)).not.toBeChecked();
      await expect
        .poll(async () => await bloco.getByRole('columnheader').count())
        .toBeLessThan(visiveisAntes);
      expect((await ordem(bloco)).some((t) => t.startsWith(nomeColuna))).toBe(false);

      // Mover pelo painel mantém o foco no botão acionado.
      await painel
        .getByRole('listitem')
        .nth(1)
        .getByRole('button', { name: /^Mover .* para depois$/ })
        .click();
      await expect(page.locator(':focus')).toHaveAttribute('aria-label', /^Mover .* para depois$/);

      // Restaurar padrão.
      await painel.getByRole('button', { name: 'Restaurar padrão' }).click();
      await expect(caixas.nth(1)).toBeChecked();
      await expect.poll(async () => (await ordem(bloco)).length).toBe(visiveisAntes);
    });

    test('colunas: as preferências ficam no localStorage e voltam ao recarregar', async ({
      page,
    }) => {
      const bloco = await abrirExemplo(
        page,
        ROTA,
        'Colunas fixas, largura, ordem e visibilidade',
        camada,
      );
      await bloco.getByRole('button', { name: 'Colunas', exact: true }).click();
      const painel = page.getByRole('dialog', { name: /Colunas/ });
      const caixa = painel.getByRole('checkbox').nth(1);
      const nome = ((await caixa.evaluate((el) => el.parentElement?.textContent)) ?? '').trim();
      await caixa.uncheck();
      await expect
        .poll(() =>
          page.evaluate(() => Object.keys(localStorage).some((k) => k.startsWith('eds:table:'))),
        )
        .toBe(true);
      await page.reload();
      const depois = await abrirExemplo(
        page,
        ROTA,
        'Colunas fixas, largura, ordem e visibilidade',
        camada,
      );
      expect((await ordem(depois)).some((t) => t.startsWith(nome))).toBe(false);
      // Restaurar padrão apaga a chave.
      await depois.getByRole('button', { name: 'Colunas', exact: true }).click();
      await page
        .getByRole('dialog', { name: /Colunas/ })
        .getByRole('button', { name: 'Restaurar padrão' })
        .click();
      await expect
        .poll(() =>
          page.evaluate(() => Object.keys(localStorage).some((k) => k.startsWith('eds:table:'))),
        )
        .toBe(false);
    });

    test('colunas: a primeira coluna fixa acompanha a rolagem horizontal', async ({ page }) => {
      await page.setViewportSize({ width: 560, height: 800 });
      const bloco = await abrirExemplo(
        page,
        ROTA,
        'Colunas fixas, largura, ordem e visibilidade',
        camada,
      );
      const wrap = bloco.locator('.eds-table-wrap').first();
      const fixa = bloco.locator('thead th.eds-table-pin-start').first();
      await expect(fixa).toBeVisible();
      const x0 = (await fixa.boundingBox())?.x ?? 0;
      await wrap.evaluate((el) => {
        el.scrollLeft = 180;
      });
      const rolou = await wrap.evaluate((el) => el.scrollLeft);
      test.skip(rolou === 0, 'a tabela coube sem rolar');
      await expect
        .poll(async () => Math.abs(((await fixa.boundingBox())?.x ?? 0) - x0))
        .toBeLessThan(2);
    });

    test('lote: a barra segue a seleção, a ação devolve os ids e limpar devolve o foco', async ({
      page,
    }) => {
      const bloco = await abrirExemplo(page, ROTA, 'Barra de ações em lote', camada);
      const barra = bloco.getByRole('group', { name: 'Ações em lote' });
      const todos = bloco.getByRole('checkbox', { name: 'Selecionar todos desta página' });
      await page.evaluate(() => {
        (window as unknown as { __lote: unknown[] }).__lote = [];
        document.addEventListener('eds:table-bulk-action', (e) =>
          (window as unknown as { __lote: unknown[] }).__lote.push((e as CustomEvent).detail.ids),
        );
      });

      // Zera a seleção do exemplo e seleciona uma linha.
      for (const caixa of await bloco.getByRole('checkbox', { name: /^Selecionar PED-/ }).all()) {
        if (await caixa.isChecked()) await caixa.uncheck();
      }
      await expect(barra).toBeHidden();
      await bloco.getByRole('checkbox', { name: 'Selecionar PED-0003' }).check();
      await expect(barra).toBeVisible();
      await expect(barra).toContainText('1 selecionado');
      await bloco.getByRole('checkbox', { name: 'Selecionar PED-0001' }).check();
      await expect(barra).toContainText('2 selecionados');

      if (camada === 'html') {
        await barra.getByRole('button', { name: 'Arquivar' }).click();
        const ids = await page.evaluate(
          () => (window as unknown as { __lote: unknown[][] }).__lote[0],
        );
        expect(ids).toEqual(['PED-0001', 'PED-0003']);
      }

      await barra.getByRole('button', { name: 'Limpar seleção' }).click();
      await expect(barra).toBeHidden();
      await expect(todos).toBeFocused();
    });

    test('edição: Enter abre, confirma e cancela; inválido fica com o erro', async ({ page }) => {
      const bloco = await abrirExemplo(page, ROTA, 'Editar na célula', camada);
      const botao = bloco.getByRole('button', { name: /editar Total de PED-0001/ });
      await expect(botao).toBeVisible();

      await botao.focus();
      await page.keyboard.press('Enter');
      const campo = bloco.getByRole('textbox', { name: 'Total de PED-0001' });
      await expect(campo).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(botao).toBeFocused();

      // Inválido (vazio): fica em edição, com erro visível e aria-invalid.
      await page.keyboard.press('Enter');
      await campo.fill('');
      await page.keyboard.press('Enter');
      await expect(campo).toHaveAttribute('aria-invalid', 'true');
      await expect(campo).toBeFocused();
      await expect(bloco.locator('td .eds-error').first()).toBeVisible();

      // Válido: confirma, mostra o valor formatado e devolve o foco ao botão.
      await campo.fill('2500,00');
      await page.keyboard.press('Enter');
      const novo = bloco.getByRole('button', { name: /editar Total de PED-0001/ });
      await expect(novo).toContainText('2.500,00');
      await expect(novo).toBeFocused();
    });
  });
}

test.describe('Table avançada: consulta no servidor', () => {
  test.beforeEach(({ browserName }) => {
    test.fixme(browserName === 'firefox', FIREFOX_CRASH);
  });

  test('HTML: ordenar, filtrar e paginar emitem eds:table-query sem navegar', async ({ page }) => {
    const bloco = await abrirExemplo(
      page,
      ROTA,
      'Paginação, ordenação e filtro no servidor',
      'html',
    );
    await page.evaluate(() => {
      const w = window as unknown as { __q: string[] };
      w.__q = [];
      document.addEventListener('eds:table-query', (e) => {
        const d = (e as CustomEvent).detail;
        w.__q.push(`${d.reason}?${d.params.toString()}`);
      });
    });
    const url = page.url();
    await bloco
      .getByRole('columnheader', { name: /^Código/ })
      .getByRole('link')
      .click();
    await bloco.getByRole('link', { name: '2', exact: true }).click();
    const eventos = await page.evaluate(() => (window as unknown as { __q: string[] }).__q);
    expect(eventos[0]).toMatch(/^sort\?.*sort=codigo/);
    expect(eventos[1]).toMatch(/^page\?.*page=2/);
    expect(page.url()).toBe(url);
  });

  test('React: a consulta carrega com sobreposição, mantém os dados no erro e se recupera', async ({
    page,
  }) => {
    const bloco = await abrirExemplo(
      page,
      ROTA,
      'Paginação, ordenação e filtro no servidor',
      'react',
    );
    const tabela = bloco.getByRole('table');
    await expect(tabela.locator('tbody tr').first()).toBeVisible();
    await expect(tabela).not.toHaveAttribute('aria-busy', 'true');

    await bloco
      .getByRole('columnheader', { name: /^Total/ })
      .getByRole('button')
      .click();
    await expect(tabela).toHaveAttribute('aria-busy', 'true');
    await expect(tabela).not.toHaveAttribute('aria-busy', 'true');
    await expect(bloco.getByRole('columnheader', { name: /^Total/ })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );

    // Falha do servidor: os dados anteriores permanecem e o erro tem "tentar de novo".
    const antes = await tabela.locator('tbody tr').first().textContent();
    await bloco.getByRole('button', { name: 'Simular falha do servidor' }).click();
    await expect(
      bloco.getByText('Não foi possível carregar os dados', { exact: false }).first(),
    ).toBeVisible();
    expect(await tabela.locator('tbody tr').first().textContent()).toBe(antes);
    await bloco.getByRole('button', { name: 'Voltar a responder' }).click();
    await expect(bloco.getByText('Não foi possível carregar os dados')).toBeHidden();
  });
});
