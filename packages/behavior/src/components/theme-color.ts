import { emit } from '../core/dom';
import { bindAll, type Behavior } from '../core/registry';
import { applyTheme, type ThemeResult } from '../theme/create-theme';
import { pm } from './page-messages';

/**
 * Demonstração do tema por cor: `input[data-eds-theme-color]` (em geral `type="color"`) aplica
 * `createTheme` ao contêiner `[data-eds-theme-demo]` mais próximo (ou ao `<html>`) a cada
 * escolha e escreve o relatório de contraste em `[data-eds-theme-report]` do mesmo contêiner.
 * Numa subárvore o `data-mode` é copiado do documento (o tema só vale com os dois no mesmo
 * elemento). Evento `eds:theme-change` (`detail.result`).
 */
export const themeColorBehavior: Behavior = {
  name: 'theme-color',
  selector: 'input[data-eds-theme-color]',
  bind(el) {
    const input = el as HTMLInputElement;
    const scope = input.closest<HTMLElement>('[data-eds-theme-demo]');
    const target = scope ?? input.ownerDocument.documentElement;
    let remove: (() => void) | null = null;
    let addedMode = false;
    let lastResult: ThemeResult | null = null;

    /** Relatório do modo que está na tela (claro: texto branco; escuro: texto escuro sobre a ação). */
    const writeReport = () => {
      const report = scope?.querySelector<HTMLElement>('[data-eds-theme-report]');
      if (!report || !lastResult) return;
      const mode = (scope ?? target).getAttribute('data-mode') === 'dark' ? 'dark' : 'light';
      const check = lastResult.checks.find((c) => c.id === `${mode}-action-text`);
      report.textContent =
        pm('themeReport', { ratio: String(check?.ratio ?? '').replace('.', ',') }) +
        (lastResult.adjusted ? ` ${pm('themeAdjusted')}` : '');
    };

    const apply = () => {
      remove?.();
      remove = null;
      try {
        if (scope && !scope.hasAttribute('data-mode')) {
          scope.setAttribute(
            'data-mode',
            input.ownerDocument.documentElement.getAttribute('data-mode') ?? 'light',
          );
          addedMode = true;
        }
        const applied = applyTheme(input.value, target);
        remove = applied.remove;
        lastResult = applied.result;
        writeReport();
        emit(input, 'theme-change', { result: applied.result });
      } catch {
        // Valor que não é cor: nada a aplicar.
      }
    };

    // Em subárvore, o `data-mode` copiado acompanha o do documento (troca de claro/escuro).
    const html = input.ownerDocument.documentElement;
    const follow =
      typeof MutationObserver === 'function'
        ? new MutationObserver(() => {
            if (scope && addedMode) {
              scope.setAttribute('data-mode', html.getAttribute('data-mode') ?? 'light');
              writeReport();
            }
          })
        : null;
    follow?.observe(html, { attributes: true, attributeFilter: ['data-mode'] });

    apply();
    input.addEventListener('input', apply);
    input.addEventListener('change', apply);
    return () => {
      follow?.disconnect();
      input.removeEventListener('input', apply);
      input.removeEventListener('change', apply);
      remove?.();
      if (addedMode) scope?.removeAttribute('data-mode');
    };
  },
};

export function initThemeColor(root: ParentNode = document): () => void {
  return bindAll(root, [themeColorBehavior]);
}
