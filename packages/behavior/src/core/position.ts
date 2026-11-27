/**
 * Posicionamento de balões (Tooltip e Popover) em coordenadas de viewport (`position: fixed`).
 * Puro: recebe os retângulos e devolve o canto superior esquerdo e a posição realmente usada.
 */
export type Placement = 'top' | 'bottom' | 'start' | 'end';

export const PLACEMENTS: readonly Placement[] = ['top', 'bottom', 'start', 'end'];

export function isPlacement(value: string | null | undefined): value is Placement {
  return value === 'top' || value === 'bottom' || value === 'start' || value === 'end';
}

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface PositionOptions {
  anchor: Box;
  size: { width: number; height: number };
  viewport: { width: number; height: number };
  placement: Placement;
  /** Distância entre o gatilho e o balão. */
  gap: number;
  /** `center` centraliza no eixo transversal (Tooltip); `start` alinha ao início do gatilho (Popover). */
  align: 'center' | 'start';
  /** Leitura da direita para a esquerda: `start` e `end` se invertem. */
  rtl: boolean;
  /** Margem mínima até a borda da viewport. */
  margin: number;
}

export interface PositionResult {
  x: number;
  y: number;
  placement: Placement;
}

const OPPOSITE: Record<Placement, Placement> = {
  top: 'bottom',
  bottom: 'top',
  start: 'end',
  end: 'start',
};

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(value, Math.max(min, max)));

/** Espaço livre no lado `placement` do gatilho, descontado o gap e a margem. */
function room(o: PositionOptions, placement: Placement): number {
  const { anchor, viewport, margin, gap } = o;
  const physical = physicalSide(placement, o.rtl);
  switch (physical) {
    case 'top':
      return anchor.top - gap - margin;
    case 'bottom':
      return viewport.height - (anchor.top + anchor.height) - gap - margin;
    case 'left':
      return anchor.left - gap - margin;
    default:
      return viewport.width - (anchor.left + anchor.width) - gap - margin;
  }
}

function physicalSide(placement: Placement, rtl: boolean): 'top' | 'bottom' | 'left' | 'right' {
  if (placement === 'top' || placement === 'bottom') return placement;
  const left = (placement === 'start') !== rtl;
  return left ? 'left' : 'right';
}

function needed(o: PositionOptions, placement: Placement): number {
  return placement === 'top' || placement === 'bottom' ? o.size.height : o.size.width;
}

/** Escolhe o lado pedido; se não couber e o oposto couber melhor, vira. */
export function computePosition(o: PositionOptions): PositionResult {
  let placement = o.placement;
  if (room(o, placement) < needed(o, placement)) {
    const opposite = OPPOSITE[placement];
    if (room(o, opposite) > room(o, placement)) placement = opposite;
  }
  const { anchor, size, viewport, gap, margin } = o;
  const physical = physicalSide(placement, o.rtl);
  let x: number;
  let y: number;
  if (physical === 'top' || physical === 'bottom') {
    y = physical === 'top' ? anchor.top - gap - size.height : anchor.top + anchor.height + gap;
    if (o.align === 'center') x = anchor.left + anchor.width / 2 - size.width / 2;
    else x = o.rtl ? anchor.left + anchor.width - size.width : anchor.left;
  } else {
    x = physical === 'left' ? anchor.left - gap - size.width : anchor.left + anchor.width + gap;
    y = o.align === 'center' ? anchor.top + anchor.height / 2 - size.height / 2 : anchor.top;
  }
  x = clamp(x, margin, viewport.width - size.width - margin);
  y = clamp(y, margin, viewport.height - size.height - margin);
  return { x: Math.round(x), y: Math.round(y), placement };
}

/** Retângulo do elemento como `Box`. */
export function boxOf(el: Element): Box {
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}

export function isRtl(el: Element): boolean {
  return getComputedStyle(el).direction === 'rtl';
}

/**
 * Posiciona `popup` junto a `anchor`: grava `--_<prefix>-x/-y` (px, canto superior esquerdo,
 * viewport) e `data-placement`. Devolve a posição usada.
 */
export function placeBalloon(
  anchor: Element,
  popup: HTMLElement,
  prefix: string,
  preferred: Placement,
  align: 'center' | 'start',
  gap: number,
): PositionResult {
  const rect = popup.getBoundingClientRect();
  const result = computePosition({
    anchor: boxOf(anchor),
    size: { width: rect.width, height: rect.height },
    viewport: { width: window.innerWidth, height: window.innerHeight },
    placement: preferred,
    gap,
    align,
    rtl: isRtl(anchor),
    // 8 px da borda da janela (painel do sino, Popover): 4 px parecia colado.
    margin: 8,
  });
  popup.style.setProperty(`--_${prefix}-x`, `${result.x}px`);
  popup.style.setProperty(`--_${prefix}-y`, `${result.y}px`);
  popup.setAttribute('data-placement', result.placement);
  return result;
}

/**
 * Como `placeBalloon`, mas grava o ponto no CENTRO da borda do gatilho voltada ao balão (o CSS
 * do Tooltip centraliza, aplica o translate e a folga). O lado vem do mesmo cálculo de `computePosition`.
 */
