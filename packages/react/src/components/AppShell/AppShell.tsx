import {
  forwardRef,
  useContext,
  useId,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
  type Ref,
} from 'react';
import { cx } from '../../utils/cx';
import { mergeTexts } from '../../utils/texts';
import { MenuGlyph } from '../../internal/glyphs-d';
import { mergeRefs } from '../../internal/refs-d';
import { Button } from '../Button';
import { Navbar, type NavbarProps } from '../Navbar';
import {
  AppShellContext,
  SidebarSlotContext,
  useAppShell,
  useInert,
  useShellState,
} from './context';

export interface AppShellTexts {
  /** Texto do skip link. */
  skipLink: string;
}

export interface AppShellProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Slot da `<Sidebar>`. */
  sidebar?: ReactNode;
  /** Slot do `<AppShellHeader>`. */
  header?: ReactNode;
  /** Slot do `<Banner>` de sistema: ocupa uma linha acima da sidebar e do cabeçalho. */
  banner?: ReactNode;
  /** Conteúdo da página (dentro do único `<main>`). */
  children?: ReactNode;
  /** Textos internos (padrões em pt-BR): `skipLink` ("Pular para o conteúdo"). */
  texts?: Partial<AppShellTexts>;
  /** id do `<main>` (padrão: gerado). */
  mainId?: string;
  /** id da sidebar (padrão: o `id` dado à `<Sidebar>`, ou gerado). */
  navId?: string;
  /** Classe extra do `<main>`. */
  mainClassName?: string;
  /** Ref do `<main>`. */
  mainRef?: Ref<HTMLElement>;
}

/**
 * App shell: grade sidebar | header + main do core. Renderiza o único `<main>` da página e
 * cumpre o contrato do off-canvas (header, main e skip link ficam `inert` enquanto a sidebar
 * está aberta). A largura é responsabilidade do CSS.
 */
export const AppShell = forwardRef<HTMLDivElement, AppShellProps>(function AppShell(
  {
    sidebar,
    header,
    banner,
    children,
    texts,
    mainId: mainIdProp,
    navId: navIdProp,
    mainClassName,
    mainRef,
    className,
    ...rest
  },
  ref,
) {
  const uid = useId();
  const [navIdFromSidebar, setNavId] = useState<string>();
  const navId = navIdProp ?? navIdFromSidebar ?? `${uid}-nav`;
  const mainId = mainIdProp ?? `${uid}-main`;
  const state = useShellState(navId, mainId);
  const skipRef = useRef<HTMLAnchorElement>(null);
  const innerMainRef = useRef<HTMLElement>(null);
  useInert(skipRef, state.navOpen);
  useInert(innerMainRef, state.navOpen);

  const { setNavOpen, closeNav, navigatedRef, navOpen } = state;
  const value = useMemo(
    () => ({ navId, mainId, navOpen, setNavOpen, navigatedRef, closeNav, setNavId }),
    [navId, mainId, navOpen, setNavOpen, navigatedRef, closeNav],
  );

  // O hash pode ser a rota (roteadores): o skip link só move o foco.
  const skip = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    document.getElementById(mainId)?.focus();
  };

  return (
    <AppShellContext.Provider value={value}>
      <div {...rest} ref={ref} className={cx('eds-app', className)}>
        <a ref={skipRef} className="eds-skip-link" href={`#${mainId}`} onClick={skip}>
          {mergeTexts({ skipLink: 'Pular para o conteúdo' }, texts).skipLink}
        </a>
        {banner}
        <SidebarSlotContext.Provider value>{sidebar}</SidebarSlotContext.Provider>
        {header}
        <main
          ref={mergeRefs(innerMainRef, mainRef)}
          id={mainId}
          tabIndex={-1}
          className={cx('eds-app-main', mainClassName)}
        >
          {children}
        </main>
      </div>
    </AppShellContext.Provider>
  );
});
AppShell.displayName = 'AppShell';

export type AppShellHeaderProps = NavbarProps;

/** Topo do shell: `<header class="eds-app-header eds-navbar">`, inerte com o off-canvas aberto. */
export const AppShellHeader = forwardRef<HTMLElement, AppShellHeaderProps>(function AppShellHeader(
  { className, ...rest },
  ref,
) {
  const shell = useContext(AppShellContext);
  const innerRef = useRef<HTMLElement>(null);
  useInert(innerRef, shell?.navOpen ?? false);
  return (
    <Navbar {...rest} ref={mergeRefs(innerRef, ref)} className={cx('eds-app-header', className)} />
  );
});
AppShellHeader.displayName = 'AppShellHeader';

export interface AppShellNavToggleTexts {
  label: string;
}

export interface AppShellNavToggleProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children'
> {
  /** Textos internos (padrões em pt-BR): `label`, o nome acessível ("Abrir navegação"). */
  texts?: Partial<AppShellNavToggleTexts>;
  /** Ícone (padrão: menu). */
  icon?: ReactNode;
}

/** Botão de menu que abre a sidebar off-canvas (visível só abaixo de 768px, por CSS). */
export const AppShellNavToggle = forwardRef<HTMLButtonElement, AppShellNavToggleProps>(
  function AppShellNavToggle({ texts, icon, className, ...rest }, ref) {
    const label = mergeTexts({ label: 'Abrir navegação' }, texts).label;
    const { navId, navOpen } = useAppShell();
    return (
      <Button
        {...rest}
        ref={ref}
        variant="ghost"
        iconOnly
        aria-label={label}
        className={cx('eds-app-nav-toggle', className)}
        popoverTarget={navId}
        aria-expanded={navOpen}
      >
        {icon ?? <MenuGlyph />}
      </Button>
    );
  },
);
AppShellNavToggle.displayName = 'AppShellNavToggle';
