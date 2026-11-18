import {
  createContext,
  createElement,
  forwardRef,
  useContext,
  useEffect,
  useLayoutEffect,
  useId,
  useRef,
  useState,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
  type Ref,
} from 'react';
import { flushSync } from 'react-dom';
import { cx } from '../../utils/cx';
import { SidebarCollapseGlyph } from '../../internal/glyphs-d';
import { mergeRefs } from '../../internal/refs-d';
import { AppShellContext, useShellState } from '../AppShell/context';

const SidebarContext = createContext<{ onNavigate: () => void } | null>(null);

export interface SidebarProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  /** Ícone da marca (cabeçalho da sidebar). */
  brandIcon?: ReactNode;
  /** Nome da marca (some na sidebar compacta, por CSS). */
  brandLabel?: ReactNode;
  /** Seções (`<SidebarSection>`) e itens. */
  children?: ReactNode;
  /** Itens do rodapé, antes do botão de colapsar. */
  footer?: ReactNode;
  /** Mostra o botão de colapsar no rodapé. Padrão: `true`. */
  collapsible?: boolean;
  /** Estado colapsado controlado. */
  collapsed?: boolean;
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Rótulo fixo do botão de colapsar (não muda com o estado). Padrão: "Menu lateral". */
  collapseLabel?: string;
  /** Ícone do botão de colapsar. */
  collapseIcon?: ReactNode;
}

/**
 * Navegação principal. `<nav popover>`: no mobile vira off-canvas. Dentro de `<AppShell>` sincroniza
 * `aria-expanded` do gatilho, põe header/main/skip link em `inert` enquanto aberta e cuida do foco.
 */
export const Sidebar = forwardRef<HTMLElement, SidebarProps>(function Sidebar(
  {
    brandIcon,
    brandLabel,
    children,
    footer,
    collapsible = true,
    collapsed,
    defaultCollapsed = false,
    onCollapsedChange,
    collapseLabel = 'Menu lateral',
    collapseIcon,
    className,
    'aria-label': ariaLabel = 'Principal',
    ...rest
  },
  ref,
) {
  const uid = useId();
  const local = useShellState(rest.id ?? `${uid}-nav`, '');
  const shell = useContext(AppShellContext) ?? local;
  const navRef = useRef<HTMLElement>(null);

  const [innerCollapsed, setInnerCollapsed] = useState(defaultCollapsed);
  const isCollapsed = collapsed ?? innerCollapsed;
  const toggleCollapsed = () => {
    if (collapsed === undefined) setInnerCollapsed(!isCollapsed);
    onCollapsedChange?.(!isCollapsed);
  };

  // O estado do shell muda a cada abertura; o listener nativo lê sempre o valor atual.
  // `id` do consumidor vence: o shell o adota como navId (o gatilho aponta para ele).
  const ownId = rest.id;
  const setShellNavId = shell.setNavId;
  useLayoutEffect(() => {
    if (ownId) setShellNavId?.(ownId);
  }, [ownId, setShellNavId]);

  const shellRef = useRef(shell);
  shellRef.current = shell;

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const onToggle = (event: Event) => {
      const current = shellRef.current;
      const open = (event as ToggleEvent).newState === 'open';
      flushSync(() => current.setNavOpen(open));
      if (open) {
        (
          nav.querySelector<HTMLElement>('[aria-current="page"]') ??
          nav.querySelector<HTMLElement>('a[href], button')
        )?.focus();
      } else if (current.navigatedRef.current) {
        current.navigatedRef.current = false;
        document.getElementById(current.mainId)?.focus();
      } else if (document.activeElement === document.body || nav.contains(document.activeElement)) {
        // O gatilho estava inerte: o retorno de foco nativo do popover falha.
        document.querySelector<HTMLElement>(`[popovertarget="${current.navId}"]`)?.focus();
      }
    };
    nav.addEventListener('toggle', onToggle);
    return () => nav.removeEventListener('toggle', onToggle);
  }, []);

  const onNavigate = () => {
    const current = shellRef.current;
    if (!current.navOpen) return;
    current.navigatedRef.current = true;
    current.closeNav();
  };

  const hasHeader = brandIcon !== undefined || brandLabel !== undefined;
  const hasFooter = footer !== undefined || collapsible;

  return (
    <SidebarContext.Provider value={{ onNavigate }}>
      <nav
        {...rest}
        ref={mergeRefs(navRef, ref)}
        id={ownId ?? shell.navId}
        popover="auto"
        aria-label={ariaLabel}
        data-collapsed={isCollapsed || undefined}
        className={cx('eds-sidebar', className)}
      >
        {hasHeader ? (
          <div className="eds-sidebar-header">
            {brandIcon}
            <span className="eds-sidebar-label">{brandLabel}</span>
          </div>
        ) : null}
        {children}
        {hasFooter ? (
          <div className="eds-sidebar-footer">
            {footer}
            {collapsible ? (
              <button
                type="button"
                className="eds-sidebar-item"
                aria-expanded={!isCollapsed}
                onClick={toggleCollapsed}
              >
                {collapseIcon ?? <SidebarCollapseGlyph />}
                <span className="eds-sidebar-label">{collapseLabel}</span>
              </button>
            ) : null}
          </div>
        ) : null}
      </nav>
    </SidebarContext.Provider>
  );
});
Sidebar.displayName = 'Sidebar';

