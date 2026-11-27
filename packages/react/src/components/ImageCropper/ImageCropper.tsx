import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type HTMLAttributes,
} from 'react';
import {
  baseName,
  blobToFile,
  cropImage,
  isUpscaled,
  loadImage,
  outputSize as computeOutputSize,
  type Crop,
  type CropState,
  type LoadedImage,
} from '@efds-ui/behavior/image';
import { createCropperController, type CropperController } from '@efds-ui/behavior/internal';
import { useAnnouncer } from '../../internal/announcer';
import {
  ChevronDownGlyph,
  ChevronLeftGlyph,
  ChevronRightGlyph,
  ChevronUpGlyph,
} from '../../internal/glyphs';
import { ResetGlyph, RotateGlyph, ZoomInGlyph, ZoomOutGlyph } from '../../internal/glyphs-image';
import { cx } from '../../utils/cx';
import { mergeTexts } from '../../utils/texts';

export type ImageCropperShape = 'circle' | 'rect';

/** Textos internos do cortador (padrões em pt-BR). */
export interface ImageCropperTexts {
  /** Nome da área de corte. */
  area: string;
  /** Dica de uso, ligada à área por `aria-describedby`. */
  hint: string;
  /** Nome do grupo de controles. */
  controls: string;
  zoom: string;
  zoomIn: string;
  zoomOut: string;
  rotate: string;
  reset: string;
  /** Status polido: "Zoom 150%". */
  zoomStatus: (percent: number) => string;
  /** Status: "Girada 90 graus". */
  rotated: (degrees: number) => string;
  /** Status ao restaurar. */
  restored: string;
  /** Nome do grupo dos botões de mover e de cada botão. */
  pan: string;
  panLeft: string;
  panUp: string;
  panDown: string;
  panRight: string;
  /** Aviso (não bloqueante) quando a imagem é pequena para a saída; `size` é "256 x 256". */
  small: (size: string) => string;
}

export const defaultImageCropperTexts: ImageCropperTexts = {
  area: 'Área de corte',
  hint: 'Arraste a imagem para posicionar. Com o teclado: setas movem, + e - ampliam, R gira, 0 restaura.',
  controls: 'Controles da imagem',
  zoom: 'Zoom',
  zoomIn: 'Ampliar',
  zoomOut: 'Reduzir',
  rotate: 'Girar 90 graus',
  reset: 'Restaurar',
  zoomStatus: (percent) => `Zoom ${percent}%`,
  rotated: (degrees) => `Girada ${degrees} graus`,
  restored: 'Restaurado.',
  pan: 'Mover imagem',
  panLeft: 'Mover para a esquerda',
  panUp: 'Mover para cima',
  panDown: 'Mover para baixo',
  panRight: 'Mover para a direita',
  small: (size) =>
    `A imagem é menor que o tamanho final (${size} px): a foto pode ficar com pouca nitidez.`,
};

export interface ImageCropperOutput {
  /** Maior lado da saída, em px. Padrão: 256. */
  outputSize?: number;
  /** Padrão: `image/webp` (sem suporte do navegador, cai para JPEG). */
  format?: string;
  /** 0 a 1. Padrão: 0,85. */
  quality?: number;
}

/** O que o `ref` do cortador oferece. */
export interface ImageCropperHandle {
  /** Recorta, redimensiona e comprime no navegador. Nada é enviado. */
  toBlob: (options?: ImageCropperOutput) => Promise<Blob>;
  /** O mesmo, como arquivo (`<nome>.webp` ou `.jpg`, conforme o tipo gerado). */
  toFile: (name?: string, options?: ImageCropperOutput) => Promise<File>;
  /** O que o quadro mostra, em pixels da imagem girada. */
  getCrop: () => Crop | null;
  /** Volta ao enquadramento inicial. */
  reset: () => void;
}

export interface ImageCropperProps
  extends
    Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'onChange' | 'onError'>,
    ImageCropperOutput {
  /** Imagem a cortar (URL, `blob:` ou `data:`). */
  src: string;
  /** Largura / altura do quadro. Padrão: 1. */
  aspect?: number;
  /** `circle` mostra o quadro redondo (a saída segue retangular). Padrão: `rect`. */
  shape?: ImageCropperShape;
  /** Enquadramento controlado (arrastar, zoom e giro). */
  value?: CropState;
  /** Chamado a cada mudança de enquadramento. */
  onValueChange?: (state: CropState) => void;
  /** A imagem não pôde ser carregada. */
  onError?: () => void;
  texts?: Partial<ImageCropperTexts>;
}

/**
 * Cortador de imagem inline (para foto de perfil): arrastar, roda e pinça, teclado, botões e zoom
 * deslizante. A conta é a mesma do HTML (`@efds-ui/behavior/image`); o visual é do core. Use o
 * `ref` para obter o arquivo pronto (`toBlob`/`toFile`).
 */
