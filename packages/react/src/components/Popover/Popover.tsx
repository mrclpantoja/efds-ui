import {
  cloneElement,
  useEffect,
  useId,
  useRef,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from 'react';
import { popoverBehavior, type Placement } from '@eds-ui/behavior/balloon';
import { cx } from '../../utils/cx';

export type PopoverPlacement = Placement;

type TriggerProps = {
  popoverTarget?: string;
  'aria-expanded'?: boolean;
  'data-eds-popover'?: string;
};

interface PopoverBase extends Omit<HTMLAttributes<HTMLDivElement>, 'title' | 'children'> {
  /** O gatilho: um `<Button>` (ou botão) que repassa `popoverTarget` ao elemento. */
  trigger: ReactElement<TriggerProps>;
  /** Lado preferido; vira quando não cabe. Padrão: `bottom`. */
  placement?: PopoverPlacement;
  /** Aberto (controlado). Use com `onOpenChange`. */
  open?: boolean;
  /** Chamado ao abrir ou fechar, inclusive por Esc e clique fora. */
  onOpenChange?: (open: boolean) => void;
  /**
   * Botões do rodapé do painel (`.eds-popover-actions`). Como função, recebe o id do painel para
   * um botão de fechar nativo: `popoverTarget={popoverId} popoverTargetAction="hide"`.
   */
  actions?: ReactNode | ((api: { popoverId: string }) => ReactNode);
  children?: ReactNode;
}

/** O painel precisa de nome: um `title` visível ou um `aria-label`. */
export type PopoverProps = PopoverBase &
  ({ title: ReactNode; 'aria-label'?: string } | { title?: undefined; 'aria-label': string });

/**
 * Popover nativo (`popover="auto"`): clique fora e Esc fecham sem JS. O posicionamento, o
 * `aria-expanded` e o foco de volta ao gatilho vêm do mesmo código do `@eds-ui/behavior`.
 * Conteúdo curto e opcional: nada essencial só aqui.
 */
export function Popover({
  trigger,
  title,
  placement = 'bottom',
  open,
  onOpenChange,
  actions,
  className,
  children,
  ...rest
}: PopoverProps) {
  const id = useId();
  const titleId = `${id}-title`;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    const button = el?.previousElementSibling;
    if (!(button instanceof HTMLElement)) return undefined;
    const cleanup = popoverBehavior.bind(button);
    return () => {
      if (typeof cleanup === 'function') cleanup();
    };
  }, [placement]);
  useEffect(() => {
    const el = ref.current;
    if (!el || open === undefined || typeof el.showPopover !== 'function') return;
    const shown = el.matches(':popover-open');
    try {
      if (open && !shown) el.showPopover();
      else if (!open && shown) el.hidePopover();
    } catch {
      /* já no estado pedido */
    }
  }, [open]);
  return (
    <>
      {cloneElement(trigger, {
        popoverTarget: id,
        'aria-expanded': false,
        'data-eds-popover': placement,
      })}
      <div
        role="dialog"
        {...rest}
        ref={ref}
        id={id}
        popover="auto"
        className={cx('eds-popover', className)}
        aria-labelledby={title !== undefined ? titleId : undefined}
        onToggle={(event) => {
          onOpenChange?.(event.currentTarget.matches(':popover-open'));
        }}
      >
        {title !== undefined && (
          <h2 className="eds-popover-title" id={titleId}>
            {title}
          </h2>
        )}
        {children}
        {actions !== undefined && (
          <div className="eds-popover-actions">
            {typeof actions === 'function' ? actions({ popoverId: id }) : actions}
          </div>
        )}
      </div>
    </>
  );
}
Popover.displayName = 'Popover';
