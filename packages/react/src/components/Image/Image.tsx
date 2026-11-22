import {
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type ImgHTMLAttributes,
} from 'react';
import { buildSrcset } from '@efds-ui/behavior/image';
import { ImageGlyph } from '../../internal/glyphs-image';
import { cx } from '../../utils/cx';
import { mergeTexts } from '../../utils/texts';

export type ImageRatio = '1x1' | '4x3' | '3x2' | '16x9' | '21x9' | '3x4' | '4x5';
export type ImageFit = 'cover' | 'contain';

/** Uma `<source>` do `<picture>`. */
export interface ImageSourceProp {
  srcSet: string;
  /** Tipo MIME (`image/avif`, `image/webp`). */
  type?: string;
  media?: string;
  sizes?: string;
}

/** Textos internos da Image (padrões em pt-BR). */
export interface ImageTexts {
  /** Texto do fallback quando a imagem não carrega. */
  unavailable: string;
}

const defaultTexts: ImageTexts = { unavailable: 'Imagem indisponível' };

type State = 'loading' | 'loaded' | 'error';

export interface ImageProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Endereço da imagem (fallback do `<picture>` quando há `sources`/`widths`). */
  src: string;
  /** Texto alternativo. Obrigatório: use `""` só se a imagem for puramente decorativa. */
  alt: string;
  /** Proporção reservada antes de carregar (evita o salto de layout). Sem ela, vale a da imagem. */
  ratio?: ImageRatio;
  /** `cover` (padrão) preenche cortando; `contain` mostra inteira. */
  fit?: ImageFit;
  /** Recorte circular. */
  circle?: boolean;
  /** `srcset` do `<img>`. */
  srcSet?: string;
  sizes?: string;
  /** `<source>` extras: com elas a imagem vira `<picture>`. */
  sources?: readonly ImageSourceProp[];
  /**
   * Larguras (px) das versões disponíveis, para montar `srcset` (e `<source>` por formato) com
   * `getSrc`. O servidor do autor é quem gera as versões.
   */
  widths?: readonly number[];
  /** URL da imagem em uma largura (e formato). Usada com `widths`. */
  getSrc?: (width: number, format?: string) => string;
  /** Formatos do mais moderno ao mais compatível (o último é o do `<img>`). Usa `getSrc`. */
  formats?: readonly string[];
  /** Padrão: `lazy`. Use `eager` na imagem principal da página. */
  loading?: ImgHTMLAttributes<HTMLImageElement>['loading'];
  decoding?: ImgHTMLAttributes<HTMLImageElement>['decoding'];
  width?: number;
  height?: number;
  crossOrigin?: ImgHTMLAttributes<HTMLImageElement>['crossOrigin'];
  /** Textos internos (padrões em pt-BR). */
  texts?: Partial<ImageTexts>;
}

/**
 * Imagem com proporção reservada, estado de carregamento (`data-state`) e fallback de texto.
 * Com `sources` ou `widths` renderiza `<picture>`. O visual é todo do core.
 */
export const Image = forwardRef<HTMLDivElement, ImageProps>(function Image(
  {
    src,
    alt,
    ratio,
    fit = 'cover',
    circle = false,
    srcSet,
    sizes,
    sources,
    widths,
    getSrc,
    formats,
    loading = 'lazy',
    decoding = 'async',
    width,
    height,
    crossOrigin,
    texts,
    className,
    ...rest
  },
  ref,
) {
  const t = mergeTexts(defaultTexts, texts);
  const imgRef = useRef<HTMLImageElement>(null);
  const [state, setState] = useState<State>('loading');

  const built = useMemo(
    () =>
      widths && getSrc ? buildSrcset({ src: getSrc, widths, formats: formats ?? undefined }) : null,
    [widths, getSrc, formats],
  );
  const pictureSources: ImageSourceProp[] = [
    ...(built?.sources.map((s) => ({ srcSet: s.srcset, type: s.type, sizes })) ?? []),
    ...(sources ?? []),
  ];
  const imgSrcSet = srcSet ?? (built && built.srcset !== '' ? built.srcset : undefined);
  const imgSrc = src || built?.src || '';
  const key = `${imgSrc}|${imgSrcSet ?? ''}|${pictureSources.map((s) => s.srcSet).join(',')}`;

  // Nova fonte: volta a "carregando" e confere a imagem que já carregou (ou falhou) antes da
  // hidratação, quando o evento `load`/`error` já passou.
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    if (img.complete && (img.getAttribute('src') ?? '') !== '') {
      setState(img.naturalWidth > 0 ? 'loaded' : 'error');
    } else setState('loading');
  }, [key]);

  const img = (
    <img
      ref={imgRef}
      src={imgSrc}
      srcSet={imgSrcSet}
      sizes={sizes}
      alt={alt}
      loading={loading}
      decoding={decoding}
      width={width}
      height={height}
      crossOrigin={crossOrigin}
      onLoad={() => setState('loaded')}
      onError={() => setState('error')}
    />
  );

  return (
    <div
      {...rest}
      ref={ref}
      className={cx(
        'eds-image',
        ratio && `eds-image-ratio-${ratio}`,
        fit === 'contain' && 'eds-image-contain',
        circle && 'eds-image-circle',
        className,
      )}
      data-state={state}
    >
      {pictureSources.length > 0 ? (
        <picture>
          {pictureSources.map((s) => (
            <source
              key={`${s.type ?? ''}|${s.media ?? ''}|${s.srcSet}`}
              srcSet={s.srcSet}
              type={s.type}
              media={s.media}
              sizes={s.sizes}
            />
          ))}
          {img}
        </picture>
      ) : (
        img
      )}
      <span className="eds-image-fallback">
        <ImageGlyph />
        <span>{t.unavailable}</span>
        {alt.trim() !== '' ? <span className="eds-visually-hidden">: {alt}</span> : null}
      </span>
    </div>
  );
});
Image.displayName = 'Image';
