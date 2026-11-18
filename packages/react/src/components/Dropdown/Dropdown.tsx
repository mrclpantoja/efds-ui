import {
  cloneElement,
  createElement,
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
  type SyntheticEvent,
} from 'react';
import { cx } from '../../utils/cx';

const MenuContext = createContext<string | undefined>(undefined);

type TriggerProps = { id?: string; popoverTarget?: string; 'aria-expanded'?: boolean };

export interface DropdownProps extends Omit<HTMLAttributes<HTMLDivElement>, 'popover'> {
  /**
   * Gatilho: um `<Button>` (ou elemento que repasse `id`, `popoverTarget` e `aria-expanded`
   * ao botão). Receberá `popovertarget` e `aria-expanded` sincronizado com o menu.
   */
  trigger: ReactElement<TriggerProps>;
  /** Chamado quando o popover abre ou fecha (inclusive por Esc e clique fora). */
  onOpenChange?: (open: boolean) => void;
}

/** Estado do popover pelo evento `toggle` (ToggleEvent.newState; `:popover-open` como reserva). */
function isOpen(event: SyntheticEvent<HTMLElement>): boolean {
  const state = (event.nativeEvent as Partial<ToggleEvent>).newState;
  if (state) return state === 'open';
  try {
    return event.currentTarget.matches(':popover-open');
  } catch {
    return false;
  }
}

/**
 * Menu de ações no padrão disclosure (Popover API), sem `role="menu"`: navegável por Tab.
 * O contêiner é `role="group"` nomeado pelo gatilho (uma `div` sem role ignora `aria-labelledby`).
 * Abrir/fechar, Esc, clique fora e retorno de foco são nativos; o `aria-expanded` do gatilho
 * segue o evento `toggle`.
 */
export const Dropdown = forwardRef<HTMLDivElement, DropdownProps>(function Dropdown(
  { trigger, onOpenChange, className, children, id, onToggle, ...rest },
  ref,
) {
  const generated = useId();
  const menuId = id ?? `${generated}-menu`;
  const triggerId = trigger.props.id ?? `${generated}-trigger`;
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Popover "auto" fecha com Esc e clique fora, mas não quando o foco sai por Tab: com o menu
  // aberto, fecha se o foco for para fora do menu e do gatilho.
  useEffect(() => {
    if (!open) return;
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as Node | null;
      const menu = menuRef.current;
      if (!menu || !target || menu.contains(target)) return;
      if (document.getElementById(triggerId)?.contains(target)) return;
      hideMenu(menuId);
    };
    document.addEventListener('focusin', onFocusIn);
    return () => document.removeEventListener('focusin', onFocusIn);
  }, [open, menuId, triggerId]);

  const setRefs = (node: HTMLDivElement | null) => {
    menuRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  return (
    <>
      {cloneElement(trigger, {
        id: triggerId,
        popoverTarget: menuId,
        'aria-expanded': open,
      })}
      <div
        {...rest}
        ref={setRefs}
        id={menuId}
        className={cx('eds-dropdown', className)}
        role="group"
        aria-labelledby={triggerId}
        popover="auto"
        onToggle={(event) => {
          const next = isOpen(event);
          setOpen(next);
          onOpenChange?.(next);
          onToggle?.(event);
        }}
      >
        <MenuContext.Provider value={menuId}>{children}</MenuContext.Provider>
      </div>
    </>
  );
});
Dropdown.displayName = 'Dropdown';

export type DropdownItemVariant = 'default' | 'danger';

interface DropdownItemOwnProps {
  /** `danger` para ações destrutivas. Padrão: `default`. */
  variant?: DropdownItemVariant;
}

export type DropdownItemAsButtonProps = DropdownItemOwnProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };

export type DropdownItemAsLinkProps = DropdownItemOwnProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    /** Com `href`, o item é um `<a>` (navegação). */
    href: string;
    disabled?: boolean;
  };

export type DropdownItemProps = DropdownItemAsButtonProps | DropdownItemAsLinkProps;

type DropdownItemImplProps = DropdownItemOwnProps &
  HTMLAttributes<HTMLElement> & { href?: string; disabled?: boolean };

/** Fecha o popover do menu (o foco volta ao gatilho de forma síncrona, antes da ação). */
function hideMenu(menuId: string | undefined) {
  if (!menuId) return;
  try {
    document.getElementById(menuId)?.hidePopover();
  } catch {
    /* já fechado ou sem suporte */
  }
}

/**
 * Item do menu: `<button>` (ou `<a>` com `href`). Ao ser acionado fecha o popover **antes** do
 * `onClick`, para que o foco já esteja de volta no gatilho se a ação abrir um modal.
 * `disabled` vira `aria-disabled` (continua focável, não age e não fecha o menu).
 */
export const DropdownItem = forwardRef<HTMLElement, DropdownItemImplProps>(function DropdownItem(
  { variant = 'default', disabled = false, href, className, onClick, ...rest },
  ref,
) {
  const menuId = useContext(MenuContext);
  const isLink = href !== undefined;
  const handleClick = (event: MouseEvent<HTMLElement>) => {
    if (disabled) {
      event.preventDefault();
      return;
    }
    hideMenu(menuId);
    onClick?.(event);
  };
  return createElement(isLink ? 'a' : 'button', {
    ...rest,
    ref: ref as Ref<HTMLElement>,
    className: cx(
      'eds-dropdown-item',
      variant === 'danger' && 'eds-dropdown-item-danger',
      className,
    ),
    'aria-disabled': disabled || undefined,
    ...(isLink
      ? disabled
        ? // Sem href o <a> não é focável nem link: role + tabIndex mantêm o item alcançável.
          { role: 'link', tabIndex: 0 }
        : { href }
      : {
          type: 'button',
          popoverTarget: disabled ? undefined : menuId,
          popoverTargetAction: disabled || !menuId ? undefined : 'hide',
        }),
    onClick: handleClick,
  });
}) as unknown as {
  (props: DropdownItemAsButtonProps & { ref?: Ref<HTMLButtonElement> }): ReactNode;
  (props: DropdownItemAsLinkProps & { ref?: Ref<HTMLAnchorElement> }): ReactNode;
  displayName?: string;
};
DropdownItem.displayName = 'DropdownItem';

export type DropdownSeparatorProps = HTMLAttributes<HTMLHRElement>;

export const DropdownSeparator = forwardRef<HTMLHRElement, DropdownSeparatorProps>(
  function DropdownSeparator({ className, ...rest }, ref) {
    return <hr {...rest} ref={ref} className={cx('eds-dropdown-separator', className)} />;
  },
);
DropdownSeparator.displayName = 'DropdownSeparator';
