/**
 * Compilação "core" do pacote (`dist/eds-behavior-core.js`): tudo de `index.ts` menos o
 * exportador de tabela (CSV/JSON/XLSX/PDF) e a máscara de entrada. `data-eds-export` e
 * `data-eds-mask` não fazem nada aqui.
 */
import { initWith } from './init-with';
import type { BehaviorOptions } from './setup';

export * from './setup';

export function init(root: ParentNode = document, options?: BehaviorOptions): () => void {
  return initWith(root, options, []);
}
