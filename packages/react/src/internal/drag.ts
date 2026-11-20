/**
 * Motor de arrasto por Pointer Events (privado, compartilhado por Sortable e Tree).
 * Sem a API HTML5 Drag and Drop: funciona em toque, tem limiar de movimento, fantasma que segue o
 * ponteiro, rolagem automática perto da borda, Esc para cancelar e supressão do clique que
 * encerra o arrasto. Só posição vai em estilo inline (ghost), nunca aparência.
 */

export interface DragPoint {
  x: number;
  y: number;
  event: PointerEvent;
}

export type DragOutcome = 'drop' | 'cancel';

export interface PointerDragOptions {
  /** Elemento clonado como fantasma; também define o deslocamento do ponteiro dentro dele. */
  source: HTMLElement;
  /** Distância mínima (px) antes de o arrasto começar. Padrão: 4. */
  threshold?: number;
  /**
   * Toque: o arrasto só começa depois de segurar parado por esse tempo (ms); mexer antes disso
   * abandona (a página rola). Mouse e caneta seguem o limiar normal.
   */
  touchHoldMs?: number;
  /** Classe do fantasma. Padrão: `eds-sortable-ghost`. */
  ghostClassName?: string;
  /** Contêiner rolável a acompanhar (além da janela). */
  scrollParent?: () => HTMLElement | null;
  onStart: (point: DragPoint) => void;
  onMove: (point: DragPoint) => void;
  onEnd: (point: DragPoint, outcome: DragOutcome) => void;
}

const EDGE = 32;
const SCROLL_STEP = 12;

function isScrollable(el: HTMLElement): boolean {
  const { overflowY, overflowX } = getComputedStyle(el);
  return /(auto|scroll)/.test(overflowY + overflowX);
}

/** Ancestral rolável mais próximo de `el` (ou `null`: rola a janela). */
export function findScrollParent(el: HTMLElement | null): HTMLElement | null {
  for (let node = el?.parentElement; node; node = node.parentElement) {
    if (isScrollable(node)) return node;
  }
  return null;
}

function createGhost(source: HTMLElement, className: string, rect: DOMRect): HTMLElement {
  const ghost = source.cloneNode(true) as HTMLElement;
  ghost.removeAttribute('id');
  ghost.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
  ghost.classList.add(...className.split(' ').filter(Boolean));
  ghost.setAttribute('aria-hidden', 'true');
  ghost.setAttribute('inert', '');
  ghost.removeAttribute('data-dragging');
  ghost.removeAttribute('tabindex');
  ghost.style.inlineSize = `${rect.width}px`;
  (openModal() ?? document.body).appendChild(ghost);
  return ghost;
}

/** `<dialog>` modal aberto: o fantasma precisa estar na camada superior para aparecer sobre ele. */
function openModal(): HTMLElement | null {
  const dialogs = Array.from(document.querySelectorAll<HTMLDialogElement>('dialog[open]'));
  for (let i = dialogs.length - 1; i >= 0; i -= 1) {
    try {
      if (dialogs[i]!.matches(':modal')) return dialogs[i]!;
    } catch {
      /* seletor sem suporte */
    }
  }
  return null;
}

/**
 * Começa a acompanhar o ponteiro a partir de um `pointerdown`. O arrasto só "começa" (onStart)
 * depois do limiar. Devolve uma função que cancela (chama `onEnd(..., 'cancel')` se já começou).
 */
