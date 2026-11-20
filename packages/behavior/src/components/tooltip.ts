import { hidePopover, safeMatches, showPopover } from '../core/dom';
import { isPlacement, placeAtEdge, watchViewport, type Placement } from '../core/position';
import { bindAll, type Behavior } from '../core/registry';

/** Atraso do hover antes de mostrar (o foco mostra na hora). */
export const TOOLTIP_SHOW_DELAY = 300;
/** Tolerância para o ponteiro atravessar a folga entre o gatilho e o balão. */
const HIDE_DELAY = 120;
const GAP = 8;

/** `:focus-visible` quando o navegador conhece o seletor; sem suporte, trata como visível. */
function focusVisible(el: HTMLElement): boolean {
  try {
    return el.matches(':focus-visible');
  } catch {
    return true;
  }
}

function findTooltip(trigger: HTMLElement): HTMLElement | null {
  const doc = trigger.ownerDocument;
  const named = trigger.getAttribute('data-eds-tooltip');
  // O valor do atributo é o lado pedido (`bottom`); qualquer outro texto é tratado como id.
  const ids = [
    ...(named && !isPlacement(named) ? [named] : []),
    ...(trigger.getAttribute('aria-describedby') ?? '').split(/\s+/),
  ];
  for (const id of ids) {
    if (!id) continue;
    const el = doc.getElementById(id);
    if (el && (el.classList.contains('eds-tooltip') || el.getAttribute('role') === 'tooltip')) {
      return el;
    }
  }
  return null;
}

/**
 * Tooltip (WCAG 1.4.13): aparece com hover (300 ms) e com foco, some com Esc sem mover o foco
 * (dispensável), continua aberto com o ponteiro sobre o próprio balão (pairável) e enquanto o
 * gatilho tem foco ou hover (persistente). Só texto. O balão é `popover="manual"` posicionado
 * por `--_tooltip-x/-y` (ponto no centro da borda do gatilho voltada ao balão, px de viewport; o CSS centraliza e dá a folga) e `data-placement`
 * (`top|bottom|start|end`; vira para o lado oposto quando não cabe). O lado inicial pedido vai no
 * valor do atributo: `data-eds-tooltip="bottom"`.
 */
export const tooltipBehavior: Behavior = {
  name: 'tooltip',
  selector: '[data-eds-tooltip]',
  bind(trigger) {
    const tip = findTooltip(trigger);
    if (!tip) return;
    const doc = trigger.ownerDocument;
    if (!tip.hasAttribute('popover')) tip.setAttribute('popover', 'manual');
    if (!tip.hasAttribute('role')) tip.setAttribute('role', 'tooltip');
    if (tip.id) {
      const tokens = (trigger.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
      if (!tokens.includes(tip.id)) {
        trigger.setAttribute('aria-describedby', [...tokens, tip.id].join(' '));
      }
    }
    const attr = trigger.getAttribute('data-eds-tooltip') || tip.getAttribute('data-placement');
    const preferred: Placement = isPlacement(attr) ? attr : 'top';

    let hover = false;
    let tipHover = false;
    let focus = false;
    let dismissed = false;
    let open = false;
    let showTimer: ReturnType<typeof setTimeout> | null = null;
    let hideTimer: ReturnType<typeof setTimeout> | null = null;
    let stopViewport: (() => void) | null = null;

    const clear = (timer: ReturnType<typeof setTimeout> | null) => {
      if (timer) clearTimeout(timer);
    };

    const position = () => {
      if (open) placeAtEdge(trigger, tip, 'tooltip', preferred, GAP);
    };

    const show = () => {
      showTimer = null;
      if (open || !trigger.isConnected) return;
      open = true;
      showPopover(tip);
      position();
      stopViewport = watchViewport(position);
    };

    const hide = () => {
      hideTimer = null;
      clear(showTimer);
      showTimer = null;
      if (!open) return;
      open = false;
      stopViewport?.();
      stopViewport = null;
      hidePopover(tip);
    };

    const update = () => {
      if (!hover && !focus && !tipHover) dismissed = false;
      const want = !dismissed && (hover || tipHover || focus);
      if (want) {
        clear(hideTimer);
        hideTimer = null;
        if (!open && !showTimer) {
          showTimer = setTimeout(show, focus || tipHover ? 0 : TOOLTIP_SHOW_DELAY);
        }
      } else {
        clear(showTimer);
        showTimer = null;
        if (open && !hideTimer) hideTimer = setTimeout(hide, HIDE_DELAY);
        else if (!open) clear(hideTimer);
      }
    };

    const onEnter = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      hover = true;
      update();
    };
    const onLeave = () => {
      hover = false;
      update();
    };
    const onTipEnter = () => {
      tipHover = true;
      update();
    };
    const onTipLeave = () => {
      tipHover = false;
      update();
    };
    const onFocusIn = () => {
      // Foco por clique/toque não mostra o balão (ficaria preso até o foco sair); teclado sim.
      if (!focusVisible(trigger)) return;
      focus = true;
      update();
    };
    const onFocusOut = () => {
      focus = false;
      update();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !open) return;
      dismissed = true;
      clear(hideTimer);
      hide();
      // Fecha só o balão: sem isto o Esc também fecharia o diálogo em volta.
      event.preventDefault();
    };
    // Clique ou toque no gatilho dispensa o balão (ele não fica atrás de um menu que abriu).
    const onPointerDown = () => {
      if (!open) return;
      dismissed = true;
      hide();
    };
    // O balão pode ser fechado de fora (`hidePopover`): mantém o estado coerente.
    const onToggle = (event: Event) => {
      const state = (event as Partial<ToggleEvent>).newState;
      if (state === 'closed' && open && !safeMatches(tip, ':popover-open')) {
        open = false;
        stopViewport?.();
        stopViewport = null;
      }
    };

    trigger.addEventListener('pointerenter', onEnter);
    trigger.addEventListener('pointerleave', onLeave);
    trigger.addEventListener('focusin', onFocusIn);
    trigger.addEventListener('focusout', onFocusOut);
    trigger.addEventListener('pointerdown', onPointerDown);
    tip.addEventListener('pointerenter', onTipEnter);
    tip.addEventListener('pointerleave', onTipLeave);
    tip.addEventListener('toggle', onToggle);
    doc.addEventListener('keydown', onKeyDown, true);

    return () => {
      trigger.removeEventListener('pointerenter', onEnter);
      trigger.removeEventListener('pointerleave', onLeave);
      trigger.removeEventListener('focusin', onFocusIn);
      trigger.removeEventListener('focusout', onFocusOut);
      trigger.removeEventListener('pointerdown', onPointerDown);
      tip.removeEventListener('pointerenter', onTipEnter);
      tip.removeEventListener('pointerleave', onTipLeave);
      tip.removeEventListener('toggle', onToggle);
      doc.removeEventListener('keydown', onKeyDown, true);
      clear(showTimer);
      clear(hideTimer);
      hide();
    };
  },
};

export function initTooltip(root: ParentNode = document): () => void {
  return bindAll(root, [tooltipBehavior]);
}
