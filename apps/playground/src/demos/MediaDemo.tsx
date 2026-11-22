import './media-demo.css';
import type { CSSProperties, ReactNode } from 'react';

/* Estados do conjunto de imagem. O markup abaixo é o CONTRATO que o JS (@efds-ui/behavior/image)
   gera/consome e que o React reproduz. Imagens são SVGs fictícios locais (public/media). */

const lands = [
  { src: '/media/paisagem-1.svg', alt: 'Fachada norte', caption: 'Fachada norte' },
  { src: '/media/paisagem-2.svg', alt: 'Pátio interno', caption: 'Pátio interno' },
  { src: '/media/paisagem-3.svg', alt: 'Fundação da obra', caption: 'Fundação da obra' },
  { src: '/media/paisagem-4.svg', alt: 'Cobertura', caption: 'Cobertura' },
  { src: '/media/paisagem-5.svg', alt: 'Acesso lateral', caption: 'Acesso lateral' },
  { src: '/media/paisagem-6.svg', alt: 'Sala de reuniões', caption: 'Sala de reuniões' },
];

function Frame({
  caption,
  children,
  wide,
}: {
  caption: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={wide ? 'md-frame md-frame-wide' : 'md-frame'}>
      <p className="md-caption">{caption}</p>
      {children}
    </div>
  );
}

function Glyph({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={d} />
    </svg>
  );
}

const BROKEN =
  'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM3 16l5-5 4 4 3-3 6 6M9 8.5v.01';

function Fallback() {
  return (
    <span className="eds-image-fallback">
      <Glyph d={BROKEN} />
      <span>Imagem indisponível</span>
    </span>
  );
}

function Img({
  n,
  ratio,
  state,
  extra,
}: {
  n: number;
  ratio?: string;
  state?: 'loading' | 'loaded' | 'error';
  extra?: string;
}) {
  const item = lands[n] ?? lands[0]!;
  return (
    <div
      className={['eds-image', ratio ? `eds-image-ratio-${ratio}` : '', extra ?? '']
        .filter(Boolean)
        .join(' ')}
      data-state={state}
    >
      <img
        src={item.src}
        alt={item.alt}
        width={1280}
        height={720}
        loading="lazy"
        decoding="async"
      />
      <Fallback />
    </div>
  );
}

function Images() {
  return (
    <section className="md-section" aria-labelledby="md-image">
      <h3 className="eds-text-h3" id="md-image">
        Image
      </h3>
      <div className="md-grid">
        <Frame caption="16x9 (cover)">
          <Img n={0} ratio="16x9" />
        </Frame>
        <Frame caption="4x3">
          <Img n={1} ratio="4x3" />
        </Frame>
        <Frame caption="1x1">
          <Img n={2} ratio="1x1" />
        </Frame>
        <Frame caption="21x9">
          <Img n={3} ratio="21x9" />
        </Frame>
        <Frame caption="3x4 (cover recorta)">
          <Img n={4} ratio="3x4" />
        </Frame>
        <Frame caption="4x5 contain (letterbox em bg-subtle)">
          <Img n={5} ratio="4x5" extra="eds-image-contain" />
        </Frame>
        <Frame caption=".eds-image-circle">
          <div className="eds-image eds-image-circle">
            <img src="/media/rosto-1.svg" alt="Rosto genérico" width={400} height={400} />
          </div>
        </Frame>
        <Frame caption="Sem proporção: altura natural (width/height no img)">
          <Img n={0} />
        </Frame>
        <Frame caption="picture com <source> (em produção: avif e webp antes do img)">
          <div className="eds-image eds-image-ratio-16x9">
            <picture>
              <source type="image/svg+xml" srcSet="/media/paisagem-2.svg" />
              <img src="/media/paisagem-2.svg" alt="Pátio interno" width={1280} height={720} />
            </picture>
            <Fallback />
          </div>
        </Frame>
      </div>
      <h4 className="eds-text-h4">Estados forçados</h4>
      <div className="md-grid">
        <Frame caption='data-state="loading" (brilho, img opacity 0)'>
          <Img n={0} ratio="16x9" state="loading" />
        </Frame>
        <Frame caption='data-state="loaded"'>
          <Img n={0} ratio="16x9" state="loaded" />
        </Frame>
        <Frame caption='data-state="error"'>
          <Img n={0} ratio="16x9" state="error" />
        </Frame>
        <Frame caption="error sem proporção (altura pelo width/height)">
          <Img n={1} state="error" />
        </Frame>
        <Frame caption="error em caixa estreita (6rem): só o ícone; o texto segue acessível">
          <div className="md-narrow">
            <Img n={2} ratio="1x1" state="error" />
          </div>
        </Frame>
        <Frame caption="error em círculo">
          <div className="eds-image eds-image-circle" data-state="error">
            <img src="/media/rosto-1.svg" alt="Rosto genérico" width={400} height={400} />
            <Fallback />
          </div>
        </Frame>
      </div>
    </section>
  );
}

