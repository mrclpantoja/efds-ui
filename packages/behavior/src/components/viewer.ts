import { format, getLocale, getMessages } from '../core/config';
import { closeIcon, emit, ensureId, focusEl } from '../core/dom';
import { formatFileSize, type FileKind } from '../core/file-kind';
import { bindAll, type Behavior } from '../core/registry';
import { createAnnouncer, type Announcer } from '../core/status';
import { getViewerConfig } from '../core/viewer-config';
import {
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
  viewerKeyAction,
  viewerKind,
  ViewerLoadError,
  type ViewerAction,
  type ViewerErrorReason,
  type ViewerItem,
  type ViewerOptions,
} from '../core/viewer-logic';
import { swipeDirection } from '../image/gallery-logic';
import {
  ICON_NEXT,
  ICON_PREV,
  ICON_ROTATE,
  ICON_ZOOM_IN,
  ICON_ZOOM_OUT,
  svgIcon,
} from './image-shared';
import {
  ICON_ALERT,
  ICON_DOWNLOAD,
  ICON_EXIT_FULLSCREEN,
  ICON_FILE,
  ICON_FIT,
  ICON_FULLSCREEN,
  ICON_OPEN,
} from './viewer-shared';

export type { ViewerItem, ViewerOptions, ViewerTrack } from '../core/viewer-logic';

/** Controle devolvido por `EDS.viewer.open`. */
export interface ViewerController {
  next(): void;
  prev(): void;
  go(index: number): void;
  close(): void;
  /** Arquivo mostrado agora (`undefined` depois de fechar ou se a abertura foi cancelada). */
  readonly current: ViewerItem | undefined;
  readonly index: number;
}

/** Detalhe de `eds:viewer-open` (cancelável). `dialog` serve para preencher `.eds-viewer-actions`. */
export interface ViewerOpenDetail {
  item: ViewerItem;
  index: number;
  items: ViewerItem[];
  trigger: HTMLElement | null;
  dialog: HTMLDialogElement;
}

const SLOW_MS = 300;

interface Tools {
  zoomOut: HTMLButtonElement;
  zoomIn: HTMLButtonElement;
  fit: HTMLButtonElement;
  actual: HTMLButtonElement;
  rotate: HTMLButtonElement;
  download: HTMLAnchorElement;
  open: HTMLAnchorElement;
  fullscreen: HTMLButtonElement | null;
}

function ensure<T extends HTMLElement>(
  parent: HTMLElement,
  selector: string,
  make: () => T,
): { el: T; created: boolean } {
  const found = parent.querySelector<T>(selector);
  if (found) return { el: found, created: false };
  const el = make();
  parent.append(el);
  return { el, created: true };
}

const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
};

const iconButton = (label: string, paths: readonly string[], tool: string): HTMLButtonElement => {
  const b = el('button', 'eds-button eds-button-ghost eds-button-icon');
  b.type = 'button';
  b.setAttribute('aria-label', label);
  b.setAttribute('data-eds-viewer-tool', tool);
  b.append(svgIcon(paths));
  return b;
};

const iconLink = (label: string, paths: readonly string[], tool: string): HTMLAnchorElement => {
  const a = el('a', 'eds-button eds-button-ghost eds-button-icon');
  a.setAttribute('aria-label', label);
  a.setAttribute('data-eds-viewer-tool', tool);
  a.append(svgIcon(paths));
  return a;
};

const isRtl = (node: Element) => getComputedStyle(node).direction === 'rtl';

/** Ativa uma ferramenta que só atua em alguns estados, sem tirar o foco dela (`aria-disabled`). */
function setToolEnabled(button: HTMLElement, enabled: boolean) {
  if (enabled) button.removeAttribute('aria-disabled');
  else button.setAttribute('aria-disabled', 'true');
}

