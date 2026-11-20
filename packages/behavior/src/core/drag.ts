import { safeMatches } from './dom';

/**
 * Motor de arrastar compartilhado (Sortable e Tree), em Pointer Events (nunca a API HTML5 de
 * arrastar e soltar: ela não funciona em toque). Não conhece nenhum componente: quem o usa diz
 * o que pode ser pego (`grab`) e o que fazer a cada passo (`start`, `move`, `drop`, `cancel`).
 *
 * - Limiar de movimento (4 px por padrão): um clique sem mover nada nunca vira arrasto.
 * - Fantasma: clone fixo que segue o ponteiro (`pointer-events: none`, sem `id`/`name`).
 * - Rolagem automática perto da borda dos contêineres rolantes e da janela.
 * - Esc cancela; o `click` que sobra do arrasto é engolido.
 */

export interface DragSession {
  source: HTMLElement;
  pointerId: number;
  pointerType: string;
  startX: number;
  startY: number;
  /** Posição atual do ponteiro (viewport). */
  x: number;
  y: number;
  /** Onde, dentro do `source`, o ponteiro o pegou. */
  offsetX: number;
  offsetY: number;
  ghost: HTMLElement | null;
}

export interface DragHandlers {
  /** `pointerdown`: devolve o elemento a arrastar, ou `null` para ignorar. */
  grab: (event: PointerEvent) => HTMLElement | null;
  /** O limiar foi vencido. Devolver `false` aborta. */
  start?: (session: DragSession) => boolean | void;
  move: (session: DragSession) => void;
  drop: (session: DragSession) => void;
  cancel: (session: DragSession) => void;
  /** Fantasma próprio; padrão: clone de `source`. `null` = sem fantasma. */
  ghost?: (session: DragSession) => HTMLElement | null;
  /** Onde o fantasma entra; padrão: o `dialog` modal que contém o item, ou o `body`. */
  ghostHost?: (session: DragSession) => HTMLElement;
  /** Toque que deve segurar parado antes de arrastar (sem isso a página rola). */
  hold?: (event: PointerEvent) => boolean;
  /** Contêineres que rolam sozinhos; padrão: os ancestrais rolantes de `source`. */
  scrollers?: (session: DragSession) => HTMLElement[];
}

export interface DragOptions {
  /** Distância (px) para começar o arrasto. */
  threshold?: number;
  /** Quanto segurar parado (ms) quando `hold` pede; padrão 400. */
  holdMs?: number;
  /** Faixa (px) junto da borda que dispara a rolagem. */
  edge?: number;
  /** Velocidade máxima da rolagem (px por quadro). */
  maxSpeed?: number;
  /** Classe do fantasma. */
  ghostClass?: string;
}

export interface DragEngine {
  /** Cancela o arrasto em curso (chama `cancel`). */
  cancel: () => void;
  destroy: () => void;
  readonly active: DragSession | null;
}

/** Velocidade (com sinal) da rolagem para o ponteiro em `pos` dentro de [`min`, `max`]. */
export function edgeSpeed(
  pos: number,
  min: number,
  max: number,
  edge: number,
  maxSpeed: number,
): number {
  const zone = Math.min(edge, (max - min) / 3);
  if (zone <= 0) return 0;
  if (pos < min + zone) return -Math.ceil(maxSpeed * Math.min(1, (min + zone - pos) / zone));
  if (pos > max - zone) return Math.ceil(maxSpeed * Math.min(1, (pos - (max - zone)) / zone));
  return 0;
}

/** Ancestrais que rolam (overflow `auto`/`scroll`). */
export function scrollParents(el: HTMLElement): HTMLElement[] {
  const view = el.ownerDocument.defaultView;
  const found: HTMLElement[] = [];
  for (let node = el.parentElement; node; node = node.parentElement) {
    const style = view?.getComputedStyle(node);
    if (!style) continue;
    if (/(auto|scroll|overlay)/.test(`${style.overflowY} ${style.overflowX}`)) found.push(node);
  }
  return found;
}

/** `dialog:modal` aberto mais recente: o ghost precisa ficar dentro dele (top layer). */
function openModal(doc: Document): HTMLElement | null {
  const open = Array.from(doc.querySelectorAll<HTMLElement>('dialog[open]')).filter((d) =>
    safeMatches(d, ':modal'),
  );
  return open[open.length - 1] ?? null;
}