function Figures() {
  return (
    <section className="md-section" aria-labelledby="md-figure">
      <h3 className="eds-text-h3" id="md-figure">
        Figure
      </h3>
      <div className="md-grid">
        <Frame caption="figure com legenda e crédito">
          <figure className="eds-figure">
            <Img n={0} ratio="16x9" />
            <figcaption className="eds-figure-caption">
              Vista da fachada norte após a pintura.
              <span className="eds-figure-credit">Foto: Fulano Fictício</span>
            </figcaption>
          </figure>
        </Frame>
        <Frame caption="só legenda, imagem em erro">
          <figure className="eds-figure">
            <Img n={1} ratio="4x3" state="error" />
            <figcaption className="eds-figure-caption">Pátio interno do bloco B.</figcaption>
          </figure>
        </Frame>
      </div>
    </section>
  );
}

function Galleries() {
  return (
    <section className="md-section" aria-labelledby="md-gallery">
      <h3 className="eds-text-h3" id="md-gallery">
        Gallery
      </h3>
      <Frame caption="Miniaturas 1:1 (os links para a imagem grande funcionam sem JS)" wide>
        <ul className="eds-gallery" data-eds-gallery aria-label="Fotos da obra">
          {lands.map((item) => (
            <li key={item.src}>
              <a className="eds-gallery-item" href={item.src} data-eds-caption={item.caption}>
                <img src={item.src} alt={item.alt} loading="lazy" />
              </a>
            </li>
          ))}
        </ul>
      </Frame>
      <Frame caption=".eds-gallery-4x3 (4 itens)" wide>
        <ul className="eds-gallery eds-gallery-4x3" aria-label="Fotos em 4:3">
          {lands.slice(0, 4).map((item) => (
            <li key={item.src}>
              <a className="eds-gallery-item" href={item.src} data-eds-caption={item.caption}>
                <img src={item.src} alt={item.alt} loading="lazy" />
              </a>
            </li>
          ))}
        </ul>
      </Frame>
    </section>
  );
}

function Lightbox({ narrow, loading }: { narrow?: boolean; loading?: boolean }) {
  return (
    <div className={narrow ? 'md-lightbox-frame md-lightbox-narrow' : 'md-lightbox-frame'}>
      <dialog open className="eds-modal eds-lightbox" data-mode="dark" aria-label="Fotos da obra">
        <header className="eds-lightbox-header">
          <span className="eds-lightbox-counter">3 de 6</span>
          <button
            type="button"
            className="eds-button eds-button-ghost eds-button-icon"
            aria-label="Fechar"
          >
            <Glyph d="M6 6l12 12M18 6L6 18" />
          </button>
        </header>
        <div className="eds-lightbox-stage" data-state={loading ? 'loading' : undefined}>
          <img src="/media/paisagem-3.svg" alt="Fundação da obra" />
        </div>
        <button type="button" className="eds-lightbox-prev" aria-label="Foto anterior">
          <Glyph d="M15 6l-6 6 6 6" />
        </button>
        <button
          type="button"
          className="eds-lightbox-next"
          aria-label="Próxima foto"
          disabled={loading}
        >
          <Glyph d="M9 6l6 6-6 6" />
        </button>
        <p className="eds-lightbox-caption">Fundação da obra</p>
      </dialog>
    </div>
  );
}

function Lightboxes() {
  return (
    <section className="md-section" aria-labelledby="md-lightbox">
      <h3 className="eds-text-h3" id="md-lightbox">
        Lightbox
      </h3>
      <Frame caption="Largo: botões sobre a imagem (data-mode=dark no dialog)" wide>
        <Lightbox />
      </Frame>
      <Frame
        caption="Estreito (22rem): botões na barra inferior; próximo desabilitado; carregando"
        wide
      >
        <Lightbox narrow loading />
      </Frame>
    </section>
  );
}

const cropStyle = (scale: number, x: string, y: string, rotate = '0deg', aspect?: number) =>
  ({
    '--_cropper-scale': scale,
    '--_cropper-x': x,
    '--_cropper-y': y,
    '--_cropper-rotate': rotate,
    ...(aspect ? { '--_cropper-aspect': aspect } : {}),
  }) as CSSProperties;

