/**
 * Entrada `@efds-ui/behavior/internal`: o que só o `@efds-ui/react` usa por dentro, para ligar o
 * mesmo código do HTML (Tooltip, Popover, menu sem anchor positioning, regras de erro de formulário,
 * lógica da galeria e do cortador). **Sem garantia de SemVer**: nomes e formas podem mudar em
 * qualquer versão, inclusive menor. Quem escreve HTML ou usa os componentes React não precisa
 * importar daqui.
 */
// Tooltip, Popover e posicionamento
export { tooltipBehavior, TOOLTIP_SHOW_DELAY } from './components/tooltip';
export { popoverBehavior } from './components/popover';
export {
  followScrollTop,
  placeMenuFallback,
  supportsAnchorPositioning,
  supportsAnchorScope,
} from './core/position';
export type { Behavior } from './core/registry';
export type { Placement } from './core/position';
// Erros de formulário e resumo de erros
export {
  applyValidator,
  applyValidatorBy,
  isFormControl,
  representativeOf,
  validatableControls,
  composeErrorText,
  fieldLabel,
  fieldMessage,
  summaryTitle,
  validatorMessage,
} from './core/form-errors';
export type { FormControl } from './core/form-errors';
export { isFormValid, isValidating, markValidating } from './core/form-state';
// Galeria e cortador de imagem
export {
  announcement,
  clampIndex,
  indexForKey,
  neighborIndexes,
  swipeDirection,
} from './image/gallery-logic';
export { createCropperController } from './image/cropper-controller';
export type {
  CropperController,
  CropperControllerOptions,
  CropperTexts,
} from './image/cropper-controller';
