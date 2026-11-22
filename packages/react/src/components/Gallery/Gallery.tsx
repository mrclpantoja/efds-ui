import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type PointerEvent,
} from 'react';
import {
  announcement,
  clampIndex,
  indexForKey,
  neighborIndexes,
  swipeDirection,
} from '@efds-ui/behavior/image';
import { useAnnouncer } from '../../internal/announcer';
import { ChevronLeftGlyph, ChevronRightGlyph, CloseGlyph } from '../../internal/glyphs';
import { ImageGlyph } from '../../internal/glyphs-image';
import { cx } from '../../utils/cx';
import { mergeTexts } from '../../utils/texts';

export interface GalleryItem {
  /** Imagem grande, aberta no visualizador (e o destino do link sem JS). */
  src: string;
  /** Miniatura. */
  thumb: string;
  /** Texto alternativo da imagem. */
  alt: string;
  caption?: string;
  /** Tamanho da miniatura, para reservar o espaço antes de carregar. */
  width?: number;
  height?: number;
}

/** Textos internos (padrões em pt-BR). */
export interface GalleryTexts {
  close: string;
  prev: string;
  next: string;
  /** "3 de 12". */
  counter: (current: number, total: number) => string;
  /** Fallback quando a imagem grande não carrega. */
  unavailable: string;
}

const defaultTexts: GalleryTexts = {
  close: 'Fechar',
  prev: 'Imagem anterior',
  next: 'Próxima imagem',
  counter: (current, total) => `${current} de ${total}`,
  unavailable: 'Imagem indisponível',
};

export interface GalleryProps extends Omit<HTMLAttributes<HTMLUListElement>, 'children'> {
  /** Nome da galeria: também nomeia o visualizador. */
  label: string;
  items: readonly GalleryItem[];
  /** Proporção das miniaturas: quadrada (padrão) ou 4x3. */
  ratio?: '1x1' | '4x3';
  /** A imagem mostrada no visualizador mudou (ou abriu). */
  onIndexChange?: (index: number) => void;
  texts?: Partial<GalleryTexts>;
}

interface LightboxProps {
  items: readonly GalleryItem[];
  index: number;
  label: string;
  theme: string | null;
  texts: GalleryTexts;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

function Lightbox({ items, index, label, theme, texts, onIndexChange, onClose }: LightboxProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const downOnDialog = useRef(false);
  const swipe = useRef<{ x: number; y: number; id: number } | null>(null);
  // Resultado do carregamento da imagem atual (por `src`: trocar de imagem volta a "carregando").
  const [loadResult, setLoadResult] = useState<{ src: string; ok: boolean } | null>(null);
  const { text: status, announce } = useAnnouncer();
  const total = items.length;
  const item = items[index];
  const imageState =
    loadResult && loadResult.src === item?.src ? (loadResult.ok ? null : 'error') : 'loading';

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    try {
      dialog.showModal();
    } catch {
      dialog.setAttribute('open', '');
    }
    // As teclas valem com o foco no diálogo: começa no Fechar (as setas das pontas ficam desabilitadas).
    dialog.querySelector<HTMLElement>('.eds-lightbox-header button')?.focus();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  // Troca de imagem: estado de carregamento, anúncio e pré-carga das vizinhas.
  useEffect(() => {
    const current = items[index];
    // Sem legenda, o alt entra no anúncio (senão só se ouviria "3 de 12").
    if (current)
      announce(announcement(texts.counter(index + 1, total), current.caption || current.alt));
    for (const n of neighborIndexes(index, total)) {
      const src = items[n]?.src;
      if (src) new window.Image().src = src;
    }
    // `texts` e `announce` não mudam a imagem mostrada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, items, total]);

  const go = useCallback(
    (target: number) => {
      const next = clampIndex(target, total);
      if (next === index) return;
      // O botão que ficaria desabilitado entrega o foco ao outro lado.
      const dialog = dialogRef.current;
      const active = document.activeElement;
      const prev = dialog?.querySelector<HTMLElement>('.eds-lightbox-prev');
      const nextBtn = dialog?.querySelector<HTMLElement>('.eds-lightbox-next');
      if (active === prev && next === 0) nextBtn?.focus();
      else if (active === nextBtn && next === total - 1) prev?.focus();
      onIndexChange(next);
    },
    [index, total, onIndexChange],
  );

  const rtl = () =>
    dialogRef.current ? getComputedStyle(dialogRef.current).direction === 'rtl' : false;

  // Teclado e fundo do diálogo: ouvintes nativos (o <dialog> não é um elemento interativo do
  // ponto de vista do JSX), sempre com os valores mais recentes.
  const latest = useRef({ index, total, go, rtl });
  useEffect(() => {
    latest.current = { index, total, go, rtl };
  });
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const { index: i, total: n, go: goTo, rtl: isRtl } = latest.current;
      const target = indexForKey(event.key, i, n, isRtl());
      if (target === null) return;
      event.preventDefault();
      goTo(target);
    };
    const onDown = (event: Event) => {
      downOnDialog.current = event.target === dialog;
    };
    const onClick = (event: Event) => {
      const hit = downOnDialog.current && event.target === dialog;
      downOnDialog.current = false;
      if (hit) dialog.close();
    };
    dialog.addEventListener('keydown', onKeyDown);
    dialog.addEventListener('pointerdown', onDown);
    dialog.addEventListener('click', onClick);
    return () => {
      dialog.removeEventListener('keydown', onKeyDown);
      dialog.removeEventListener('pointerdown', onDown);
      dialog.removeEventListener('click', onClick);
    };
  }, []);

