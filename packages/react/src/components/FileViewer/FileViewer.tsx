import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
  type Ref,
} from 'react';
import {
  actualSizeZoom,
  blocksViewerKeys,
  canEmbedPdf,
  clampPan,
  clampZoom,
  formatFileSize,
  isSideways,
  nextRotation,
  readTextLimited,
  resolveViewerOptions,
  stepZoom,
  swipeDirection,
  viewerKeyAction,
  viewerKind,
  ViewerLoadError,
  type ViewerAction,
  type ViewerErrorReason,
  type ViewerItem,
  type ViewerOptions,
} from '@efds-ui/behavior/internal';
import { useAnnouncer } from '../../internal/announcer';
import { ChevronLeftGlyph, ChevronRightGlyph, CloseGlyph } from '../../internal/glyphs';
import { RotateGlyph, ZoomInGlyph, ZoomOutGlyph } from '../../internal/glyphs-image';
import {
  ViewerAlertGlyph,
  ViewerDownloadGlyph,
  ViewerExitFullscreenGlyph,
  ViewerFileGlyph,
  ViewerFitGlyph,
  ViewerFullscreenGlyph,
  ViewerOpenGlyph,
} from '../../internal/glyphs-viewer';
import { mergeRefs } from '../../internal/refs-d';
import { mergeTexts } from '../../utils/texts';
import { useLocale } from '../Locale';

export type { ViewerItem, ViewerTrack } from '@efds-ui/behavior/internal';

/** Textos internos (padrões em pt-BR). */
export interface FileViewerTexts {
  close: string;
  prev: string;
  next: string;
  /** Nome do grupo de ferramentas. */
  tools: string;
  download: string;
  openNewTab: string;
  fullscreen: string;
  exitFullscreen: string;
  zoomIn: string;
  zoomOut: string;
  fit: string;
  actualSize: string;
  rotate: string;
  /** "2 de 5" (visual). */
  position: (current: number, total: number) => string;
  /** Anúncio ao abrir e trocar: "Arquivo 2 de 5: Contrato.pdf.". */
  change: (current: number, total: number, name: string) => string;
  /** Anúncio com um arquivo só. */
  single: (name: string) => string;
  zoomStatus: (percent: number) => string;
  fitStatus: string;
  rotated: (degrees: number) => string;
  loading: (name: string) => string;
  errorTitle: string;
  errorText: string;
  errorTimeout: string;
  errorTooLarge: (limit: string) => string;
  retry: string;
  unsupportedTitle: string;
  unsupportedText: string;
  pdfLinkText: string;
  errorStatus: (name: string) => string;
  unsupportedStatus: (name: string) => string;
}

const defaultTexts: FileViewerTexts = {
  close: 'Fechar',
  prev: 'Anterior',
  next: 'Próximo',
  tools: 'Ferramentas do arquivo',
  download: 'Baixar',
  openNewTab: 'Abrir em nova aba',
  fullscreen: 'Tela cheia',
  exitFullscreen: 'Sair da tela cheia',
  zoomIn: 'Ampliar',
  zoomOut: 'Reduzir',
  fit: 'Ajustar à tela',
  actualSize: '100%, tamanho real',
  rotate: 'Girar 90 graus',
  position: (current, total) => `${current} de ${total}`,
  change: (current, total, name) => `Arquivo ${current} de ${total}: ${name}.`,
  single: (name) => `Arquivo: ${name}.`,
  zoomStatus: (percent) => `Zoom ${percent}%.`,
  fitStatus: 'Imagem ajustada à tela.',
  rotated: (degrees) => `Girada ${degrees} graus.`,
  loading: (name) => `Carregando ${name}.`,
  errorTitle: 'Não foi possível abrir o arquivo',
  errorText: 'Verifique a conexão e tente de novo, ou baixe o arquivo.',
  errorTimeout: 'A abertura demorou mais que o esperado. Tente de novo ou baixe o arquivo.',
  errorTooLarge: (limit) =>
    `O arquivo é grande demais para ver aqui (limite de ${limit}). Baixe para abrir.`,
  retry: 'Tentar de novo',
  unsupportedTitle: 'Sem pré-visualização',
  unsupportedText: 'Este tipo de arquivo não pode ser visto aqui. Baixe ou abra em nova aba.',
  pdfLinkText: 'O leitor de PDF não está disponível neste aparelho. Abra em nova aba ou baixe.',
  errorStatus: (name) => `Não foi possível abrir ${name}.`,
  unsupportedStatus: (name) => `${name}: sem pré-visualização.`,
};

