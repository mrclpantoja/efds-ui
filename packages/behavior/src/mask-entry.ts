/**
 * Entrada `@efds-ui/behavior/mask`: só o núcleo da máscara de entrada (funções puras, sem DOM e
 * sem `init`), para o `@efds-ui/react` usar exatamente a mesma lógica do HTML por atributos.
 */
export { createMask, isMaskName, MASK_NAMES } from './core/mask';
export type {
  Mask,
  MaskEditInput,
  MaskEditResult,
  MaskInputMode,
  MaskName,
  MaskOptions,
} from './core/mask';