export interface SidebarSectionProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Título do grupo. */
  title?: ReactNode;
}

/** Grupo de itens com título opcional. */
export const SidebarSection = forwardRef<HTMLDivElement, SidebarSectionProps>(
  function SidebarSection({ title, className, children, ...rest }, ref) {
    return (
      <div {...rest} ref={ref} className={cx('eds-sidebar-section', className)}>
        {title !== undefined ? <p className="eds-sidebar-section-title">{title}</p> : null}
        {children}
      </div>
    );
  },
);
SidebarSection.displayName = 'SidebarSection';

interface SidebarItemOwnProps {
  /** Ícone (decorativo). */
  icon?: ReactNode;
  /** Página atual: `aria-current="page"`. */
  current?: boolean;
}

export type SidebarItemAsLinkProps = SidebarItemOwnProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };
export type SidebarItemAsButtonProps = SidebarItemOwnProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };
export type SidebarItemProps = SidebarItemAsLinkProps | SidebarItemAsButtonProps;

type SidebarItemImplProps = SidebarItemOwnProps &
  HTMLAttributes<HTMLElement> & { href?: string; type?: 'button' | 'submit' | 'reset' };

/** Item de navegação: `<a>` com `href`; sem `href`, `<button>`. Links fecham o off-canvas. */
export const SidebarItem = forwardRef<HTMLElement, SidebarItemImplProps>(function SidebarItem(
  { icon, current = false, href, type, className, onClick, children, ...rest },
  ref,
) {
  const sidebar = useContext(SidebarContext);
  const isLink = href !== undefined;
  const handleClick = (event: MouseEvent<HTMLElement>) => {
    onClick?.(event);
    if (isLink) sidebar?.onNavigate();
  };
  return createElement(
    isLink ? 'a' : 'button',
    {
      'aria-current': current ? 'page' : undefined,
      ...rest,
      ref: ref as Ref<HTMLElement>,
      className: cx('eds-sidebar-item', className),
      ...(isLink ? { href } : { type: type ?? 'button' }),
      onClick: handleClick,
    },
    icon,
    <span className="eds-sidebar-label">{children}</span>,
  );
}) as unknown as {
  (props: SidebarItemAsLinkProps & { ref?: Ref<HTMLAnchorElement> }): ReactNode;
  (props: SidebarItemAsButtonProps & { ref?: Ref<HTMLButtonElement> }): ReactNode;
  displayName?: string;
};
SidebarItem.displayName = 'SidebarItem';
