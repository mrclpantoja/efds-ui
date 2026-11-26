import { expect, type Locator, type Page } from '@playwright/test';

export type Camada = 'html' | 'react';
/** O mesmo exemplo existe nas duas camadas: o cenário roda uma vez para cada. */
export const camadas: readonly Camada[] = ['html', 'react'];

/**
 * Espera o React assumir a página pré-renderizada (`createRoot` troca o HTML do servidor) e os
 * efeitos que ligam o `@efds-ui/behavior` nos previews HTML terem rodado.
 */
export async function aguardarHidratacao(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const raiz = document.getElementById('root')?.firstElementChild;
    return !!raiz && Object.keys(raiz).some((k) => k.startsWith('__reactFiber$'));
  });
  await page.evaluate(
    () => new Promise<void>((ok) => requestAnimationFrame(() => requestAnimationFrame(() => ok()))),
  );
}

/** Abre uma rota do site e espera a página ficar interativa. */
export async function abrir(page: Page, caminho: string): Promise<void> {
  await page.goto(caminho);
  await aguardarHidratacao(page);
}

/** Bloco `Example` pelo título (o `<h3>` nomeia o grupo). */
export function exemplo(page: Page, titulo: string): Locator {
  return page.getByRole('group', { name: titulo, exact: true });
}

/**
 * Abre a rota, escolhe a camada do exemplo e devolve a área do preview (sem o código exibido,
 * que repete os textos e os nomes dos botões).
 */
export async function abrirExemplo(
  page: Page,
  caminho: string,
  titulo: string,
  camada: Camada,
): Promise<Locator> {
  await abrir(page, caminho);
  const bloco = exemplo(page, titulo);
  await bloco.scrollIntoViewIfNeeded();
  // Exemplo só em React não tem as abas HTML | React.
  const abaReact = bloco.getByRole('tab', { name: 'React', exact: true });
  if (camada === 'react' && (await abaReact.count()) > 0) {
    await abaReact.click();
    await expect(abaReact).toHaveAttribute('aria-selected', 'true');
  }
  return bloco.locator('.docs-preview:visible');
}

/**
 * Onde está o foco, sem o `:focus` do Playwright (que espera por um elemento): com o diálogo
 * modal o Tab pode sair para a interface do navegador, e então `document.activeElement` é o
 * `body`. O foco "preso" significa: dentro do diálogo ou (momentaneamente) fora da página.
 */
export async function focoPresoEm(page: Page, seletor: string): Promise<boolean> {
  return page.evaluate((sel) => {
    const el = document.activeElement;
    return !el || el === document.body || !!el.closest(sel);
  }, seletor);
}

/**
 * Textos dos elementos lidos dentro da página. Substitui `locator.allTextContents()`, que derrubava
 * a aba do Firefox do Playwright no CI ("Page crashed") nas páginas de Table e Sortable.
 */
export function textos(locator: Locator): Promise<string[]> {
  return locator.evaluateAll((els) => els.map((el) => el.textContent ?? ''));
}
