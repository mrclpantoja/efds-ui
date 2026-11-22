/**
 * Entrada para <script src defer>: mescla a API em `window.EDS.editor` (sem apagar o `EDS` do
 * `@efds-ui/behavior`, em qualquer ordem de carga) e liga os `textarea[data-eds-editor]`.
 * `data-eds-manual` na tag: não liga sozinho (chame `EDS.editor.initEditors()`).
 */
import { initEditors } from './auto';
import * as api from './index';

export * from './index';

type Host = { EDS?: Record<string, unknown> };

/** Pendura `editor` em `window.EDS`; se o behavior carregar depois, reaplica na atribuição. */
function install(): void {
  const w = window as unknown as Host;
  const descriptor = Object.getOwnPropertyDescriptor(window, 'EDS');
  if (descriptor && 'value' in descriptor) {
    if (descriptor.value && typeof descriptor.value === 'object') {
      (descriptor.value as Record<string, unknown>).editor = api;
    }
    return;
  }
  if (descriptor) return;
  let current: Record<string, unknown> = { editor: api };
  Object.defineProperty(window, 'EDS', {
    configurable: true,
    enumerable: true,
    get: () => current,
    set(next: unknown) {
      current = next && typeof next === 'object' ? (next as Record<string, unknown>) : {};
      try {
        current.editor = api;
      } catch {
        // Objeto congelado: o editor segue em window.EDSEditor.
      }
    },
  });
  void w;
}

install();

const script = document.currentScript;
const manual = script instanceof HTMLScriptElement && script.hasAttribute('data-eds-manual');
if (!manual) {
  const start = () => {
    initEditors(document);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
}
