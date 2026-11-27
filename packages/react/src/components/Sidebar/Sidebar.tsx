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
import { followScrollTop } from '@efds-ui/behavior/balloon';
import { flushSync } from 'react-dom';
import { cx } from '../../utils/cx';
import { mergeTexts } from '../../utils/texts';
import { SidebarCollapseGlyph } from '../../internal/glyphs-d';
import { mergeRefs } from '../../internal/refs-d';
import { CloseGlyph } from '../../internal/glyphs';
import { AppShellContext, SidebarSlotContext, useShellState } from '../AppShell/context';

const SidebarContext = createContext<{ onNavigate: () => void } | null>(null);

export interface SidebarTexts {
  /** Rótulo fixo do botão de colapsar (não muda com o estado). */
  collapse: string;
  /** Nome do botão de fechar do off-canvas (mobile). */
  close: string;
}

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
  /** Textos internos (padrões em pt-BR): `collapse` ("Menu lateral") e `close` ("Fechar menu"). */
  texts?: Partial<SidebarTexts>;
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
    texts,
    collapseIcon,
    className,
    'aria-label': ariaLabel = 'Principal',
    ...rest
  },
  ref,
) {
  const uid = useId();
  const local = useShellState(rest.id ?? `${uid}-nav`, '');
  // Só a Sidebar do slot `sidebar` do AppShell usa o estado do shell; fora dele é avulsa.
  const inShellSlot = useContext(SidebarSlotContext);
  const shellContext = useContext(AppShellContext);
  const shell = (inShellSlot ? shellContext : null) ?? local;
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

  // Tooltip da compacta sem anchor-scope: publica o scrollTop do trilho (ver sidebar.css).
  useEffect(() => (navRef.current ? followScrollTop(navRef.current) : undefined), []);

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
        document
          .querySelector<HTMLElement>(`[popovertarget="${current.navId}"]:not(.eds-sidebar-close)`)
          ?.focus();
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

  // A <nav> sempre tem id: o do consumidor, o do shell (slot) ou o local gerado com useId.
  const navId = ownId ?? shell.navId;
  const hasHeader = brandIcon !== undefined || brandLabel !== undefined;
  const hasFooter = footer !== undefined || collapsible;
  const t = mergeTexts({ collapse: 'Menu lateral', close: 'Fechar menu' }, texts);
  // Só aparece no off-canvas aberto (CSS); o navegador fecha o popover sem JS.
  const closeButton = (
    <button
      type="button"
      className="eds-sidebar-close eds-button eds-button-ghost eds-button-icon"
      aria-label={t.close}
      popoverTarget={navId}
      popoverTargetAction="hide"
    >
      <CloseGlyph />
    </button>
  );

  return (
    <SidebarContext.Provider value={{ onNavigate }}>
      <nav
        {...rest}
        ref={mergeRefs(navRef, ref)}
        id={navId}
        popover="auto"
        aria-label={ariaLabel}
        data-collapsed={isCollapsed || undefined}
        className={cx('eds-sidebar', className)}
      >
        {hasHeader ? (
          <div className="eds-sidebar-header">
            {brandIcon}
            <span className="eds-sidebar-label">{brandLabel}</span>
            {closeButton}
          </div>
        ) : (
          closeButton
        )}
        {children}
        {hasFooter ? (
          <div className="eds-sidebar-footer">
            {footer}
            {collapsible ? (
              <button
                type="button"
                className="eds-sidebar-item"
                aria-expanded={!isCollapsed}
                aria-controls={navId}
                onClick={toggleCollapsed}
              >
                {collapseIcon ?? <SidebarCollapseGlyph />}
                <span className="eds-sidebar-label">{t.collapse}</span>
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
  /** Contador ao fim do item (ex.: `3`). Na sidebar compacta vira um ponto sobre o ícone. */
  badge?: ReactNode;
  /** Complemento do contador no nome acessível, oculto na tela (ex.: `vencidas`). */
  badgeLabel?: ReactNode;
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
  { icon, current = false, badge, badgeLabel, href, type, className, onClick, children, ...rest },
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
    // Espaço entre o rótulo e o contador: em flex não é desenhado, mas separa as palavras do nome acessível.
    badge !== undefined && badge !== null && badge !== false ? ' ' : null,
    badge !== undefined && badge !== null && badge !== false ? (
      <span className="eds-sidebar-badge">
        {badge}
        {badgeLabel ? (
          <>
            {' '}
            <span className="eds-visually-hidden">{badgeLabel}</span>
          </>
        ) : null}
      </span>
    ) : null,
  );
}) as unknown as {
  (props: SidebarItemAsLinkProps & { ref?: Ref<HTMLAnchorElement> }): ReactNode;
  (props: SidebarItemAsButtonProps & { ref?: Ref<HTMLButtonElement> }): ReactNode;
  displayName?: string;
};
SidebarItem.displayName = 'SidebarItem';