export interface FileViewerProps extends ViewerOptions {
  /** Arquivos do grupo, na ordem de navegação. */
  items: readonly ViewerItem[];
  /** Índice do arquivo mostrado (controlado). Sem ele, o componente guarda o índice (começa em 0). */
  index?: number;
  /** Aberto ou fechado (como o Modal). */
  open: boolean;
  /** O arquivo mostrado mudou. */
  onIndexChange?: (index: number) => void;
  /** Pedido de fechar (Esc ou Fechar): quem controla passa `open={false}`. O fundo não fecha. */
  onClose: () => void;
  /** Ações do autor no rodapé (ex.: "Aprovar"), para o arquivo mostrado. */
  actions?: (item: ViewerItem) => ReactNode;
  texts?: Partial<FileViewerTexts>;
}

type Stage = 'loading' | 'ready' | 'error' | 'unsupported';

interface View {
  key: string;
  stage: Stage;
  reason: ViewerErrorReason | null;
  slow: boolean;
  text: string | null;
  zoom: number;
  rotation: number;
  x: number;
  y: number;
}

const SLOW_MS = 300;
const clampIndex = (i: number, total: number) => Math.min(total - 1, Math.max(0, Math.trunc(i)));
const readTheme = () =>
  typeof document === 'undefined'
    ? null
    : (document.activeElement?.closest('[data-theme]')?.getAttribute('data-theme') ??
      document.querySelector('[data-theme]')?.getAttribute('data-theme') ??
      null);
const readOrigin = () =>
  typeof document !== 'undefined' && document.activeElement instanceof HTMLElement
    ? document.activeElement
    : null;
const supportsFullscreen = () =>
  typeof HTMLElement !== 'undefined' &&
  typeof HTMLElement.prototype.requestFullscreen === 'function';

interface DialogProps extends FileViewerProps {
  dialogRef: Ref<HTMLDialogElement>;
}