export function placeAtEdge(
  anchor: Element,
  popup: HTMLElement,
  prefix: string,
  preferred: Placement,
  gap: number,
): PositionResult {
  const rect = popup.getBoundingClientRect();
  const box = boxOf(anchor);
  const rtl = isRtl(anchor);
  const result = computePosition({
    anchor: box,
    size: { width: rect.width, height: rect.height },
    viewport: { width: window.innerWidth, height: window.innerHeight },
    placement: preferred,
    gap,
    align: 'center',
    rtl,
    margin: 4,
  });
  const side = physicalSide(result.placement, rtl);
  const cx = box.left + box.width / 2;
  const cy = box.top + box.height / 2;
  const x = side === 'left' ? box.left : side === 'right' ? box.left + box.width : cx;
  const y = side === 'top' ? box.top : side === 'bottom' ? box.top + box.height : cy;
  popup.style.setProperty(`--_${prefix}-x`, `${Math.round(x)}px`);
  popup.style.setProperty(`--_${prefix}-y`, `${Math.round(y)}px`);
  // Eixo transversal: o CSS centraliza no ponto; perto da borda da viewport, `-dx/-dy` empurra o
  // balão para dentro (o resultado de computePosition já vem limitado à viewport).
  const vertical = side === 'top' || side === 'bottom';
  const ideal = vertical ? cx - rect.width / 2 : cy - rect.height / 2;
  const shift = Math.round((vertical ? result.x : result.y) - ideal);
  popup.style.setProperty(`--_${prefix}-dx`, vertical ? `${shift}px` : '0px');
  popup.style.setProperty(`--_${prefix}-dy`, vertical ? '0px' : `${shift}px`);
  popup.setAttribute('data-placement', result.placement);
  return { x, y, placement: result.placement };
}

/** Chama `fn` no máximo uma vez por quadro enquanto `scroll` e `resize` disparam em rajada. */
export function watchViewport(fn: () => void): () => void {
  let frame = 0;
  const run = () => {
    if (typeof requestAnimationFrame !== 'function') return fn();
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      fn();
    });
  };
  window.addEventListener('scroll', run, true);
  window.addEventListener('resize', run);
  return () => {
    window.removeEventListener('scroll', run, true);
    window.removeEventListener('resize', run);
    if (frame && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame);
    frame = 0;
  };
}

/** O navegador entende `position-area` (anchor positioning)? Sem isso o CSS pede o JS abaixo. */
export function supportsAnchorPositioning(): boolean {
  return (
    typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    CSS.supports('position-area', 'block-end')
  );
}

/**
 * Posiciona um menu (`.eds-dropdown` aberto) junto ao gatilho nos navegadores sem anchor
 * positioning: grava `--_dropdown-x/-y` (px, canto superior esquerdo, viewport) e
 * `data-placement`. O menu abre abaixo do gatilho, alinhado ao seu fim (`end`) ou início
 * (`start`); vira para cima se faltar espaço embaixo e houver mais em cima. Reposiciona ao rolar
 * ou redimensionar. Devolve a função que encerra a escuta (chamar ao fechar); com anchor
 * positioning não faz nada, a regra de CSS cuida.
 */
export function placeMenuFallback(
  menu: HTMLElement,
  trigger: Element,
  align: 'start' | 'end' = 'end',
): () => void {
  if (supportsAnchorPositioning()) return () => undefined;
  // Mesma distância do --_dropdown-offset (space-1).
  const gap = 4;
  const margin = 8;

  const place = () => {
    const a = boxOf(trigger);
    menu.style.removeProperty('max-block-size');
    const size = menu.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const below = vh - (a.top + a.height) - gap - margin;
    const above = a.top - gap - margin;
    const up = size.height > below && above > below;
    const rtl = isRtl(trigger);
    const atEnd = (align === 'end') !== rtl;
    // Não cabe nem no lado maior: o menu encolhe até o espaço livre e rola por dentro.
    const free = Math.max(up ? above : below, 0);
    const height = Math.min(size.height, free);
    if (size.height > free) menu.style.maxBlockSize = `${Math.round(free)}px`;
    // A barra de rolagem que surge ao encolher alarga o menu: mede a largura de novo.
    const width = size.height > free ? menu.getBoundingClientRect().width : size.width;
    let x = atEnd ? a.left + a.width - width : a.left;
    let y = up ? a.top - gap - height : a.top + a.height + gap;
    x = clamp(x, margin, vw - width - margin);
    y = clamp(y, margin, vh - height - margin);
    menu.style.setProperty('--_dropdown-x', `${Math.round(x)}px`);
    menu.style.setProperty('--_dropdown-y', `${Math.round(y)}px`);
    menu.setAttribute('data-placement', up ? 'top' : 'bottom');
  };

  place();
  let frame = 0;
  const onChange = () => {
    if (typeof requestAnimationFrame !== 'function') return place();
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      place();
    });
  };
  window.addEventListener('scroll', onChange, true);
  window.addEventListener('resize', onChange);
  return () => {
    window.removeEventListener('scroll', onChange, true);
    window.removeEventListener('resize', onChange);
    if (frame && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame);
    frame = 0;
  };
}

/** O navegador entende `anchor-scope`? Sem isso o tooltip da Sidebar compacta precisa do JS abaixo. */
export function supportsAnchorScope(): boolean {
  return (
    typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    CSS.supports('anchor-scope', 'all')
  );
}

/**
 * Grava o `scrollTop` de `scroller` em `--_sidebar-scroll` (px), a cada rolagem, para o CSS
 * compensar o tooltip da Sidebar compacta (rótulo absoluto na posição estática, que não
 * acompanha a rolagem do trilho). Só age sem `anchor-scope`; devolve a função que encerra.
 */
export function followScrollTop(scroller: HTMLElement): () => void {
  if (supportsAnchorScope()) return () => undefined;
  const write = () => scroller.style.setProperty('--_sidebar-scroll', `${scroller.scrollTop}px`);
  write();
  scroller.addEventListener('scroll', write, { passive: true });
  return () => {
    scroller.removeEventListener('scroll', write);
    scroller.style.removeProperty('--_sidebar-scroll');
  };
}