/** Clone sem `id`, `name`, foco nem semântica, para servir de fantasma. */
export function cloneGhost(source: HTMLElement, className: string): HTMLElement {
  const clone = source.cloneNode(true) as HTMLElement;
  for (const el of [clone, ...Array.from(clone.querySelectorAll<HTMLElement>('*'))]) {
    el.removeAttribute('id');
    el.removeAttribute('name');
    el.removeAttribute('tabindex');
    el.removeAttribute('data-dragging');
    el.removeAttribute('popovertarget');
    el.removeAttribute('aria-describedby');
    el.removeAttribute('aria-labelledby');
  }
  clone.classList.add(className);
  clone.setAttribute('aria-hidden', 'true');
  clone.setAttribute('inert', '');
  clone.style.removeProperty('display');
  return clone;
}

const frame = (fn: () => void): number => {
  if (typeof requestAnimationFrame === 'function') return requestAnimationFrame(fn);
  return setTimeout(fn, 16) as unknown as number;
};
const unframe = (id: number): void => {
  if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(id);
  else clearTimeout(id);
};

export function createDragEngine(
  root: HTMLElement,
  handlers: DragHandlers,
  options: DragOptions = {},
): DragEngine {
  const threshold = options.threshold ?? 4;
  const holdMs = options.holdMs ?? 400;
  const HOLD_SLOP = 8;
  const edge = options.edge ?? 32;
  const maxSpeed = options.maxSpeed ?? 18;
  const ghostClass = options.ghostClass ?? 'eds-sortable-ghost';
  const doc = root.ownerDocument;
  const win = doc.defaultView ?? window;

  let pending: {
    source: HTMLElement;
    pointerId: number;
    pointerType: string;
    startX: number;
    startY: number;
    /** Espera segurar antes de arrastar (toque sem handle). */
    needsHold: boolean;
    held: boolean;
    timer: ReturnType<typeof setTimeout> | null;
  } | null = null;
  let session: DragSession | null = null;
  let raf = 0;

  const listen = (on: boolean) => {
    const method = on ? 'addEventListener' : 'removeEventListener';
    doc[method]('pointermove', onMove as EventListener);
    doc[method]('pointerup', onUp as EventListener);
    doc[method]('pointercancel', onCancelEvent as EventListener);
    doc[method]('keydown', onKey as EventListener, true);
    doc[method]('selectstart', onSelectStart);
    doc[method]('touchmove', onTouchMove as EventListener, { passive: false });
  };

  /** Depois de segurar (ou durante o arrasto) o toque não pode rolar a página. */
  const onTouchMove = (event: TouchEvent) => {
    if (session || pending?.held) event.preventDefault();
  };

  const onSelectStart = (event: Event) => {
    if (session) event.preventDefault();
  };

  const placeGhost = () => {
    if (!session?.ghost) return;
    session.ghost.style.transform = `translate(${session.x - session.offsetX}px, ${session.y - session.offsetY}px)`;
  };

  /** Engole o `click` que o soltar do ponteiro gera (depois do `pointerup`, se ainda não veio). */
  const swallowClick = (waitForUp: boolean) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const cleanup = () => {
      doc.removeEventListener('click', stop, true);
      doc.removeEventListener('pointerup', onceUp, true);
      clearTimeout(timer);
    };
    const stop = (event: Event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      cleanup();
    };
    const onceUp = () => {
      clearTimeout(timer);
      timer = setTimeout(cleanup, 0);
    };
    doc.addEventListener('click', stop, true);
    if (waitForUp) doc.addEventListener('pointerup', onceUp, true);
    else timer = setTimeout(cleanup, 0);
  };

  const finish = () => {
    if (pending?.timer) clearTimeout(pending.timer);
    unframe(raf);
    raf = 0;
    session?.ghost?.remove();
    listen(false);
    pending = null;
    session = null;
  };

  const abort = (waitForUp = false) => {
    if (!session) return;
    const current = session;
    finish();
    handlers.cancel(current);
    swallowClick(waitForUp);
  };

  const begin = (event: PointerEvent) => {
    if (!pending) return;
    const { source } = pending;
    const rect = source.getBoundingClientRect();
    const current: DragSession = {
      source,
      pointerId: pending.pointerId,
      pointerType: pending.pointerType,
      startX: pending.startX,
      startY: pending.startY,
      x: event.clientX,
      y: event.clientY,
      offsetX: pending.startX - rect.left,
      offsetY: pending.startY - rect.top,
      ghost: null,
    };
    session = current;
    if (handlers.start?.(current) === false) {
      finish();
      return;
    }
    const ghost = handlers.ghost ? handlers.ghost(current) : cloneGhost(source, ghostClass);
    if (ghost) {
      // O CSS do core dá `position: fixed` e `pointer-events: none`; o JS só põe largura e posição.
      if (!ghost.style.inlineSize) ghost.style.inlineSize = `${rect.width}px`;
      const host = handlers.ghostHost?.(current) ?? openModal(doc) ?? doc.body;
      host.append(ghost);
      current.ghost = ghost;
      placeGhost();
    }
    handlers.move(current);
    raf = frame(tick);
  };

  /** Rola o que estiver sob o ponteiro, perto da borda. Devolve se rolou algo. */
  const autoscroll = (current: DragSession): boolean => {
    let scrolled = false;
    const list = handlers.scrollers?.(current) ?? scrollParents(current.source);
    for (const el of list) {
      const rect = el.getBoundingClientRect();
      const dy =
        current.x >= rect.left && current.x <= rect.right
          ? edgeSpeed(current.y, rect.top, rect.bottom, edge, maxSpeed)
          : 0;
      const dx =
        current.y >= rect.top && current.y <= rect.bottom
          ? edgeSpeed(current.x, rect.left, rect.right, edge, maxSpeed)
          : 0;
      if (dy !== 0) {
        el.scrollTop += dy;
        scrolled = true;
      }
      if (dx !== 0) {
        el.scrollLeft += dx;
        scrolled = true;
      }
    }
    const scroller = doc.scrollingElement;
    if (
      scroller &&
      (scroller.scrollHeight > scroller.clientHeight || scroller.scrollWidth > scroller.clientWidth)
    ) {
      const dy = edgeSpeed(current.y, 0, win.innerHeight, edge, maxSpeed);
      const dx = edgeSpeed(current.x, 0, win.innerWidth, edge, maxSpeed);
      if (dy !== 0 || dx !== 0) {
        win.scrollBy(dx, dy);
        scrolled = true;
      }
    }
    return scrolled;
  };

  function tick() {
    if (!session) return;
    if (autoscroll(session)) handlers.move(session);
    raf = frame(tick);
  }

  function onMove(event: PointerEvent) {
    if (pending && !session) {
      if (event.pointerId !== pending.pointerId) return;
      if (pending.needsHold && !pending.held) {
        // Mexeu antes de segurar: é rolagem, não arrasto.
        if (
          Math.hypot(event.clientX - pending.startX, event.clientY - pending.startY) > HOLD_SLOP
        ) {
          finish();
        }
        return;
      }
      if (pending.held) {
        begin(event);
        return;
      }
      if (Math.hypot(event.clientX - pending.startX, event.clientY - pending.startY) < threshold) {
        return;
      }
      begin(event);
      return;
    }
    if (!session || event.pointerId !== session.pointerId) return;
    session.x = event.clientX;
    session.y = event.clientY;
    placeGhost();
    handlers.move(session);
  }

  function onUp(event: PointerEvent) {
    const id = session?.pointerId ?? pending?.pointerId;
    if (event.pointerId !== id) return;
    if (!session) {
      finish();
      return;
    }
    session.x = event.clientX;
    session.y = event.clientY;
    const current = session;
    finish();
    handlers.drop(current);
    swallowClick(false);
  }

  function onCancelEvent(event: PointerEvent) {
    const id = session?.pointerId ?? pending?.pointerId;
    if (event.pointerId !== id) return;
    if (session) abort();
    else finish();
  }

  function onKey(event: KeyboardEvent) {
    if (event.key !== 'Escape' || !session) return;
    event.preventDefault();
    event.stopPropagation();
    abort(true);
  }

  const onDown = (event: PointerEvent) => {
    if (pending || session) return;
    if (event.button !== 0 || event.isPrimary === false) return;
    const source = handlers.grab(event);
    if (!source) return;
    const needsHold = event.pointerType === 'touch' && handlers.hold?.(event) === true;
    pending = {
      needsHold,
      held: false,
      timer: null,
      source,
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      startX: event.clientX,
      startY: event.clientY,
    };
    if (needsHold) {
      const current = pending;
      current.timer = setTimeout(() => {
        current.held = true;
        current.timer = null;
      }, holdMs);
    }
    listen(true);
  };

  root.addEventListener('pointerdown', onDown as EventListener);

  return {
    cancel: () => abort(false),
    destroy() {
      if (session) abort();
      else finish();
      root.removeEventListener('pointerdown', onDown as EventListener);
    },
    get active() {
      return session;
    },
  };
}