function ViewerDialog({
  items,
  index: indexProp,
  onIndexChange,
  onClose,
  actions,
  texts,
  dialogRef,
  ...optionProps
}: DialogProps) {
  const t = mergeTexts(defaultTexts, texts);
  const locale = useLocale();
  const options = resolveViewerOptions(optionProps);
  const total = items.length;
  const [inner, setInner] = useState(0);
  const index = clampIndex(indexProp ?? inner, total);
  const item = items[index] as ViewerItem;
  const kind = viewerKind(item);
  const titleId = useId();

  const [origin] = useState(readOrigin);
  const [theme] = useState(readTheme);
  const [embedPdf] = useState(() => canEmbedPdf(options.pdf));
  const [fullscreenSupported] = useState(supportsFullscreen);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { text: status, announce } = useAnnouncer();

  const ownRef = useRef<HTMLDialogElement | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [attempt, setAttempt] = useState(0);

  const staticStage = (): Stage | null =>
    kind === 'other' || (kind === 'pdf' && !embedPdf) ? 'unsupported' : null;
  const key = `${index}|${attempt}|${item.src}`;
  const fresh = (k: string): View => ({
    key: k,
    stage: staticStage() ?? 'loading',
    reason: null,
    slow: false,
    text: null,
    zoom: 1,
    rotation: 0,
    x: 0,
    y: 0,
  });
  const [view, setView] = useState<View>(() => fresh(key));
  // Outro arquivo (ou outra tentativa): o estado do anterior não vale mais.
  if (view.key !== key) setView(fresh(key));
  const patch = useCallback(
    (changes: Partial<View>) => setView((v) => (v.key === key ? { ...v, ...changes } : v)),
    [key],
  );

  const isImage = kind === 'image';
  const imageReady = isImage && view.stage === 'ready';

  // Abre como modal, devolve o foco a quem abriu e descarrega tudo ao sair.
  useEffect(() => {
    const dialog = ownRef.current;
    if (!dialog) return;
    try {
      dialog.showModal();
    } catch {
      dialog.setAttribute('open', '');
    }
    closeRef.current?.focus();
    return () => {
      if (dialog.open) dialog.close();
      if (origin?.isConnected) {
        origin.focus();
        origin.scrollIntoView?.({ block: 'nearest' });
      }
    };
  }, [origin]);

  // Carregamento do arquivo atual: círculo depois de 300 ms, tempo limite e leitura do texto.
  useEffect(() => {
    announce(total > 1 ? t.change(index + 1, total, item.name) : t.single(item.name));
    if (staticStage() === 'unsupported') {
      announce(t.unsupportedStatus(item.name));
      return;
    }
    const fail = (reason: ViewerErrorReason) => {
      patch({ stage: 'error', reason });
      announce(t.errorStatus(item.name));
    };
    const slow = setTimeout(() => {
      patch({ slow: true });
      announce(t.loading(item.name));
    }, SLOW_MS);
    const limit = setTimeout(() => fail('timeout'), options.loadTimeout);
    const abort = new AbortController();
    if (kind === 'text') {
      readTextLimited(item.src, options.maxTextBytes, abort.signal)
        .then((text) => patch({ text, stage: 'ready', slow: false }))
        .catch((error: unknown) => {
          if (abort.signal.aborted) return;
          fail(error instanceof ViewerLoadError ? error.reason : 'network');
        });
    }
    return () => {
      clearTimeout(slow);
      clearTimeout(limit);
      abort.abort();
    };
    // Só a troca de arquivo ou de tentativa recarrega: os textos e as opções não.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Um elemento terminou de carregar (ou falhou): fecha o carregamento.
  const loaded = () => patch({ stage: 'ready', slow: false });
  const failed = () => {
    patch({ stage: 'error', reason: 'network', slow: false });
    announce(t.errorStatus(item.name));
  };

  // Variáveis do palco (zoom, giro e deslocamento da imagem).
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    stage.style.setProperty('--_viewer-zoom', String(view.zoom));
    stage.style.setProperty('--_viewer-x', `${view.x}px`);
    stage.style.setProperty('--_viewer-y', `${view.y}px`);
    stage.style.setProperty('--_viewer-rotate', `${view.rotation}deg`);
  }, [view.zoom, view.x, view.y, view.rotation]);

  // --- Ações da imagem ---
  const percent = (zoom: number) => {
    const img = imageRef.current;
    if (!img || !(img.naturalWidth > 0) || !(img.clientWidth > 0)) return Math.round(zoom * 100);
    return Math.round(((zoom * img.clientWidth) / img.naturalWidth) * 100);
  };
  const place = (zoom: number, rotation: number, x: number, y: number) => {
    const stage = stageRef.current;
    const img = imageRef.current;
    const bounds =
      stage && img
        ? clampPan(
            x,
            y,
            zoom,
            { width: stage.clientWidth, height: stage.clientHeight },
            { width: img.clientWidth, height: img.clientHeight },
            rotation,
          )
        : { x, y };
    patch({ zoom, rotation, x: zoom <= 1 ? 0 : bounds.x, y: zoom <= 1 ? 0 : bounds.y });
  };
  const zoomTo = (value: number) => {
    if (!imageReady) return;
    const next = clampZoom(value);
    if (next === view.zoom) return;
    place(next, view.rotation, view.x, view.y);
    announce(t.zoomStatus(percent(next)));
  };
  const fitImage = () => {
    if (!imageReady) return;
    place(1, 0, 0, 0);
    announce(t.fitStatus);
  };
  const actualSize = () => {
    const img = imageRef.current;
    if (!imageReady || !img) return;
    zoomTo(actualSizeZoom(img.naturalWidth, img.clientWidth));
  };
  const rotateImage = () => {
    if (!imageReady) return;
    const rotation = nextRotation(view.rotation);
    place(view.zoom, rotation, view.x, view.y);
    announce(t.rotated(rotation));
  };
  const panBy = (dx: number, dy: number) => {
    if (imageReady) place(view.zoom, view.rotation, view.x + dx, view.y + dy);
  };

  const go = (target: number) => {
    const next = clampIndex(target, total);
    if (next === index) return;
    // O botão que ficaria desabilitado entrega o foco ao outro lado.
    const active = document.activeElement;
    const dialog = ownRef.current;
    const prevBtn = dialog?.querySelector<HTMLElement>('.eds-viewer-prev');
    const nextBtn = dialog?.querySelector<HTMLElement>('.eds-viewer-next');
    if (active === prevBtn && next === 0) (nextBtn ?? closeRef.current)?.focus();
    else if (active === nextBtn && next === total - 1) (prevBtn ?? closeRef.current)?.focus();
    if (indexProp === undefined) setInner(next);
    onIndexChange?.(next);
  };

  const run = (action: ViewerAction) => {
    switch (action.type) {
      case 'go':
        go(action.index);
        break;
      case 'zoom-in':
        zoomTo(stepZoom(view.zoom, 1));
        break;
      case 'zoom-out':
        zoomTo(stepZoom(view.zoom, -1));
        break;
      case 'zoom-fit':
        fitImage();
        break;
      case 'zoom-actual':
        actualSize();
        break;
      case 'rotate':
        rotateImage();
        break;
      case 'pan':
        panBy(action.dx, action.dy);
        break;
    }
  };

  // Teclado e roda: ouvintes nativos (o <dialog> não é interativo para o JSX; a roda precisa de
  // `passive: false`), sempre com os valores mais recentes.
  const latest = useRef({ run, kind, index, total, imageReady, zoomTo, view });
  useEffect(() => {
    latest.current = { run, kind, index, total, imageReady, zoomTo, view };
  });
  useEffect(() => {
    const dialog = ownRef.current;
    const stage = stageRef.current;
    if (!dialog || !stage) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const c = latest.current;
      const action = viewerKeyAction({
        key: event.key,
        shiftKey: event.shiftKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        altKey: event.altKey,
        kind: c.kind,
        index: c.index,
        total: c.total,
        rtl: getComputedStyle(dialog).direction === 'rtl',
        blocked: blocksViewerKeys(event.target),
      });
      if (!action) return;
      event.preventDefault();
      c.run(action);
    };
    const onWheel = (event: WheelEvent) => {
      const c = latest.current;
      if (!event.ctrlKey || !c.imageReady) return;
      event.preventDefault();
      c.zoomTo(stepZoom(c.view.zoom, event.deltaY < 0 ? 1 : -1));
    };
    dialog.addEventListener('keydown', onKeyDown);
    stage.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      dialog.removeEventListener('keydown', onKeyDown);
      stage.removeEventListener('wheel', onWheel);
    };
  }, []);

  // Tela cheia.
  useEffect(() => {
    const dialog = ownRef.current;
    const sync = () => setIsFullscreen(document.fullscreenElement === dialog);
    document.addEventListener('fullscreenchange', sync);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      if (document.fullscreenElement === dialog) void document.exitFullscreen();
    };
  }, []);
  const toggleFullscreen = () => {
    const dialog = ownRef.current;
    if (!dialog) return;
    if (document.fullscreenElement === dialog) void document.exitFullscreen();
    else void dialog.requestFullscreen().catch(() => undefined);
  };

  // Arrastar a imagem ampliada; sem ampliar, deslizar no toque troca de arquivo.
  const drag = useRef<{ id: number; x: number; y: number; px: number; py: number } | null>(null);
  const swipe = useRef<{ id: number; x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const onDown = (event: PointerEvent) => {
    if (!imageReady || event.button !== 0) return;
    if (view.zoom > 1 + 1e-6) {
      drag.current = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        px: view.x,
        py: view.y,
      };
      setDragging(true);
      try {
        (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
      } catch {
        /* ponteiro sintético */
      }
      event.preventDefault();
    } else if (event.pointerType !== 'mouse') {
      swipe.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    }
  };
  const onMove = (event: PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== event.pointerId) return;
    place(view.zoom, view.rotation, d.px + (event.clientX - d.x), d.py + (event.clientY - d.y));
  };
  const onUp = (event: PointerEvent) => {
    if (drag.current?.id === event.pointerId) {
      drag.current = null;
      setDragging(false);
    }
    const start = swipe.current;
    swipe.current = null;
    if (event.type === 'pointerup' && start && start.id === event.pointerId) {
      const dir = swipeDirection(event.clientX - start.x, event.clientY - start.y);
      const rtl = ownRef.current ? getComputedStyle(ownRef.current).direction === 'rtl' : false;
      if (dir !== 0) go(index + (rtl ? -dir : dir));
    }
  };

  const sizeText = formatFileSize(item.size, locale);
  const detail = [item.name, sizeText].filter(Boolean).join(' · ');
  const actionsNode = actions?.(item);

  const links = (
    <>
      {options.download ? (
        <a
          className="eds-button eds-button-secondary"
          href={item.downloadUrl ?? item.src}
          download={item.name}
        >
          {t.download}
        </a>
      ) : null}
      {options.openInNewTab ? (
        <a
          className="eds-button eds-button-secondary"
          href={item.src}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t.openNewTab}
        </a>
      ) : null}
    </>
  );

  let body: ReactNode;
  if (view.stage === 'error') {
    const text =
      view.reason === 'too-large'
        ? t.errorTooLarge(formatFileSize(options.maxTextBytes, locale))
        : view.reason === 'timeout'
          ? t.errorTimeout
          : t.errorText;
    body = (
      <div className="eds-empty eds-empty-error">
        <ViewerAlertGlyph className="eds-empty-icon" />
        <h3 className="eds-empty-title">{t.errorTitle}</h3>
        <p className="eds-empty-text">{text}</p>
        {detail ? <p className="eds-empty-detail">{detail}</p> : null}
        <div className="eds-empty-actions">
          <button
            type="button"
            className="eds-button eds-button-primary"
            onClick={() => {
              closeRef.current?.focus();
              setAttempt((a) => a + 1);
            }}
          >
            {t.retry}
          </button>
          {links}
        </div>
      </div>
    );
  } else if (view.stage === 'unsupported') {
    body = (
      <div className="eds-empty">
        <ViewerFileGlyph className="eds-empty-icon" />
        <h3 className="eds-empty-title">{t.unsupportedTitle}</h3>
        <p className="eds-empty-text">{kind === 'pdf' ? t.pdfLinkText : t.unsupportedText}</p>
        {detail ? <p className="eds-empty-detail">{detail}</p> : null}
        {options.download || options.openInNewTab ? (
          <div className="eds-empty-actions">{links}</div>
        ) : null}
      </div>
    );
  } else if (kind === 'pdf') {
    body = (
      <iframe
        key={key}
        className="eds-viewer-frame"
        title={item.name}
        src={item.src}
        onLoad={loaded}
      />
    );
  } else if (kind === 'image') {
    body = (
      <img
        key={key}
        ref={imageRef}
        className="eds-viewer-image"
        src={item.src}
        alt={item.name}
        draggable={false}
        onLoad={loaded}
        onError={failed}
      />
    );
  } else if (kind === 'video') {
    body = (
      // eslint-disable-next-line jsx-a11y/media-has-caption
      <video
        key={key}
        className="eds-viewer-video"
        src={item.src}
        poster={item.poster}
        aria-label={item.name}
        controls
        playsInline
        preload="metadata"
        onLoadedMetadata={loaded}
        onError={failed}
      >
        {item.tracks?.map((track) => (
          <track
            key={track.src}
            kind={track.kind}
            src={track.src}
            srcLang={track.srclang}
            label={track.label}
          />
        ))}
      </video>
    );
  } else if (kind === 'audio') {
    body = (
      // eslint-disable-next-line jsx-a11y/media-has-caption
      <audio
        key={key}
        className="eds-viewer-audio"
        src={item.src}
        aria-label={item.name}
        controls
        preload="metadata"
        onLoadedMetadata={loaded}
        onError={failed}
      />
    );
  } else {
    body =
      view.text === null ? null : (
        // Região rolável: precisa de foco para o teclado rolar (WCAG 2.1.1).
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        <pre className="eds-viewer-text" tabIndex={0} role="region" aria-label={item.name}>
          {view.text}
        </pre>
      );
  }

  const zoomed = view.zoom > 1 + 1e-6;
  const flag = (on: boolean) => (on ? '' : undefined);
  const disabledTool = (on: boolean) => (on ? undefined : ('true' as const));
  const nothingToReset = view.zoom === 1 && view.rotation === 0 && view.x === 0 && view.y === 0;

  return (
    <dialog
      ref={mergeRefs(dialogRef, ownRef)}
      className="eds-viewer"
      aria-labelledby={titleId}
      data-mode="dark"
      data-theme={theme ?? undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header className="eds-viewer-header">
        <h2 id={titleId} className="eds-viewer-title">
          {item.name}
        </h2>
        {total > 1 ? (
          <p className="eds-viewer-position" aria-hidden="true">
            {t.position(index + 1, total)}
          </p>
        ) : null}
        <div className="eds-viewer-tools" role="group" aria-label={t.tools}>
          {isImage ? (
            <>
              <button
                type="button"
                className="eds-button eds-button-ghost eds-button-icon"
                aria-label={t.zoomOut}
                aria-disabled={disabledTool(imageReady && view.zoom > 0.25 + 1e-6)}
                onClick={() => imageReady && zoomTo(stepZoom(view.zoom, -1))}
              >
                <ZoomOutGlyph />
              </button>
              <button
                type="button"
                className="eds-button eds-button-ghost eds-button-icon"
                aria-label={t.zoomIn}
                aria-disabled={disabledTool(imageReady && view.zoom < 16 - 1e-6)}
                onClick={() => imageReady && zoomTo(stepZoom(view.zoom, 1))}
              >
                <ZoomInGlyph />
              </button>
              <button
                type="button"
                className="eds-button eds-button-ghost eds-button-icon"
                aria-label={t.fit}
                aria-disabled={disabledTool(imageReady && !nothingToReset)}
                onClick={() => imageReady && fitImage()}
              >
                <ViewerFitGlyph />
              </button>
              <button
                type="button"
                className="eds-button eds-button-ghost"
                aria-label={t.actualSize}
                aria-disabled={disabledTool(imageReady)}
                onClick={() => imageReady && actualSize()}
              >
                100%
              </button>
              <button
                type="button"
                className="eds-button eds-button-ghost eds-button-icon"
                aria-label={t.rotate}
                aria-disabled={disabledTool(imageReady)}
                onClick={() => imageReady && rotateImage()}
              >
                <RotateGlyph />
              </button>
            </>
          ) : null}
          {options.download ? (
            <a
              className="eds-button eds-button-ghost eds-button-icon"
              href={item.downloadUrl ?? item.src}
              download={item.name}
              aria-label={t.download}
            >
              <ViewerDownloadGlyph />
            </a>
          ) : null}
          {options.openInNewTab ? (
            <a
              className="eds-button eds-button-ghost eds-button-icon"
              href={item.src}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t.openNewTab}
            >
              <ViewerOpenGlyph />
            </a>
          ) : null}
          {fullscreenSupported ? (
            <button
              type="button"
              className="eds-button eds-button-ghost eds-button-icon"
              data-eds-viewer-tool="fullscreen"
              aria-label={isFullscreen ? t.exitFullscreen : t.fullscreen}
              aria-pressed={isFullscreen}
              onClick={toggleFullscreen}
            >
              {isFullscreen ? <ViewerExitFullscreenGlyph /> : <ViewerFullscreenGlyph />}
            </button>
          ) : null}
        </div>
        <button
          ref={closeRef}
          type="button"
          className="eds-button eds-button-ghost eds-button-icon eds-viewer-close"
          aria-label={t.close}
          onClick={onClose}
        >
          <CloseGlyph />
        </button>
      </header>
      <div
        ref={stageRef}
        className="eds-viewer-stage"
        data-state={view.stage}
        data-slow={flag(view.slow && view.stage === 'loading')}
        data-zoomed={flag(isImage && zoomed)}
        data-rotated={flag(isImage && isSideways(view.rotation))}
        data-dragging={flag(dragging)}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        {body}
      </div>
      {total > 1 || actionsNode ? (
        <footer className="eds-viewer-footer">
          {total > 1 ? (
            <button
              type="button"
              className="eds-button eds-button-secondary eds-viewer-prev"
              disabled={index === 0}
              onClick={() => go(index - 1)}
            >
              <ChevronLeftGlyph />
              {t.prev}
            </button>
          ) : null}
          <div className="eds-viewer-actions">{actionsNode}</div>
          {total > 1 ? (
            <button
              type="button"
              className="eds-button eds-button-secondary eds-viewer-next"
              disabled={index === total - 1}
              onClick={() => go(index + 1)}
            >
              {t.next}
              <ChevronRightGlyph />
            </button>
          ) : null}
        </footer>
      ) : null}
      <span className="eds-visually-hidden" role="status" aria-live="polite">
        {status}
      </span>
    </dialog>
  );
}

/**
 * Visualizador de arquivos num `<dialog>` modal: PDF (leitor do navegador), imagem (zoom, giro e
 * arrasto), vídeo, áudio e texto, com navegação entre os arquivos. Tipos sem pré-visualização e
 * erros mostram Baixar e Abrir em nova aba. Controlado por `open` e `onClose`; o fundo não fecha.
 * O foco volta a quem abriu. Use `useFileViewer` para abrir de qualquer lugar.
 */
export const FileViewer = forwardRef<HTMLDialogElement, FileViewerProps>(
  function FileViewer(props, ref) {
    if (!props.open || props.items.length === 0) return null;
    return <ViewerDialog {...props} dialogRef={ref} />;
  },
);
FileViewer.displayName = 'FileViewer';
