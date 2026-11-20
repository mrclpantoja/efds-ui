/**
 * Compilação "core" do pacote (`dist/eds-behavior-core.js`): tudo de `index.ts` menos o
 * exportador de tabela (CSV/JSON/XLSX/PDF), a máscara de entrada, o CEP e os formatadores.
 * `data-eds-export`, `data-eds-mask`, `data-eds-cep`, `data-eds-format`, `data-eds-command` (paleta de
 * comandos) e `data-eds-agenda` não fazem nada aqui.
 * Senha, OTP, NumberInput e Lookup entram.
 */
import { initWith } from './init-with';
import type { BehaviorOptions } from './setup';

export * from './setup';

export function init(root: ParentNode = document, options?: BehaviorOptions): () => void {
  return initWith(root, options, []);
}