function toNumber(value: string | null): number | undefined {
  if (value === null || value.trim() === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

const KINDS: readonly FileKind[] = ['pdf', 'image', 'video', 'audio', 'text', 'other'];

/** Lê o arquivo descrito pelos atributos `data-eds-viewer-*` de um gatilho. */
export function readViewerTrigger(trigger: HTMLElement): ViewerItem | null {
  const src = trigger.getAttribute('data-eds-viewer-src') ?? trigger.getAttribute('href') ?? '';
  if (src === '') return null;
  const named = trigger.getAttribute('data-eds-viewer-name');
  const fromUrl = decodeURIComponent((src.split(/[?#]/)[0] ?? '').split('/').pop() ?? '');
  const kind = trigger.getAttribute('data-eds-viewer-kind') as FileKind | null;
  const item: ViewerItem = {
    src,
    name: (named ?? trigger.textContent ?? '').trim() || fromUrl,
  };
  const type = trigger.getAttribute('data-eds-viewer-type');
  if (type) item.type = type;
  if (kind && KINDS.includes(kind)) item.kind = kind;
  const download = trigger.getAttribute('data-eds-viewer-download');
  if (download) item.downloadUrl = download;
  const poster = trigger.getAttribute('data-eds-viewer-poster');
  if (poster) item.poster = poster;
  const size = toNumber(trigger.getAttribute('data-eds-viewer-size'));
  if (size !== undefined) item.size = size;
  return item;
}

interface Session {
  dialog: HTMLDialogElement;
  controller: ViewerController;
  close: () => void;
}

let active: Session | null = null;

/** Abre o visualizador; um só existe por vez (abrir outro fecha o atual). */
function openViewer(
  items: ViewerItem[],
  startIndex: number,
  callOptions: ViewerOptions | undefined,
  trigger: HTMLElement | null,
): ViewerController {
  active?.close();
  const total = items.length;
  const inert: ViewerController = {
    next() {},
    prev() {},
    go() {},
    close() {},
    current: undefined,
    index: 0,
  };
  if (total === 0) return inert;

  const m = getMessages();
  const options = resolveViewerOptions(getViewerConfig(), callOptions);
  let index = Math.min(total - 1, Math.max(0, Math.trunc(startIndex) || 0));

  // --- Diálogo: o do servidor (adotado) ou um gerado ---
  const adopted = document.querySelector<HTMLDialogElement>('dialog.eds-viewer');
  const dialog = adopted ?? el('dialog', 'eds-viewer');
  const owned = adopted === null;
  const ac = new AbortController();
  const { signal } = ac;

  if (!dialog.hasAttribute('data-mode')) dialog.setAttribute('data-mode', 'dark');
  const theme = (trigger ?? document.body).closest('[data-theme]')?.getAttribute('data-theme');
  if (theme && !dialog.hasAttribute('data-theme')) dialog.setAttribute('data-theme', theme);

  const header = ensure(dialog, '.eds-viewer-header', () => el('header', 'eds-viewer-header')).el;
  const title = ensure(header, '.eds-viewer-title', () => el('h2', 'eds-viewer-title')).el;
  const position = ensure(header, '.eds-viewer-position', () => el('p', 'eds-viewer-position')).el;
  const tools = ensure(header, '.eds-viewer-tools', () => {
    const t = el('div', 'eds-viewer-tools');
    t.setAttribute('role', 'group');
    return t;
  }).el;
  const closeBtn = ensure(header, '.eds-viewer-close', () => {
    const b = el('button', 'eds-button eds-button-ghost eds-button-icon eds-viewer-close');
    b.type = 'button';
    b.append(closeIcon());
    return b;
  }).el;
  const stage = ensure(dialog, '.eds-viewer-stage', () => el('div', 'eds-viewer-stage')).el;
  const footer = ensure(dialog, '.eds-viewer-footer', () => el('footer', 'eds-viewer-footer')).el;
  const prev = ensure(footer, '.eds-viewer-prev', () => {
    const b = el('button', 'eds-button eds-button-secondary eds-viewer-prev');
    b.type = 'button';
    return b;
  }).el;
  const actions = ensure(footer, '.eds-viewer-actions', () => el('div', 'eds-viewer-actions')).el;
  const next = ensure(footer, '.eds-viewer-next', () => {
    const b = el('button', 'eds-button eds-button-secondary eds-viewer-next');
    b.type = 'button';
    return b;
  }).el;
  const status = ensure(dialog, '[role="status"]', () => {
    const s = el('span', 'eds-visually-hidden');
    s.setAttribute('role', 'status');
    s.setAttribute('aria-live', 'polite');
    return s;
  }).el;
  // Ordem visual: o conteúdo gerado segue header, palco e rodapé, mesmo se o servidor trouxe só parte.
  dialog.append(header, stage, footer, status);

  dialog.setAttribute('aria-labelledby', ensureId(title, 'viewer-title'));
  dialog.removeAttribute('aria-label');
  closeBtn.setAttribute('aria-label', m.viewerClose);
  closeBtn.setAttribute('data-eds-close', '');
  tools.setAttribute('aria-label', m.viewerTools);
  position.setAttribute('aria-hidden', 'true');
  prev.replaceChildren(svgIcon(ICON_PREV), document.createTextNode(m.viewerPrev));
  next.replaceChildren(document.createTextNode(m.viewerNext), svgIcon(ICON_NEXT));

  // --- Ferramentas (as do servidor, se existirem; senão geradas) ---
  const tool = <T extends HTMLElement>(name: string, make: () => T): T => {
    const found = tools.querySelector<T>(`[data-eds-viewer-tool="${name}"]`);
    if (found) return found;
    const created = make();
    tools.append(created);
    return created;
  };
  const t: Tools = {
    zoomOut: tool('zoom-out', () => iconButton(m.viewerZoomOut, ICON_ZOOM_OUT, 'zoom-out')),
    zoomIn: tool('zoom-in', () => iconButton(m.viewerZoomIn, ICON_ZOOM_IN, 'zoom-in')),
    fit: tool('fit', () => iconButton(m.viewerFit, ICON_FIT, 'fit')),
    actual: tool('actual', () => {
      const b = el('button', 'eds-button eds-button-ghost');
      b.type = 'button';
      b.textContent = '100%';
      b.setAttribute('aria-label', m.viewerActualSize);
      b.setAttribute('data-eds-viewer-tool', 'actual');
      return b;
    }),
    rotate: tool('rotate', () => iconButton(m.viewerRotate, ICON_ROTATE, 'rotate')),
    download: tool('download', () => iconLink(m.viewerDownload, ICON_DOWNLOAD, 'download')),
    open: tool('open', () => {
      const a = iconLink(m.viewerOpenNewTab, ICON_OPEN, 'open');
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      return a;
    }),
    fullscreen:
      typeof dialog.requestFullscreen === 'function'
        ? tool('fullscreen', () => iconButton(m.viewerFullscreen, ICON_FULLSCREEN, 'fullscreen'))
        : null,
  };
  const zoomTools = [t.zoomOut, t.zoomIn, t.fit, t.actual, t.rotate];

  const announcer: Announcer = createAnnouncer(status);
  const say = (text: string) => announcer.say(text);

  // --- Estado do item mostrado ---
  let load = 0;
  let loadAbort: AbortController | null = null;
  let slowTimer: ReturnType<typeof setTimeout> | null = null;
  let limitTimer: ReturnType<typeof setTimeout> | null = null;
  let kind: FileKind = 'other';
  let ready = false;
  let zoom = 1;
  let rotation = 0;
  let panX = 0;
  let panY = 0;
  let image: HTMLImageElement | null = null;
  let finished = false;

  const eventTarget = (): Element => (trigger?.isConnected ? trigger : dialog);
  const currentItem = () => items[index];

  const clearTimers = () => {
    if (slowTimer) clearTimeout(slowTimer);
    if (limitTimer) clearTimeout(limitTimer);
    slowTimer = null;
    limitTimer = null;
  };

  /** Descarrega o que está no palco (PDF, vídeo e áudio param de verdade). */
  const clearStage = () => {
    loadAbort?.abort();
    loadAbort = null;
    clearTimers();
    const hadFocus = stage.contains(document.activeElement);
    for (const frame of stage.querySelectorAll('iframe')) frame.src = 'about:blank';
    for (const media of stage.querySelectorAll<HTMLMediaElement>('video, audio')) {
      media.pause();
      media.removeAttribute('src');
      for (const track of media.querySelectorAll('track')) track.remove();
      try {
        media.load();
      } catch {
        /* sem suporte de mídia (jsdom) */
      }
    }
    for (const img of stage.querySelectorAll('img')) img.removeAttribute('src');
    stage.replaceChildren();
    stage.removeAttribute('data-slow');
    stage.removeAttribute('data-zoomed');
    stage.removeAttribute('data-rotated');
    stage.removeAttribute('data-dragging');
    for (const prop of ['--_viewer-zoom', '--_viewer-x', '--_viewer-y', '--_viewer-rotate'])
      stage.style.removeProperty(prop);
    image = null;
    if (hadFocus) focusEl(closeBtn);
  };

  const percent = () => {
    if (!image || !(image.naturalWidth > 0) || !(image.clientWidth > 0))
      return Math.round(zoom * 100);
    return Math.round(((zoom * image.clientWidth) / image.naturalWidth) * 100);
  };

  const updateTools = () => {
    const isImage = kind === 'image';
    for (const b of zoomTools) b.hidden = !isImage;
    if (!isImage) return;
    const live = ready;
    setToolEnabled(t.zoomOut, live && zoom > 0.25 + 1e-6);
    setToolEnabled(t.zoomIn, live && zoom < 16 - 1e-6);
    setToolEnabled(t.fit, live && (zoom !== 1 || rotation !== 0 || panX !== 0 || panY !== 0));
    setToolEnabled(t.actual, live);
    setToolEnabled(t.rotate, live);
  };

  const applyImage = () => {
    if (image) {
      const bounds = clampPan(
        panX,
        panY,
        zoom,
        { width: stage.clientWidth, height: stage.clientHeight },
        { width: image.clientWidth, height: image.clientHeight },
        rotation,
      );
      panX = bounds.x;
      panY = bounds.y;
    }
    stage.style.setProperty('--_viewer-zoom', String(zoom));
    stage.style.setProperty('--_viewer-x', `${panX}px`);
    stage.style.setProperty('--_viewer-y', `${panY}px`);
    stage.style.setProperty('--_viewer-rotate', `${rotation}deg`);
    stage.toggleAttribute('data-zoomed', zoom > 1 + 1e-6);
    stage.toggleAttribute('data-rotated', isSideways(rotation));
    updateTools();
  };

  const setZoom = (value: number, announce = true) => {
    if (kind !== 'image' || !ready) return;
    const next = clampZoom(value);
    if (next === zoom) return;
    zoom = next;
    if (zoom <= 1) {
      panX = 0;
      panY = 0;
    }
    applyImage();
    if (announce) say(format(m.viewerZoomStatus, { percent: percent() }));
  };

  const fitImage = () => {
    if (kind !== 'image' || !ready) return;
    zoom = 1;
    rotation = 0;
    panX = 0;
    panY = 0;
    applyImage();
    say(m.viewerFitStatus);
  };

  const actualSize = () => {
    if (!image || !ready) return;
    const target = actualSizeZoom(image.naturalWidth, image.clientWidth);
    if (target === zoom) {
      say(format(m.viewerZoomStatus, { percent: percent() }));
      return;
    }
    setZoom(target);
  };

  const rotateImage = () => {
    if (kind !== 'image' || !ready) return;
    rotation = nextRotation(rotation);
    applyImage();
    say(format(m.viewerRotated, { degrees: rotation }));
  };

  const panBy = (dx: number, dy: number) => {
    if (kind !== 'image' || !ready) return;
    panX += dx;
    panY += dy;
    applyImage();
  };

  // --- Estados do palco ---
  const setState = (state: 'loading' | 'ready' | 'error' | 'unsupported') => {
    stage.setAttribute('data-state', state);
    if (state !== 'loading') stage.removeAttribute('data-slow');
    ready = state === 'ready';
    updateTools();
  };

  const downloadHref = (item: ViewerItem) => item.downloadUrl ?? item.src;

  /** Aviso no palco com ícone, texto e as ações possíveis. */
  const message = (
    item: ViewerItem,
    opts: { tone: 'error' | 'plain'; title: string; text: string; retry: boolean },
  ) => {
    stage.replaceChildren();
    const box = el('div', opts.tone === 'error' ? 'eds-empty eds-empty-error' : 'eds-empty');
    box.append(svgIcon(opts.tone === 'error' ? ICON_ALERT : ICON_FILE, 'eds-empty-icon'));
    const h = el('h3', 'eds-empty-title');
    h.textContent = opts.title;
    const p = el('p', 'eds-empty-text');
    p.textContent = opts.text;
    box.append(h, p);
    const detail = [item.name, formatFileSize(item.size, getLocale())].filter(Boolean).join(' · ');
    if (detail) {
      const d = el('p', 'eds-empty-detail');
      d.textContent = detail;
      box.append(d);
    }
    const row = el('div', 'eds-empty-actions');
    if (opts.retry) {
      const retry = el('button', 'eds-button eds-button-primary');
      retry.type = 'button';
      retry.textContent = m.viewerRetry;
      retry.addEventListener('click', () => show(index, false), { signal });
      row.append(retry);
    }
    if (options.download) {
      const a = el('a', 'eds-button eds-button-secondary');
      a.href = downloadHref(item);
      a.setAttribute('download', item.name);
      a.textContent = m.viewerDownload;
      row.append(a);
    }
    if (options.openInNewTab) {
      const a = el('a', 'eds-button eds-button-secondary');
      a.href = item.src;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = m.viewerOpenNewTab;
      row.append(a);
    }
    if (row.childElementCount > 0) box.append(row);
    stage.append(box);
  };

  const errorText = (reason: ViewerErrorReason): string => {
    if (reason === 'too-large')
      return format(m.viewerErrorTooLarge, {
        size: formatFileSize(options.maxTextBytes, getLocale()),
      });
    return reason === 'timeout' ? m.viewerErrorTimeout : m.viewerErrorText;
  };

  const unsupported = (item: ViewerItem, text: string) => {
    message(item, { tone: 'plain', title: m.viewerUnsupportedTitle, text, retry: false });
    setState('unsupported');
    say(format(m.viewerUnsupportedStatus, { name: item.name }));
  };

  // --- Mostra um arquivo ---
  function show(i: number, notify: boolean) {
    const item = items[i];
    if (!item) return;
    index = i;
    const token = ++load;
    clearStage();
    kind = viewerKind(item);
    ready = false;
    zoom = 1;
    rotation = 0;
    panX = 0;
    panY = 0;

    title.textContent = item.name;
    position.textContent = format(m.viewerPosition, { current: i + 1, total });
    position.hidden = total === 1;
    prev.hidden = total === 1;
    next.hidden = total === 1;
    footer.hidden = total === 1 && actions.childElementCount === 0;
    const focused = document.activeElement;
    prev.disabled = i === 0;
    next.disabled = i === total - 1;
    if (focused === prev && prev.disabled) focusEl(next.disabled ? closeBtn : next);
    else if (focused === next && next.disabled) focusEl(prev.disabled ? closeBtn : prev);

    t.download.hidden = !options.download;
    t.download.href = downloadHref(item);
    t.download.setAttribute('download', item.name);
    t.open.hidden = !options.openInNewTab;
    t.open.href = item.src;

    say(
      total > 1
        ? format(m.viewerChange, { current: i + 1, total, name: item.name })
        : format(m.viewerSingle, { name: item.name }),
    );

    const done = () => {
      if (token !== load || finished) return;
      clearTimers();
      setState('ready');
      applyImage();
    };
    const fail = (reason: ViewerErrorReason) => {
      if (token !== load || finished) return;
      clearStage();
      message(item, {
        tone: 'error',
        title: m.viewerErrorTitle,
        text: errorText(reason),
        retry: true,
      });
      setState('error');
      say(format(m.viewerErrorStatus, { name: item.name }));
      emit(eventTarget(), 'viewer-error', { item, reason });
    };

    updateTools();

    if (kind === 'other' || (kind === 'pdf' && !canEmbedPdf(options.pdf))) {
      unsupported(item, kind === 'pdf' ? m.viewerPdfLinkText : m.viewerUnsupportedText);
      if (notify) emit(eventTarget(), 'viewer-change', { item, index: i });
      return;
    }

    setState('loading');
    slowTimer = setTimeout(() => {
      if (token !== load) return;
      stage.setAttribute('data-slow', '');
      say(format(m.viewerLoading, { name: item.name }));
    }, SLOW_MS);
    limitTimer = setTimeout(() => fail('timeout'), options.loadTimeout);

    if (kind === 'pdf') {
      const frame = el('iframe', 'eds-viewer-frame');
      frame.title = item.name;
      frame.addEventListener('load', done);
      frame.src = item.src;
      stage.append(frame);
    } else if (kind === 'image') {
      const img = el('img', 'eds-viewer-image');
      img.alt = item.name;
      img.draggable = false;
      img.addEventListener('load', done);
      img.addEventListener('error', () => fail('network'));
      img.src = item.src;
      image = img;
      stage.append(img);
    } else if (kind === 'video' || kind === 'audio') {
      const media = el(kind === 'video' ? 'video' : 'audio', `eds-viewer-${kind}`);
      media.controls = true;
      media.preload = 'metadata';
      media.setAttribute('aria-label', item.name);
      if (media instanceof HTMLVideoElement) {
        media.playsInline = true;
        if (item.poster) media.poster = item.poster;
      }
      for (const track of item.tracks ?? []) {
        const tr = el('track');
        tr.kind = track.kind;
        tr.src = track.src;
        tr.srclang = track.srclang;
        tr.label = track.label;
        media.append(tr);
      }
      media.addEventListener('loadedmetadata', done);
      media.addEventListener('error', () => fail('network'));
      media.src = item.src;
      stage.append(media);
    } else {
      loadAbort = new AbortController();
      const abort = loadAbort;
      readTextLimited(item.src, options.maxTextBytes, abort.signal)
        .then((text) => {
          if (token !== load || finished) return;
          const pre = el('pre', 'eds-viewer-text');
          pre.tabIndex = 0;
          pre.setAttribute('role', 'region');
          pre.setAttribute('aria-label', item.name);
          pre.textContent = text;
          stage.append(pre);
          done();
        })
        .catch((error: unknown) => {
          if (abort.signal.aborted) return;
          fail(error instanceof ViewerLoadError ? error.reason : 'network');
        });
    }

    if (notify) emit(eventTarget(), 'viewer-change', { item, index: i });
  }

  const go = (i: number) => {
    const target = Math.min(total - 1, Math.max(0, Math.trunc(i)));
    if (target !== index) show(target, true);
  };

  const run = (action: ViewerAction) => {
    switch (action.type) {
      case 'go':
        go(action.index);
        break;
      case 'zoom-in':
        setZoom(stepZoom(zoom, 1));
        break;
      case 'zoom-out':
        setZoom(stepZoom(zoom, -1));
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

  // --- Ligações ---
  const gated = (button: HTMLElement, fn: () => void) =>
    button.addEventListener(
      'click',
      () => {
        if (button.getAttribute('aria-disabled') === 'true') return;
        fn();
      },
      { signal },
    );
  gated(t.zoomOut, () => setZoom(stepZoom(zoom, -1)));
  gated(t.zoomIn, () => setZoom(stepZoom(zoom, 1)));
  gated(t.fit, fitImage);
  gated(t.actual, actualSize);
  gated(t.rotate, rotateImage);
  prev.addEventListener('click', () => go(index - 1), { signal });
  next.addEventListener('click', () => go(index + 1), { signal });
  closeBtn.addEventListener('click', () => dialog.close(), { signal });

  const syncFullscreen = () => {
    const button = t.fullscreen;
    if (!button) return;
    const on = document.fullscreenElement === dialog;
    button.setAttribute('aria-label', on ? m.viewerExitFullscreen : m.viewerFullscreen);
    button.setAttribute('aria-pressed', String(on));
    button.replaceChildren(svgIcon(on ? ICON_EXIT_FULLSCREEN : ICON_FULLSCREEN));
  };
  if (t.fullscreen) {
    syncFullscreen();
    t.fullscreen.addEventListener(
      'click',
      () => {
        if (document.fullscreenElement === dialog) void document.exitFullscreen();
        else void dialog.requestFullscreen().catch(() => undefined);
      },
      { signal },
    );
    document.addEventListener('fullscreenchange', syncFullscreen, { signal });
  }

  dialog.addEventListener(
    'keydown',
    (event) => {
      const action = viewerKeyAction({
        key: event.key,
        shiftKey: event.shiftKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        altKey: event.altKey,
        kind,
        index,
        total,
        rtl: isRtl(dialog),
        blocked: blocksViewerKeys(event.target),
      });
      if (!action) return;
      event.preventDefault();
      run(action);
    },
    { signal },
  );

  stage.addEventListener(
    'wheel',
    (event) => {
      if (!event.ctrlKey || kind !== 'image' || !ready) return;
      event.preventDefault();
      setZoom(stepZoom(zoom, event.deltaY < 0 ? 1 : -1));
    },
    { signal, passive: false },
  );

  // Arrastar a imagem ampliada; sem ampliar, deslizar no toque troca de arquivo.
  let drag: { id: number; x: number; y: number; px: number; py: number } | null = null;
  let swipe: { id: number; x: number; y: number } | null = null;
  stage.addEventListener(
    'pointerdown',
    (event) => {
      if (kind !== 'image' || !ready || event.button !== 0) return;
      if (zoom > 1 + 1e-6) {
        drag = { id: event.pointerId, x: event.clientX, y: event.clientY, px: panX, py: panY };
        stage.setAttribute('data-dragging', '');
        try {
          stage.setPointerCapture(event.pointerId);
        } catch {
          /* ponteiro sintético */
        }
        event.preventDefault();
      } else if (event.pointerType !== 'mouse') {
        swipe = { id: event.pointerId, x: event.clientX, y: event.clientY };
      }
    },
    { signal },
  );
  stage.addEventListener(
    'pointermove',
    (event) => {
      if (!drag || drag.id !== event.pointerId) return;
      panX = drag.px + (event.clientX - drag.x);
      panY = drag.py + (event.clientY - drag.y);
      applyImage();
    },
    { signal },
  );
  const endPointer = (event: PointerEvent) => {
    if (drag && drag.id === event.pointerId) {
      drag = null;
      stage.removeAttribute('data-dragging');
    }
    const start = swipe;
    swipe = null;
    if (event.type === 'pointerup' && start && start.id === event.pointerId) {
      const dir = swipeDirection(event.clientX - start.x, event.clientY - start.y);
      if (dir !== 0) go(index + (isRtl(dialog) ? -dir : dir));
    }
  };
  stage.addEventListener('pointerup', endPointer, { signal });
  stage.addEventListener('pointercancel', endPointer, { signal });

  const finish = () => {
    if (finished) return;
    finished = true;
    const item = currentItem();
    const last = index;
    ac.abort();
    clearStage();
    announcer.dispose();
    if (document.fullscreenElement === dialog) void document.exitFullscreen();
    if (owned) dialog.remove();
    else {
      // O diálogo do servidor volta ao que era: sem estado do palco nem textos desta abertura.
      stage.removeAttribute('data-state');
      status.textContent = '';
    }
    if (active?.dialog === dialog) active = null;
    const origin = trigger?.isConnected ? trigger : null;
    if (origin) {
      focusEl(origin);
      origin.scrollIntoView?.({ block: 'nearest' });
    }
    if (item) emit(origin ?? document.body, 'viewer-close', { item, index: last });
  };
  dialog.addEventListener('close', finish, { once: true });

  const controller: ViewerController = {
    next: () => go(index + 1),
    prev: () => go(index - 1),
    go,
    close: () => {
      // Fecha e encerra na hora: o evento `close` do navegador chega depois e já não encontra nada.
      if (dialog.open) dialog.close();
      finish();
    },
    get current() {
      return finished ? undefined : currentItem();
    },
    get index() {
      return index;
    },
  };

  if (owned) document.body.append(dialog);
  const detail: ViewerOpenDetail = {
    item: items[index] as ViewerItem,
    index,
    items,
    trigger,
    dialog,
  };
  const proceed = emit(trigger?.isConnected ? trigger : dialog, 'viewer-open', detail, true);
  if (!proceed) {
    finished = true;
    ac.abort();
    announcer.dispose();
    if (owned) dialog.remove();
    return inert;
  }

  active = { dialog, controller, close: () => controller.close() };
  try {
    dialog.showModal();
  } catch {
    dialog.setAttribute('open', '');
  }
  show(index, false);
  focusEl(closeBtn);
  return controller;
}

export const viewer = {
  /**
   * Abre o visualizador com `items` no `index`. Opções (`pdf`, `loadTimeout`, `maxTextBytes`,
   * `download`, `openInNewTab`) somam-se às de `configure({ viewer })`. O foco volta ao elemento
   * que tinha o foco ao abrir.
   */
  open(items: ViewerItem[], index = 0, options?: ViewerOptions): ViewerController {
    const origin = document.activeElement;
    const trigger =
      origin instanceof HTMLElement && origin !== document.body && !origin.closest('dialog')
        ? origin
        : null;
    return openViewer(items, index, options, trigger);
  },
  /** Fecha o visualizador aberto, se houver. */
  close(): void {
    active?.close();
  },
};

/** Abre a partir de um gatilho declarativo (usado pelo behavior e, por dentro, pelo gerenciador). */
export function openViewerFrom(
  items: ViewerItem[],
  index: number,
  trigger: HTMLElement | null,
  options?: ViewerOptions,
): ViewerController {
  return openViewer(items, index, options, trigger);
}

/**
 * Gatilho do visualizador (`[data-eds-viewer]`): um link (`href`) ou botão (`data-eds-viewer-src`)
 * que abre o arquivo no diálogo. Itens com o mesmo `data-eds-viewer-group` navegam entre si, na
 * ordem do documento. Sem JS, o link abre o arquivo em outra página. Clique com Ctrl, Cmd, Shift
 * ou botão do meio segue o link normal.
 */
export const viewerBehavior: Behavior = {
  name: 'viewer',
  selector: '[data-eds-viewer]',
  bind(trigger) {
    const ac = new AbortController();
    const marked = !trigger.hasAttribute('aria-haspopup');
    if (marked) trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.addEventListener(
      'click',
      (event) => {
        if (event.defaultPrevented || event.button !== 0) return;
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        const own = readViewerTrigger(trigger);
        if (!own) return;
        event.preventDefault();
        const group = trigger.getAttribute('data-eds-viewer-group') ?? '';
        const items: ViewerItem[] = [];
        let start = 0;
        if (group === '') items.push(own);
        else {
          for (const other of document.querySelectorAll<HTMLElement>('[data-eds-viewer]')) {
            if ((other.getAttribute('data-eds-viewer-group') ?? '') !== group) continue;
            const item = readViewerTrigger(other);
            if (!item) continue;
            if (other === trigger) start = items.length;
            items.push(item);
          }
        }
        openViewer(items, start, undefined, trigger);
      },
      { signal: ac.signal },
    );
    return () => {
      ac.abort();
      if (marked) trigger.removeAttribute('aria-haspopup');
    };
  },
};

export function initViewer(root: ParentNode = document): () => void {
  return bindAll(root, [viewerBehavior]);
}