  const onStageDown = (event: PointerEvent) => {
    swipe.current =
      event.pointerType === 'mouse'
        ? null
        : { x: event.clientX, y: event.clientY, id: event.pointerId };
  };
  const onStageUp = (event: PointerEvent) => {
    const start = swipe.current;
    swipe.current = null;
    if (!start || start.id !== event.pointerId) return;
    const dir = swipeDirection(event.clientX - start.x, event.clientY - start.y);
    if (dir !== 0) go(index + (rtl() ? -dir : dir));
  };

  return (
    <dialog
      ref={dialogRef}
      className="eds-modal eds-lightbox"
      aria-label={label}
      data-mode="dark"
      data-theme={theme ?? undefined}
      onClose={onClose}
    >
      <button
        type="button"
        className="eds-lightbox-prev"
        aria-label={texts.prev}
        disabled={index === 0}
        onClick={() => go(index - 1)}
      >
        <ChevronLeftGlyph />
      </button>
      <button
        type="button"
        className="eds-lightbox-next"
        aria-label={texts.next}
        disabled={index === total - 1}
        onClick={() => go(index + 1)}
      >
        <ChevronRightGlyph />
      </button>
      <div className="eds-lightbox-header">
        <p className="eds-lightbox-counter" aria-hidden="true">
          {texts.counter(index + 1, total)}
        </p>
        <button
          type="button"
          className="eds-button eds-button-ghost eds-button-icon"
          aria-label={texts.close}
          onClick={() => dialogRef.current?.close()}
        >
          <CloseGlyph />
        </button>
      </div>
      <div
        className="eds-lightbox-stage"
        data-state={imageState ?? undefined}
        onPointerDown={onStageDown}
        onPointerUp={onStageUp}
        onPointerCancel={() => {
          swipe.current = null;
        }}
      >
        {item ? (
          <img
            className="eds-lightbox-image"
            src={item.src}
            alt={item.alt}
            onLoad={() => setLoadResult({ src: item.src, ok: true })}
            onError={() => setLoadResult({ src: item.src, ok: false })}
          />
        ) : null}
        {imageState === 'error' ? (
          <span className="eds-image-fallback">
            <ImageGlyph />
            <span>{texts.unavailable}</span>
          </span>
        ) : null}
      </div>
      <p className="eds-lightbox-caption" hidden={!item?.caption}>
        {item?.caption}
      </p>
      <span className="eds-visually-hidden" role="status" aria-live="polite">
        {status}
      </span>
    </dialog>
  );
}

/**
 * Galeria de miniaturas que abre num visualizador (Lightbox). Sem JS cada miniatura é um link
 * para a imagem grande. Teclado: setas, Home, End e Esc; deslizar no toque; contador e legenda
 * anunciados a cada troca; o foco volta à miniatura da última imagem vista.
 */
export const Gallery = forwardRef<HTMLUListElement, GalleryProps>(function Gallery(
  { label, items, ratio = '1x1', onIndexChange, texts, className, ...rest },
  ref,
) {
  const t = mergeTexts(defaultTexts, texts);
  const [open, setOpen] = useState<{ index: number; theme: string | null } | null>(null);
  const anchors = useRef<(HTMLAnchorElement | null)[]>([]);
  const lastIndex = useRef(0);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      return;
    }
    if (wasOpen.current) {
      wasOpen.current = false;
      anchors.current[lastIndex.current]?.focus();
    }
  }, [open]);

  const show = (index: number) => {
    lastIndex.current = index;
    setOpen((current) => (current ? { ...current, index } : current));
    onIndexChange?.(index);
  };

  return (
    <>
      <ul
        {...rest}
        ref={ref}
        className={cx('eds-gallery', ratio === '4x3' && 'eds-gallery-4x3', className)}
        aria-label={label}
      >
        {items.map((item, i) => (
          <li key={`${item.src}|${i}`}>
            <a
              ref={(node) => {
                anchors.current[i] = node;
              }}
              className="eds-gallery-item"
              aria-haspopup="dialog"
              href={item.src}
              data-eds-caption={item.caption}
              onClick={(event) => {
                if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey) return;
                event.preventDefault();
                lastIndex.current = i;
                setOpen({
                  index: i,
                  theme:
                    event.currentTarget.closest('[data-theme]')?.getAttribute('data-theme') ?? null,
                });
                onIndexChange?.(i);
              }}
            >
              <img
                src={item.thumb}
                alt={item.alt}
                width={item.width}
                height={item.height}
                loading="lazy"
                decoding="async"
              />
            </a>
          </li>
        ))}
      </ul>
      {open ? (
        <Lightbox
          items={items}
          index={clampIndex(open.index, items.length)}
          label={label}
          theme={open.theme}
          texts={t}
          onIndexChange={show}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </>
  );
});
Gallery.displayName = 'Gallery';
