/**
 * Entrada `@efds-ui/behavior/image`: operações de imagem no navegador (carregar, reduzir, cortar),
 * `srcset`/`<picture>` e a matemática do corte, sem `init`. O HTML e o `@efds-ui/react` usam as
 * mesmas funções. Tudo roda no aparelho: nada é enviado.
 */
export {
  DEFAULT_FORMAT,
  DEFAULT_MAX_PIXELS,
  DEFAULT_QUALITY,
  blobToFile,
  cropImage,
  loadImage,
  resizeImage,
} from './image/canvas';
export type { EncodeOptions, LoadOptions, LoadedImage } from './image/canvas';
export {
  DEFAULT_MAX_ZOOM,
  clampCrop,
  clampState,
  coverScale,
  cropFromState,
  fitInside,
  initialState,
  isUpscaled,
  normalizeRotation,
  outputSize,
  panBy,
  resizeFrame,
  rotateBy,
  rotatedSize,
  scaleLimits,
  setZoomPercent,
  zoomAt,
  zoomByFactor,
  zoomPercent,
} from './image/math';
export type { Crop, CropState, Point, Rect, Rotation, Size } from './image/math';
export { baseName, buildSrcset, extensionFor, isImageFile, matchesAccept } from './image/srcset';
export type { SrcsetOptions, SrcsetResult, SrcsetSource } from './image/srcset';
