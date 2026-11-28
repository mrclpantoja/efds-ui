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
// Visualizador de arquivos: tipo, tamanho e regras comuns ao HTML e ao React
export { extensionOf, formatFileSize, kindOf } from './core/file-kind';
export type { FileKind } from './core/file-kind';
export {
  PAN_STEP,
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_STEPS,
  ViewerLoadError,
  actualSizeZoom,
  blocksViewerKeys,
  canEmbedPdf,
  clampPan,
  clampZoom,
  isSideways,
  nextRotation,
  readTextLimited,
  resolveViewerOptions,
  stepZoom,
  viewerDefaults,
  viewerKeyAction,
  viewerKind,
} from './core/viewer-logic';
export type {
  ViewerAction,
  ViewerErrorReason,
  ViewerItem,
  ViewerKeyContext,
  ViewerOptions,
  ViewerPdfMode,
  ViewerTrack,
} from './core/viewer-logic';
// Gerenciador de arquivos: controlador, textos, caminhos, tipos e ícones
export { createFilesController } from './files/controller';
export type {
  AnyEntry,
  ConflictAnswer,
  FilesAction,
  FilesController,
  FilesControllerOptions,
  FilesEventName,
  FilesMode,
  FilesState,
  FilesStatus,
  FilesUi,
  FilesView,
  OpResult,
  UploadJob,
  ViewerEntry,
} from './files/controller';
export { FILES_ICONS } from './files/icons';
export type { FilesIcon } from './files/icons';
export {
  ancestorsOf,
  entryKind as filesEntryKind,
  formatDateTime as formatFilesDate,
  formatSize as formatFilesSize,
  isInside,
  nameProblem,
  parentOf,
  baseName as pathBaseName,
  extensionOf as filesExtensionOf,
} from './files/logic';
export type { SortKey as FilesSortKey, SortState as FilesSortState } from './files/logic';
export { defaultFilesTexts, fill as fillTemplate, plural as pluralTemplate } from './files/texts';
export type { FilesTexts } from './files/texts';
