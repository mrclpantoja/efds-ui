import { cloneElement, useEffect, useId, useRef, type ReactElement, type ReactNode } from 'react';
import { tooltipBehavior, type Placement } from '@eds-ui/behavior/balloon';
import { cx } from '../../utils/cx';

export type TooltipPlacement = Placement;

type TriggerProps = { 'aria-describedby'?: string; 'data-eds-tooltip'?: string };

export interface TooltipProps {
  /** Dica curta, só texto (nunca interativa). */
  content: ReactNode;
  /** Lado preferido; vira para o oposto quando não cabe. Padrão: `top`. */
  placement?: TooltipPlacement;
  /** Classe extra do balão. */
  className?: string;
  /** O gatilho: um único elemento focável (botão, link, campo). */
  children: ReactElement<TriggerProps>;
}

/**
 * Tooltip (WCAG 1.4.13): hover com atraso e foco mostram, Esc dispensa, o ponteiro pode ir ao balão.
 * Usa o mesmo código do `@eds-ui/behavior`. O nome do gatilho não vem daqui: botão só de ícone
 * continua exigindo `aria-label`; o tooltip só repete/complementa (`aria-describedby`).
 */
export function Tooltip({ content, placement = 'top', className, children }: TooltipProps) {
  const id = useId();
  const tipRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const trigger = tipRef.current?.previousElementSibling;
    if (!(trigger instanceof HTMLElement)) return undefined;
    const cleanup = tooltipBehavior.bind(trigger);
    return () => {
      if (typeof cleanup === 'function') cleanup();
    };
  }, [placement]);
  const describedBy = [children.props['aria-describedby'], id].filter(Boolean).join(' ');
  return (
    <>
      {cloneElement(children, {
        'aria-describedby': describedBy,
        'data-eds-tooltip': placement,
      })}
      <span
        ref={tipRef}
        id={id}
        role="tooltip"
        popover="manual"
        className={cx('eds-tooltip', className)}
      >
        {content}
      </span>
    </>
  );
}
Tooltip.displayName = 'Tooltip';
