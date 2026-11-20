import {
  createContext,
  forwardRef,
  useContext,
  useId,
  type DetailsHTMLAttributes,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { cx } from '../../utils/cx';
import { useControllable } from '../../internal/useControllable';

const ExclusiveContext = createContext<string | undefined>(undefined);

export interface AccordionProps extends HTMLAttributes<HTMLDivElement> {
  /** Só um item aberto por vez (o mesmo `name` em todos os `<details>`, nativo). */
  exclusive?: boolean;
  /** Sem a borda externa: linhas só entre os itens. */
  flush?: boolean;
}

/** Grupo de itens recolhíveis sobre `<details>`: sem JavaScript, o navegador cuida de tudo. */
export const Accordion = forwardRef<HTMLDivElement, AccordionProps>(function Accordion(
  { exclusive = false, flush = false, className, children, ...rest },
  ref,
) {
  const name = useId();
  return (
    <ExclusiveContext.Provider value={exclusive ? `eds-accordion-${name}` : undefined}>
      <div
        {...rest}
        ref={ref}
        className={cx('eds-accordion', flush && 'eds-accordion-flush', className)}
      >
        {children}
      </div>
    </ExclusiveContext.Provider>
  );
});
Accordion.displayName = 'Accordion';

export interface AccordionItemProps extends Omit<
  DetailsHTMLAttributes<HTMLDetailsElement>,
  'title' | 'open' | 'onToggle'
> {
  /** Texto do gatilho (`<summary>`). */
  title: ReactNode;
  /** Aberto (controlado). Use com `onOpenChange`. */
  open?: boolean;
  /** Aberto no início (não controlado). */
  defaultOpen?: boolean;
  /** Chamado ao abrir ou fechar, inclusive quando outro item do grupo exclusivo o fecha. */
  onOpenChange?: (open: boolean) => void;
  /** Indisponível: `aria-disabled` no gatilho, que não alterna. */
  disabled?: boolean;
}

export const AccordionItem = forwardRef<HTMLDetailsElement, AccordionItemProps>(
  function AccordionItem(
    {
      title,
      open,
      defaultOpen = false,
      onOpenChange,
      disabled = false,
      className,
      children,
      ...rest
    },
    ref,
  ) {
    const name = useContext(ExclusiveContext);
    const [isOpen, setOpen] = useControllable(open, defaultOpen, onOpenChange);
    const onSummaryClick = (event: MouseEvent) => {
      if (disabled) event.preventDefault();
    };
    return (
      <details
        {...rest}
        ref={ref}
        className={cx('eds-accordion-item', className)}
        name={name}
        open={isOpen}
        onToggle={(event) => {
          const next = event.currentTarget.open;
          if (next !== isOpen) setOpen(next);
        }}
      >
        <summary
          className="eds-accordion-trigger"
          aria-disabled={disabled || undefined}
          onClick={onSummaryClick}
        >
          {title}
        </summary>
        <div className="eds-accordion-panel">{children}</div>
      </details>
    );
  },
);
AccordionItem.displayName = 'AccordionItem';
