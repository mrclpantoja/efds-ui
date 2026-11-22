/**
 * Controle de interação do cortador de imagem (arrastar, roda, pinça, teclado, botões e zoom),
 * compartilhado pelo HTML (`data-eds-cropper`) e pelo React (`<ImageCropper>`). Não conhece
 * nenhum texto nem componente: recebe a raiz `.eds-cropper` pronta e só escreve as custom
 * properties `--_cropper-x/-y/-scale/-rotate` (e `--_cropper-aspect`) e `data-dragging` no palco.
 * Toda a conta está em `math.ts`.
 */
import {
  DEFAULT_MAX_ZOOM,
  clampState,
  cropFromState,
  initialState,
  panBy,
  resizeFrame,
  rotateBy,
  setZoomPercent,
  zoomAt,
  zoomPercent,
  type Crop,
  type CropState,
  type Size,
} from './math';

export interface CropperTexts {
  /** "Zoom 150%". */
  zoom: (percent: number) => string;
  /** "Girada 90°". */
  rotated: (degrees: number) => string;
  /** Status ao restaurar (Restaurado.). */
  restored: () => string;
}

export interface CropperControllerOptions {
  /** `.eds-cropper`, com palco, imagem, quadro e (opcional) controles dentro. */
  root: HTMLElement;
  /** Largura / altura do quadro de corte. */
  aspect: number;
  maxZoom?: number;
  texts: CropperTexts;
  /** Recebe o texto de status (região `role="status"` do autor). */
  announce?: (text: string) => void;
  /** Chamado a cada mudança de pan, zoom ou giro. */
  onChange?: (state: CropState) => void;
}

export interface CropperController {
  /** Tamanho natural da imagem (ou `null` ao descarregar). Reenquadra do zero. */
  setImage: (size: Size | null) => void;
  getImageSize: () => Size | null;
  getState: () => CropState;
  /** Aplica um estado vindo de fora (controlado). Não chama `onChange`. */
  setState: (state: CropState) => void;
  /** O que o quadro mostra, em pixels da imagem girada; `null` sem imagem. */
  getCrop: () => Crop | null;
  /** Tamanho medido do quadro. */
  getFrame: () => Size;
  zoomBy: (factor: number) => void;
  rotate: (degrees?: number) => void;
  reset: () => void;
  /** Mede o quadro de novo (a tela mudou de tamanho). */
  refresh: () => void;
  destroy: () => void;
}

const ZOOM_STEP = 1.15;
const KEY_STEP = 8;
const KEY_STEP_BIG = 40;
const ANNOUNCE_DELAY_MS = 450;