export function beginPointerDrag(
  start: { pointerId: number; clientX: number; clientY: number; pointerType?: string },
  options: PointerDragOptions,
): () => void {
  const threshold = options.threshold ?? 4;
  const rect = options.source.getBoundingClientRect();
  const offsetX = start.clientX - rect.left;
  const offsetY = start.clientY - rect.top;
  let started = false;
  let finished = false;
  let ghost: HTMLElement | null = null;
  let last: DragPoint | null = null;
  let frame = 0;
  let holdTimer: ReturnType<typeof setTimeout> | null = null;
  const holding = options.touchHoldMs !== undefined && start.pointerType === 'touch';
  const blockScroll = (event: Event) => {
    if (event.cancelable) event.preventDefault();
  };

  const place = (x: number, y: number) => {
    if (ghost) ghost.style.transform = `translate(${x - offsetX}px, ${y - offsetY}px)`;
  };

  const autoScroll = () => {
    frame = 0;
    if (!started || finished || !last) return;
    const parent = options.scrollParent?.() ?? null;
    let scrolled = false;
    const nudge = (el: HTMLElement | null) => {
      const box = el
        ? el.getBoundingClientRect()
        : ({ top: 0, bottom: window.innerHeight } as DOMRect);
      const before = el ? el.scrollTop : window.scrollY;
      if (last!.y < box.top + EDGE) {
        if (el) el.scrollTop -= SCROLL_STEP;
        else window.scrollBy(0, -SCROLL_STEP);
      } else if (last!.y > box.bottom - EDGE) {
        if (el) el.scrollTop += SCROLL_STEP;
        else window.scrollBy(0, SCROLL_STEP);
      }
      if ((el ? el.scrollTop : window.scrollY) !== before) scrolled = true;
    };
    if (parent) nudge(parent);
    nudge(null);
    if (scrolled) {
      options.onMove(last);
      frame = requestAnimationFrame(autoScroll);
    }
  };

  const scheduleScroll = () => {
    if (frame || typeof requestAnimationFrame !== 'function') return;
    frame = requestAnimationFrame(autoScroll);
  };

  const point = (event: PointerEvent): DragPoint => ({ x: event.clientX, y: event.clientY, event });

  const cleanup = () => {
    finished = true;
    if (holdTimer) clearTimeout(holdTimer);
    document.removeEventListener('touchmove', blockScroll);
    document.removeEventListener('pointermove', onMove, true);
    document.removeEventListener('pointerup', onUp, true);
    document.removeEventListener('pointercancel', onCancel, true);
    document.removeEventListener('keydown', onKey, true);
    if (frame && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame);
    ghost?.remove();
    ghost = null;
    if (started) {
      // O clique que acompanha o pointerup não pode acionar nada (selecionar linha, abrir link).
      const swallow = (event: Event) => {
        event.stopPropagation();
        event.preventDefault();
      };
      document.addEventListener('click', swallow, true);
      setTimeout(() => document.removeEventListener('click', swallow, true), 0);
    }
  };

  const finish = (event: PointerEvent | null, outcome: DragOutcome) => {
    if (finished) return;
    const wasStarted = started;
    const p = event ? point(event) : (last ?? { x: start.clientX, y: start.clientY, event: null! });
    cleanup();
    if (wasStarted) options.onEnd(p, outcome);
  };

  function begin(from: DragPoint) {
    started = true;
    ghost = createGhost(options.source, options.ghostClassName ?? 'eds-sortable-ghost', rect);
    last = from;
    place(from.x, from.y);
    options.onStart(from);
  }

  function onMove(event: PointerEvent) {
    if (event.pointerId !== start.pointerId) return;
    if (!started) {
      if (holding) {
        last = point(event);
        // Mexeu antes de segurar o tempo todo: é rolagem, não arrasto.
        if (Math.hypot(event.clientX - start.clientX, event.clientY - start.clientY) >= 8) {
          cleanup();
        }
        return;
      }
      if (Math.hypot(event.clientX - start.clientX, event.clientY - start.clientY) < threshold) {
        return;
      }
      begin(point(event));
    }
    if (event.cancelable) event.preventDefault();
    last = point(event);
    place(last.x, last.y);
    options.onMove(last);
    scheduleScroll();
  }
  function onUp(event: PointerEvent) {
    if (event.pointerId !== start.pointerId) return;
    last = point(event);
    finish(event, 'drop');
  }
  function onCancel(event: PointerEvent) {
    if (event.pointerId !== start.pointerId) return;
    finish(event, 'cancel');
  }
  function onKey(event: KeyboardEvent) {
    if (event.key !== 'Escape') return;
    // Cancela o arrasto sem fechar o Modal/Drawer em volta.
    event.stopPropagation();
    event.preventDefault();
    finish(null, 'cancel');
  }

  if (holding) {
    holdTimer = setTimeout(() => {
      holdTimer = null;
      if (finished) return;
      document.addEventListener('touchmove', blockScroll, { passive: false });
      begin(last ?? { x: start.clientX, y: start.clientY, event: null as unknown as PointerEvent });
      options.onMove(last!);
    }, options.touchHoldMs);
  }

  document.addEventListener('pointermove', onMove, true);
  document.addEventListener('pointerup', onUp, true);
  document.addEventListener('pointercancel', onCancel, true);
  document.addEventListener('keydown', onKey, true);

  return () => finish(null, 'cancel');
}

/** O ponto (x, y) está dentro do retângulo do elemento? */
export function containsPoint(el: Element, x: number, y: number): boolean {
  const r = el.getBoundingClientRect();
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}
