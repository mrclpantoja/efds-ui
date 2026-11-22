/**
 * Matemática do corte de imagem (pan, zoom e rotação), sem DOM e sem canvas: tudo recebe e devolve
 * números, para testar sem navegador e para o HTML e o React usarem exatamente a mesma conta.
 *
 * Modelo (px de tela, origem no centro do quadro de corte):
 * - `scale`: pixels de tela por pixel da imagem (a imagem aparece em tamanho natural vezes `scale`);
 * - `x`, `y`: deslocamento do centro da imagem em relação ao centro do quadro;
 * - `rotation`: 0, 90, 180 ou 270 graus, no sentido horário.
 * A imagem nunca deixa fresta dentro do quadro: `scale` fica entre a escala de cobertura (a menor
 * que ainda cobre o quadro) e `maxZoom` vezes ela, e o deslocamento é limitado de acordo.
 */

export interface Size {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Rect extends Point, Size {}

export type Rotation = 0 | 90 | 180 | 270;

export interface CropState {
  x: number;
  y: number;
  scale: number;
  rotation: Rotation;
}

/** Retângulo, em pixels da imagem já girada (origem no canto superior esquerdo), e a rotação a aplicar. */
export interface Crop extends Rect {
  rotation: Rotation;
}

/** Ampliação máxima, em múltiplos da escala de cobertura (500%). */
export const DEFAULT_MAX_ZOOM = 5;

const valid = (size: Size) => size.width > 0 && size.height > 0;

/** Qualquer ângulo vira 0, 90, 180 ou 270 (arredonda para o múltiplo de 90 mais próximo). */
export function normalizeRotation(degrees: number): Rotation {
  const turns = ((Math.round(degrees / 90) % 4) + 4) % 4;
  return (turns * 90) as Rotation;
}

/** Tamanho da imagem depois de girada. */
export function rotatedSize(image: Size, rotation: Rotation): Size {
  return rotation === 90 || rotation === 270
    ? { width: image.height, height: image.width }
    : { width: image.width, height: image.height };
}

/** Menor escala em que a imagem (girada) ainda cobre o quadro inteiro. `1` se algo ainda não foi medido. */
export function coverScale(image: Size, rotation: Rotation, frame: Size): number {
  if (!valid(image) || !valid(frame)) return 1;
  const r = rotatedSize(image, rotation);
  return Math.max(frame.width / r.width, frame.height / r.height);
}

export function scaleLimits(
  image: Size,
  rotation: Rotation,
  frame: Size,
  maxZoom = DEFAULT_MAX_ZOOM,
): { min: number; max: number } {
  const min = coverScale(image, rotation, frame);
  return { min, max: min * Math.max(1, maxZoom) };
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Limita escala e deslocamento: sem fresta e sem passar do zoom máximo. */
export function clampState(
  state: CropState,
  image: Size,
  frame: Size,
  maxZoom = DEFAULT_MAX_ZOOM,
): CropState {
  if (!valid(image) || !valid(frame)) return state;
  const { min, max } = scaleLimits(image, state.rotation, frame, maxZoom);
  const scale = clamp(state.scale, min, max);
  const r = rotatedSize(image, state.rotation);
  const limitX = Math.max(0, (r.width * scale - frame.width) / 2);
  const limitY = Math.max(0, (r.height * scale - frame.height) / 2);
  return {
    rotation: state.rotation,
    scale,
    x: clamp(state.x, -limitX, limitX),
    y: clamp(state.y, -limitY, limitY),
  };
}

/** Imagem inteira cobrindo o quadro, centralizada, sem giro. */
export function initialState(image: Size, frame: Size): CropState {
  return { x: 0, y: 0, scale: coverScale(image, 0, frame), rotation: 0 };
}

/** Arrasta a imagem `dx`, `dy` pixels de tela. */
export function panBy(
  state: CropState,
  dx: number,
  dy: number,
  image: Size,
  frame: Size,
  maxZoom = DEFAULT_MAX_ZOOM,
): CropState {
  return clampState({ ...state, x: state.x + dx, y: state.y + dy }, image, frame, maxZoom);
}

/**
 * Muda a escala mantendo parado o ponto `point` (px de tela em relação ao centro do quadro): é o
 * ponto sob o ponteiro na roda do mouse e o centro dos dedos na pinça.
 */
export function zoomAt(
  state: CropState,
  nextScale: number,
  point: Point,
  image: Size,
  frame: Size,
  maxZoom = DEFAULT_MAX_ZOOM,
): CropState {
  if (!valid(image) || !valid(frame) || state.scale <= 0) return state;
  const { min, max } = scaleLimits(image, state.rotation, frame, maxZoom);
  const scale = clamp(nextScale, min, max);
  const ratio = scale / state.scale;
  return clampState(
    {
      rotation: state.rotation,
      scale,
      x: point.x - (point.x - state.x) * ratio,
      y: point.y - (point.y - state.y) * ratio,
    },
    image,
    frame,
    maxZoom,
  );
}

/** Multiplica a escala por `factor` em torno de `point` (padrão: o centro do quadro). */
export function zoomByFactor(
  state: CropState,
  factor: number,
  image: Size,
  frame: Size,
  point: Point = { x: 0, y: 0 },
  maxZoom = DEFAULT_MAX_ZOOM,
): CropState {
  return zoomAt(state, state.scale * factor, point, image, frame, maxZoom);
}

/** Zoom em porcentagem da escala de cobertura (100% = a imagem mal cobre o quadro). */
export function zoomPercent(state: CropState, image: Size, frame: Size): number {
  const min = coverScale(image, state.rotation, frame);
  return Math.round((state.scale / min) * 100);
}

/** Define o zoom em porcentagem (100 a `maxZoom * 100`), em torno do centro do quadro. */
export function setZoomPercent(
  state: CropState,
  percent: number,
  image: Size,
  frame: Size,
  maxZoom = DEFAULT_MAX_ZOOM,
): CropState {
  const min = coverScale(image, state.rotation, frame);
  return zoomAt(state, (min * percent) / 100, { x: 0, y: 0 }, image, frame, maxZoom);
}

/**
 * Gira a imagem `delta` graus (múltiplo de 90) em torno do centro do quadro. O deslocamento gira
 * junto, então a parte que se via continua à vista; a escala sobe se o novo giro deixaria fresta.
 */
export function rotateBy(
  state: CropState,
  delta: number,
  image: Size,
  frame: Size,
  maxZoom = DEFAULT_MAX_ZOOM,
): CropState {
  const turns = (((Math.round(delta / 90) % 4) + 4) % 4) as 0 | 1 | 2 | 3;
  let { x, y } = state;
  for (let i = 0; i < turns; i += 1) [x, y] = [-y, x];
  return clampState(
    { x, y, scale: state.scale, rotation: normalizeRotation(state.rotation + delta) },
    image,
    frame,
    maxZoom,
  );
}

/** O que o quadro mostra, em pixels da imagem girada. É o que `cropImage` recorta. */
export function cropFromState(state: CropState, image: Size, frame: Size): Crop {
  const r = rotatedSize(image, state.rotation);
  const s = state.scale > 0 ? state.scale : 1;
  const width = frame.width / s;
  const height = frame.height / s;
  return {
    x: r.width / 2 - state.x / s - width / 2,
    y: r.height / 2 - state.y / s - height / 2,
    width,
    height,
    rotation: state.rotation,
  };
}

/** Mantém o retângulo dentro da imagem girada (e nunca maior que ela). */
export function clampCrop(crop: Crop, image: Size): Crop {
  const r = rotatedSize(image, crop.rotation);
  const width = clamp(crop.width, 1, Math.max(1, r.width));
  const height = clamp(crop.height, 1, Math.max(1, r.height));
  return {
    rotation: crop.rotation,
    width,
    height,
    x: clamp(crop.x, 0, Math.max(0, r.width - width)),
    y: clamp(crop.y, 0, Math.max(0, r.height - height)),
  };
}

/** O quadro mudou de tamanho (janela, orientação): o mesmo recorte continua enquadrado. */
export function resizeFrame(state: CropState, from: Size, to: Size): CropState {
  if (!valid(from) || !valid(to)) return state;
  const ratio = to.width / from.width;
  return { ...state, x: state.x * ratio, y: state.y * ratio, scale: state.scale * ratio };
}

/** Tamanho de saída: `size` é o maior lado e `aspect` (largura / altura) define o outro. */
export function outputSize(aspect: number, size: number): Size {
  const a = aspect > 0 && Number.isFinite(aspect) ? aspect : 1;
  const side = Math.max(1, Math.round(size));
  return a >= 1
    ? { width: side, height: Math.max(1, Math.round(side / a)) }
    : { width: Math.max(1, Math.round(side * a)), height: side };
}

/** Cabe `source` dentro dos limites mantendo a proporção; nunca amplia. */
export function fitInside(source: Size, maxWidth?: number, maxHeight?: number): Size {
  if (!valid(source)) return { width: 0, height: 0 };
  const rw = maxWidth && maxWidth > 0 ? maxWidth / source.width : Infinity;
  const rh = maxHeight && maxHeight > 0 ? maxHeight / source.height : Infinity;
  const ratio = Math.min(1, rw, rh);
  return {
    width: Math.max(1, Math.round(source.width * ratio)),
    height: Math.max(1, Math.round(source.height * ratio)),
  };
}

/** O recorte tem menos pixels que a saída: a foto sairia ampliada (pouca nitidez). */
export function isUpscaled(crop: Crop, output: Size): boolean {
  return crop.width < output.width - 0.5 || crop.height < output.height - 0.5;
}