export const ImageCropper = forwardRef<ImageCropperHandle, ImageCropperProps>(function ImageCropper(
  {
    src,
    aspect = 1,
    shape = 'rect',
    value,
    onValueChange,
    onError,
    outputSize = 256,
    format = 'image/webp',
    quality = 0.85,
    texts,
    className,
    ...rest
  },
  ref,
) {
  const t = mergeTexts(defaultImageCropperTexts, texts);
  const hintId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const controller = useRef<CropperController | null>(null);
  const loaded = useRef<{ src: string; promise: Promise<LoadedImage> } | null>(null);
  const { text: status, announce } = useAnnouncer();
  const [upscaled, setUpscaled] = useState(false);

  // Sempre o valor mais recente, sem recriar o controlador.
  const latest = useRef({ t, onValueChange, outputSize, aspect, value });
  useEffect(() => {
    latest.current = { t, onValueChange, outputSize, aspect, value };
  });

  const syncWarning = () => {
    const c = controller.current;
    const crop = c?.getCrop();
    const { outputSize: size, aspect: a } = latest.current;
    setUpscaled(crop ? isUpscaled(crop, computeOutputSize(a, size)) : false);
  };

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const c = createCropperController({
      root,
      aspect,
      announce,
      texts: {
        zoom: (percent) => latest.current.t.zoomStatus(percent),
        rotated: (degrees) => latest.current.t.rotated(degrees),
        restored: () => latest.current.t.restored,
      },
      onChange: (state) => {
        latest.current.onValueChange?.(state);
        syncWarning();
      },
    });
    controller.current = c;
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) {
      c.setImage({ width: img.naturalWidth, height: img.naturalHeight });
      if (latest.current.value) c.setState(latest.current.value);
    }
    return () => {
      c.destroy();
      controller.current = null;
    };
    // `announce` é estável; o controlador só se refaz com outra proporção.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aspect]);

  // Enquadramento controlado: aplica sem devolver o `onValueChange`.
  useEffect(() => {
    if (value) controller.current?.setState(value);
  }, [value]);

  // Outra imagem: descarta a decodificada para o recorte.
  useEffect(
    () => () => {
      const current = loaded.current;
      loaded.current = null;
      void current?.promise.then((image) => image.close()).catch(() => undefined);
    },
    [src],
  );

  const toBlob = async (options: ImageCropperOutput = {}): Promise<Blob> => {
    const c = controller.current;
    const crop = c?.getCrop();
    if (!c || !crop) throw new Error('A imagem ainda não foi carregada.');
    if (loaded.current?.src !== src) loaded.current = { src, promise: loadImage(src) };
    const image = await loaded.current.promise;
    const size = computeOutputSize(aspect, options.outputSize ?? outputSize);
    return cropImage(image, crop, {
      ...size,
      format: options.format ?? format,
      quality: options.quality ?? quality,
    });
  };

  useImperativeHandle(ref, () => ({
    toBlob,
    toFile: async (name = 'foto', options) => blobToFile(await toBlob(options), baseName(name)),
    getCrop: () => controller.current?.getCrop() ?? null,
    reset: () => controller.current?.reset(),
  }));

  const size = computeOutputSize(aspect, outputSize);
  const hint = upscaled ? `${t.hint} ${t.small(`${size.width} x ${size.height}`)}` : t.hint;

  return (
    <div {...rest} ref={rootRef} className={cx('eds-cropper', className)} data-shape-crop={shape}>
      <div
        className="eds-cropper-stage"
        // Widget operável por teclado (setas, +, -, R, 0): precisa ser focável.
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
        role="group"
        aria-label={t.area}
        aria-describedby={hintId}
      >
        <img
          ref={imgRef}
          className="eds-cropper-image"
          src={src}
          alt=""
          draggable={false}
          onLoad={(event) => {
            const img = event.currentTarget;
            controller.current?.setImage({ width: img.naturalWidth, height: img.naturalHeight });
            if (latest.current.value) controller.current?.setState(latest.current.value);
          }}
          onError={() => onError?.()}
        />
        <div className="eds-cropper-frame" aria-hidden="true" />
      </div>
      <p className="eds-cropper-hint" id={hintId}>
        {hint}
      </p>
      <div className="eds-cropper-controls" role="group" aria-label={t.controls}>
        <button
          type="button"
          className="eds-button eds-button-ghost eds-button-icon"
          data-eds-cropper-action="zoom-out"
          aria-label={t.zoomOut}
        >
          <ZoomOutGlyph />
        </button>
        <input
          type="range"
          className="eds-cropper-zoom"
          aria-label={t.zoom}
          min={100}
          max={500}
          defaultValue={100}
        />
        <button
          type="button"
          className="eds-button eds-button-ghost eds-button-icon"
          data-eds-cropper-action="zoom-in"
          aria-label={t.zoomIn}
        >
          <ZoomInGlyph />
        </button>
        <button
          type="button"
          className="eds-button eds-button-ghost eds-button-icon"
          data-eds-cropper-action="rotate"
          aria-label={t.rotate}
        >
          <RotateGlyph />
        </button>
        <button
          type="button"
          className="eds-button eds-button-ghost eds-button-icon"
          data-eds-cropper-action="reset"
          aria-label={t.reset}
        >
          <ResetGlyph />
        </button>
        <div className="eds-cropper-pan" role="group" aria-label={t.pan}>
          {(
            [
              ['pan-left', t.panLeft, <ChevronLeftGlyph key="l" />],
              ['pan-up', t.panUp, <ChevronUpGlyph key="u" />],
              ['pan-down', t.panDown, <ChevronDownGlyph key="d" />],
              ['pan-right', t.panRight, <ChevronRightGlyph key="r" />],
            ] as const
          ).map(([action, label, glyph]) => (
            <button
              key={action}
              type="button"
              className="eds-button eds-button-ghost eds-button-icon eds-button-sm"
              data-eds-cropper-action={action}
              aria-label={label}
            >
              {glyph}
            </button>
          ))}
        </div>
      </div>
      <span className="eds-visually-hidden" role="status" aria-live="polite">
        {status}
      </span>
    </div>
  );
});
ImageCropper.displayName = 'ImageCropper';