function Cropper({
  id,
  shape,
  style,
  dragging,
}: {
  id: string;
  shape: 'circle' | 'rect';
  style: CSSProperties;
  dragging?: boolean;
}) {
  return (
    <div
      className="eds-cropper"
      data-shape-crop={shape}
      data-dragging={dragging ? '' : undefined}
      style={style}
    >
      <div
        className="eds-cropper-stage eds-cropper-checker"
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- o stage é operado por teclado (setas, + e −)
        tabIndex={0}
        role="group"
        aria-label="Área de corte"
        aria-describedby={`${id}-hint`}
      >
        <img className="eds-cropper-image" src="/media/retrato-1.svg" alt="" />
        <div className="eds-cropper-frame" aria-hidden="true" />
      </div>
      <p className="eds-cropper-hint eds-text-small" id={`${id}-hint`}>
        Arraste ou use as setas para mover; + e − para ampliar.
      </p>
      <div className="eds-cropper-controls">
        <button
          type="button"
          className="eds-button eds-button-ghost eds-button-sm eds-button-icon"
          aria-label="Diminuir zoom"
          data-eds-cropper-action="zoom-out"
        >
          <Glyph d="M5 12h14" />
        </button>
        <input
          className="eds-cropper-zoom"
          type="range"
          aria-label="Zoom"
          min={100}
          max={400}
          defaultValue={140}
        />
        <button
          type="button"
          className="eds-button eds-button-ghost eds-button-sm eds-button-icon"
          aria-label="Aumentar zoom"
          data-eds-cropper-action="zoom-in"
        >
          <Glyph d="M12 5v14M5 12h14" />
        </button>
        <button
          type="button"
          className="eds-button eds-button-ghost eds-button-sm"
          data-eds-cropper-action="rotate"
        >
          Girar
        </button>
        <button
          type="button"
          className="eds-button eds-button-ghost eds-button-sm"
          data-eds-cropper-action="reset"
        >
          Restaurar
        </button>
      </div>
    </div>
  );
}

function Croppers() {
  return (
    <section className="md-section" aria-labelledby="md-cropper">
      <h3 className="eds-text-h3" id="md-cropper">
        ImageCropper
      </h3>
      <div className="md-grid">
        <Frame caption="Dentro do Modal (Ajustar foto), círculo">
          <div className="md-modal-frame">
            <dialog open className="eds-modal" aria-labelledby="md-crop-t">
              <header className="eds-modal-header">
                <h2 className="eds-modal-title" id="md-crop-t">
                  Ajustar foto
                </h2>
              </header>
              <div className="eds-modal-body">
                <Cropper id="md-c1" shape="circle" style={cropStyle(1.3, '-6px', '10px')} />
              </div>
              <footer className="eds-modal-footer">
                <button type="button" className="eds-button eds-button-secondary">
                  Cancelar
                </button>
                <button type="button" className="eds-button eds-button-primary">
                  Aplicar
                </button>
              </footer>
            </dialog>
          </div>
        </Frame>
        <Frame caption="Retângulo 4:3, arrastando (guias de terços), girado 90deg">
          <Cropper
            id="md-c2"
            shape="rect"
            dragging
            style={cropStyle(1.2, '8px', '-4px', '90deg', 4 / 3)}
          />
        </Frame>
        <Frame caption="Retângulo retrato 3:4">
          <Cropper id="md-c3" shape="rect" style={cropStyle(1, '0px', '0px', '0deg', 3 / 4)} />
        </Frame>
        <Frame caption="Prévia com .eds-avatar existente">
          <div className="eds-stack eds-stack-row eds-stack-align-start eds-gap-3">
            <span className="eds-avatar eds-avatar-lg eds-avatar-circle">
              <img src="/media/rosto-1.svg" alt="" />
            </span>
            <span className="eds-avatar eds-avatar-circle">
              <img src="/media/rosto-2.svg" alt="" />
            </span>
            <span className="eds-avatar eds-avatar-sm eds-avatar-circle">
              <img src="/media/rosto-1.svg" alt="" />
            </span>
          </div>
        </Frame>
      </div>
    </section>
  );
}

export function MediaDemo() {
  return (
    <section aria-labelledby="md-title">
      <h2 className="eds-text-h2" id="md-title">
        Imagem
      </h2>
      <Images />
      <Figures />
      <Galleries />
      <Lightboxes />
      <Croppers />
    </section>
  );
}