export function createCropperController(options: CropperControllerOptions): CropperController {
  const { root, texts } = options;
  const aspect = options.aspect > 0 && Number.isFinite(options.aspect) ? options.aspect : 1;
  const maxZoom = options.maxZoom ?? DEFAULT_MAX_ZOOM;
  const stage = root.querySelector<HTMLElement>('.eds-cropper-stage') ?? root;
  const frameEl = root.querySelector<HTMLElement>('.eds-cropper-frame');
  const range = root.querySelector<HTMLInputElement>('input.eds-cropper-zoom');
  const ac = new AbortController();
  const { signal } = ac;

  let image: Size | null = null;
  let frame: Size = { width: 0, height: 0 };
  let state: CropState = { x: 0, y: 0, scale: 1, rotation: 0 };
  let announceTimer: ReturnType<typeof setTimeout> | null = null;
  let resizeObserver: ResizeObserver | null = null;

  const measure = (): Size => {
    const rect = frameEl?.getBoundingClientRect();
    if (rect && rect.width > 0 && rect.height > 0)
      return { width: rect.width, height: rect.height };
    const outer = stage.getBoundingClientRect();
    if (outer.width > 0 && outer.height > 0) {
      const w = Math.min(outer.width, outer.height * aspect);
      return { width: w, height: w / aspect };
    }
    // Sem layout (ainda não medido): um quadro qualquer com a proporção certa.
    const width = aspect >= 1 ? 200 : 200 * aspect;
    return { width, height: width / aspect };
  };

  /** Pixels de tela por pixel da imagem quando ela está inteira dentro do palco (escala CSS 1). */
  const containScale = (): number => {
    if (!image) return 1;
    const rect = stage.getBoundingClientRect();
    // Sem layout, o palco é o quadro dividido por 0,8 (o quadro mede 80% do menor lado).
    const w = rect.width > 0 ? rect.width : frame.width / 0.8;
    const h = rect.height > 0 ? rect.height : frame.height / 0.8;
    return Math.min(w / image.width, h / image.height) || 1;
  };

  const round = (n: number, digits = 2) => {
    const f = 10 ** digits;
    return Math.round(n * f) / f;
  };

  const write = () => {
    stage.style.setProperty('--_cropper-x', `${round(state.x)}px`);
    stage.style.setProperty('--_cropper-y', `${round(state.y)}px`);
    // O CSS deixa a imagem inteira no palco (object-fit: contain): a escala dele é relativa a isso.
    stage.style.setProperty('--_cropper-scale', String(round(state.scale / containScale(), 5)));
    stage.style.setProperty('--_cropper-rotate', `${state.rotation}deg`);
    if (range && image) {
      const percent = zoomPercent(state, image, frame);
      range.min = '100';
      range.max = String(Math.round(maxZoom * 100));
      range.value = String(percent);
      range.setAttribute('aria-valuetext', `${percent}%`);
    }
  };

  const commit = (next: CropState, silent = false) => {
    state = next;
    write();
    if (!silent) options.onChange?.(state);
  };

  const announceZoom = (now = false) => {
    if (!options.announce || !image) return;
    if (announceTimer) clearTimeout(announceTimer);
    const say = () => {
      announceTimer = null;
      if (image) options.announce?.(texts.zoom(zoomPercent(state, image, frame)));
    };
    if (now) say();
    else announceTimer = setTimeout(say, ANNOUNCE_DELAY_MS);
  };

  // ---- Operações ------------------------------------------------------------------------------

  const pan = (dx: number, dy: number) => {
    if (!image) return;
    commit(panBy(state, dx, dy, image, frame, maxZoom));
  };

  /** `point` em px de tela relativos ao centro do quadro. */
  const zoomAround = (factor: number, point = { x: 0, y: 0 }) => {
    if (!image) return;
    commit(zoomAt(state, state.scale * factor, point, image, frame, maxZoom));
  };

  const api: CropperController = {
    setImage(size) {
      image = size && size.width > 0 && size.height > 0 ? { ...size } : null;
      frame = measure();
      if (image) commit(initialState(image, frame), true);
      else commit({ x: 0, y: 0, scale: 1, rotation: 0 }, true);
      if (image) options.onChange?.(state);
    },
    getImageSize: () => (image ? { ...image } : null),
    getState: () => ({ ...state }),
    setState(next) {
      if (!image) return;
      commit(clampState(next, image, frame, maxZoom), true);
    },
    getCrop: () => (image ? cropFromState(state, image, frame) : null),
    getFrame: () => ({ ...frame }),
    zoomBy(factor) {
      zoomAround(factor);
      announceZoom();
    },
    rotate(degrees = 90) {
      if (!image) return;
      commit(rotateBy(state, degrees, image, frame, maxZoom));
      options.announce?.(texts.rotated(state.rotation));
    },
    reset() {
      if (!image) return;
      frame = measure();
      commit(initialState(image, frame));
      if (announceTimer) clearTimeout(announceTimer);
      options.announce?.(texts.restored());
    },
    refresh() {
      const next = measure();
      if (next.width === frame.width && next.height === frame.height) return;
      const previous = frame;
      frame = next;
      if (image) commit(clampState(resizeFrame(state, previous, next), image, next, maxZoom));
    },
    destroy() {
      ac.abort();
      resizeObserver?.disconnect();
      if (announceTimer) clearTimeout(announceTimer);
      stage.removeAttribute('data-dragging');
    },
  };

  // ---- Ponteiro: arrastar (um dedo) e pinça (dois) ---------------------------------------------

  const pointers = new Map<number, { x: number; y: number }>();
  let pinchDistance = 0;

  const centerRel = (clientX: number, clientY: number) => {
    const rect = frameEl?.getBoundingClientRect() ?? stage.getBoundingClientRect();
    return { x: clientX - (rect.left + rect.width / 2), y: clientY - (rect.top + rect.height / 2) };
  };

  const distance = () => {
    const [a, b] = [...pointers.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };

  stage.addEventListener(
    'pointerdown',
    (event) => {
      if (!image) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      event.preventDefault();
      try {
        stage.focus({ preventScroll: true });
      } catch {
        /* sem foco: segue arrastando */
      }
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      try {
        stage.setPointerCapture(event.pointerId);
      } catch {
        /* sem captura (jsdom): os eventos seguem no palco */
      }
      stage.setAttribute('data-dragging', '');
      if (pointers.size === 2) pinchDistance = distance();
    },
    { signal },
  );

  stage.addEventListener(
    'pointermove',
    (event) => {
      const previous = pointers.get(event.pointerId);
      if (!previous || !image) return;
      const current = { x: event.clientX, y: event.clientY };
      pointers.set(event.pointerId, current);
      if (pointers.size === 1) {
        pan(current.x - previous.x, current.y - previous.y);
        return;
      }
      if (pointers.size === 2) {
        const next = distance();
        if (pinchDistance > 0 && next > 0) {
          const [a, b] = [...pointers.values()];
          if (a && b) {
            const mid = centerRel((a.x + b.x) / 2, (a.y + b.y) / 2);
            zoomAround(next / pinchDistance, mid);
            // O centro dos dedos também arrasta: soma o quanto o ponto que se moveu andou / 2.
            pan((current.x - previous.x) / 2, (current.y - previous.y) / 2);
          }
        }
        pinchDistance = next;
      }
    },
    { signal },
  );

  const release = (event: PointerEvent) => {
    if (!pointers.delete(event.pointerId)) return;
    try {
      stage.releasePointerCapture(event.pointerId);
    } catch {
      /* já solto */
    }
    if (pointers.size === 0) {
      stage.removeAttribute('data-dragging');
      if (pinchDistance > 0) announceZoom();
      pinchDistance = 0;
    } else pinchDistance = distance();
  };
  stage.addEventListener('pointerup', release, { signal });
  stage.addEventListener('pointercancel', release, { signal });

  // ---- Roda do mouse ----------------------------------------------------------------------------

  stage.addEventListener(
    'wheel',
    (event) => {
      if (!image) return;
      event.preventDefault();
      const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
      zoomAround(Math.exp(-delta * 0.002), centerRel(event.clientX, event.clientY));
      announceZoom();
    },
    { signal, passive: false },
  );

  // ---- Teclado ------------------------------------------------------------------------------------

  stage.addEventListener(
    'keydown',
    (event) => {
      if (!image || event.ctrlKey || event.metaKey || event.altKey) return;
      const step = event.shiftKey ? KEY_STEP_BIG : KEY_STEP;
      let handled = true;
      switch (event.key) {
        case 'ArrowLeft':
          pan(-step, 0);
          break;
        case 'ArrowRight':
          pan(step, 0);
          break;
        case 'ArrowUp':
          pan(0, -step);
          break;
        case 'ArrowDown':
          pan(0, step);
          break;
        case '+':
        case '=':
          api.zoomBy(ZOOM_STEP);
          break;
        case '-':
        case '_':
          api.zoomBy(1 / ZOOM_STEP);
          break;
        case 'r':
        case 'R':
          api.rotate(90);
          break;
        case '0':
          api.reset();
          break;
        default:
          handled = false;
      }
      if (handled) event.preventDefault();
    },
    { signal },
  );

  // ---- Botões e zoom deslizante -----------------------------------------------------------------

  root.addEventListener(
    'click',
    (event) => {
      const button = (event.target as Element).closest<HTMLElement>('[data-eds-cropper-action]');
      if (!button || !root.contains(button) || (button as HTMLButtonElement).disabled) return;
      switch (button.getAttribute('data-eds-cropper-action')) {
        case 'zoom-in':
          api.zoomBy(ZOOM_STEP);
          break;
        case 'zoom-out':
          api.zoomBy(1 / ZOOM_STEP);
          break;
        case 'rotate':
          api.rotate(90);
          break;
        case 'reset':
          api.reset();
          break;
        case 'pan-left':
          pan(-KEY_STEP, 0);
          break;
        case 'pan-right':
          pan(KEY_STEP, 0);
          break;
        case 'pan-up':
          pan(0, -KEY_STEP);
          break;
        case 'pan-down':
          pan(0, KEY_STEP);
          break;
        default:
      }
    },
    { signal },
  );

  range?.addEventListener(
    'input',
    () => {
      if (!image) return;
      commit(setZoomPercent(state, Number(range.value), image, frame, maxZoom));
    },
    { signal },
  );

  // ---- Tamanho -----------------------------------------------------------------------------------

  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => api.refresh());
    resizeObserver.observe(stage);
  }

  stage.style.setProperty('--_cropper-aspect', String(aspect));
  frame = measure();
  write();

  return api;
}
