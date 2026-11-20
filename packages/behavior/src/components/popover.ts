import { emit, hidePopover, safeMatches } from '../core/dom';
import { boxOf, isPlacement, placeBalloon, watchViewport, type Placement } from '../core/position';
import { bindAll, type Behavior } from '../core/registry';

const GAP = 8;

/**
 * Popover (`popover="auto"` nativo, com `popovertarget`): o navegador cuida de abrir, do Esc e do
 * clique fora. O behavior posiciona o balão junto ao gatilho (`--_popover-x/-y`, canto superior
 * esquerdo em px de viewport, e `data-placement`; vira se não couber), sincroniza
 * `aria-expanded` e devolve o foco ao gatilho ao fechar quando ele estava dentro do balão.
 * Eventos em `[popover]`: `eds:popover-open` e `eds:popover-close` (`detail.trigger`).
 * O lado preferido vai no valor do atributo (`data-eds-popover="top"`; `bottom` por padrão).
 */
export const popoverBehavior: Behavior = {
  name: 'popover',
  selector: '[data-eds-popover][popovertarget]',
  bind(trigger) {
    const doc = trigger.ownerDocument;
    const id = trigger.getAttribute('popovertarget') ?? '';
    const pop = id ? doc.getElementById(id) : null;
    if (!pop) return;
    const attr = trigger.getAttribute('data-eds-popover') || pop.getAttribute('data-placement');
    const preferred: Placement = isPlacement(attr) ? attr : 'bottom';

    const isOpen = (event?: Event): boolean => {
      const state = (event as Partial<ToggleEvent> | undefined)?.newState;
      if (state) return state === 'open';
      return safeMatches(pop, ':popover-open');
    };

    let stopViewport: (() => void) | null = null;
    const position = () => {
      if (isOpen()) placeBalloon(trigger, pop, 'popover', preferred, 'start', GAP);
    };

    // Antes de abrir o balão ainda não tem tamanho: posição provisória junto ao gatilho (sem
    // salto visível), refinada no `toggle`, já com o tamanho real.
    const onBeforeToggle = (event: Event) => {
      if ((event as Partial<ToggleEvent>).newState !== 'open') return;
      const rect = boxOf(trigger);
      pop.style.setProperty('--_popover-x', `${Math.round(rect.left)}px`);
      pop.style.setProperty('--_popover-y', `${Math.round(rect.top + rect.height + GAP)}px`);
    };

    const onToggle = (event: Event) => {
      const open = isOpen(event);
      trigger.setAttribute('aria-expanded', String(open));
      if (open) {
        position();
        stopViewport ??= watchViewport(position);
        emit(pop, 'popover-open', { trigger });
        return;
      }
      stopViewport?.();
      stopViewport = null;
      const active = doc.activeElement;
      // Foco que ficou no balão (ou se perdeu no body): volta ao gatilho. Clique em outro
      // controle, que levou o foco, é respeitado.
      if (!active || active === doc.body || pop.contains(active)) {
        if (trigger.isConnected) trigger.focus();
      }
      emit(pop, 'popover-close', { trigger });
    };

    pop.addEventListener('beforetoggle', onBeforeToggle);
    pop.addEventListener('toggle', onToggle);
    trigger.setAttribute('aria-expanded', String(isOpen()));
    if (isOpen()) {
      position();
      stopViewport = watchViewport(position);
    }

    return () => {
      pop.removeEventListener('beforetoggle', onBeforeToggle);
      pop.removeEventListener('toggle', onToggle);
      stopViewport?.();
      stopViewport = null;
      hidePopover(pop);
    };
  },
};

export function initPopover(root: ParentNode = document): () => void {
  return bindAll(root, [popoverBehavior]);
}
