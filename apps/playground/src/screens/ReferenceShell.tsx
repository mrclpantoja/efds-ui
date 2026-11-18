import './screens.css';
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { icons } from './icons';

export type ScreenId = 'dashboard' | 'listagem' | 'formulario';

const NAV_ID = 'rs-nav';
const MAIN_ID = 'conteudo';

const navItems: { id: ScreenId; label: string; icon: ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: icons.dashboard },
  { id: 'listagem', label: 'Clientes', icon: icons.clientes },
  { id: 'formulario', label: 'Novo cliente', icon: icons.novo },
];

/**
 * Estado que sobrevive à troca de tela (cada tela monta o próprio shell):
 * - collapsed: preferência de sidebar compacta;
 * - navigated: o roteador marca true no hashchange; o shell que montar em seguida move o
 *   foco para o h1 (SPA: o leitor de tela precisa saber que a "página" mudou).
 */
export const shellState = { collapsed: false, navigated: false };

export interface Crumb {
  label: string;
  href?: string;
}

interface ReferenceShellProps {
  current: ScreenId;
  title: string;
  description?: string;
  breadcrumb: Crumb[];
  actions?: ReactNode;
  /** Largura máxima do conteúdo: xl (padrão, telas de dados) ou lg (formulários). */
  width?: 'xl' | 'lg';
  children: ReactNode;
}

/**
 * App shell das telas de referência: um único <main>, sidebar compacta na faixa 768–1023 e
 * off-canvas (Popover API) abaixo de 768 — tudo pelo CSS do core (layout/app.css); o JS só
 * cumpre o contrato de comportamento (aria-expanded, inert, foco).
 */
export function ReferenceShell({
  current,
  title,
  description,
  breadcrumb,
  actions,
  width = 'xl',
  children,
}: ReferenceShellProps) {
  const [collapsed, setCollapsed] = useState(shellState.collapsed);
  const [navOpen, setNavOpen] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    document.title = `${title} · eDS.ui`;
  }, [title]);

  useEffect(() => {
    if (!shellState.navigated) return;
    shellState.navigated = false;
    titleRef.current?.focus();
  }, []);

  // Off-canvas: o popover não é modal. No toggle: aria-expanded, inert nos irmãos e foco.
  useEffect(() => {
    const nav = document.getElementById(NAV_ID);
    if (!nav) return;
    const onToggle = (event: Event) => {
      const open = (event as ToggleEvent).newState === 'open';
      flushSync(() => setNavOpen(open));
      if (open) {
        nav.querySelector<HTMLElement>('[aria-current="page"]')?.focus();
      } else if (document.activeElement === document.body || nav.contains(document.activeElement)) {
        document.querySelector<HTMLElement>(`[popovertarget="${NAV_ID}"]`)?.focus();
      }
    };
    nav.addEventListener('toggle', onToggle);
    return () => nav.removeEventListener('toggle', onToggle);
  }, []);

  // Navegar fecha o off-canvas; o href (#/rota) segue normalmente para o roteador.
  const closeNav = () => {
    const nav = document.getElementById(NAV_ID);
    if (nav?.matches(':popover-open')) nav.hidePopover();
  };

  // O hash é a rota: o skip link não pode trocar o hash, então move o foco à mão.
  const skip = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    document.getElementById(MAIN_ID)?.focus();
  };

  const toggleCollapsed = () => {
    shellState.collapsed = !collapsed;
    setCollapsed(!collapsed);
  };

  return (
    <div className="eds-app">
      <a className="eds-skip-link" href={`#${MAIN_ID}`} onClick={skip} inert={navOpen}>
        Pular para o conteúdo
      </a>

      <nav
        className="eds-sidebar"
        id={NAV_ID}
        popover="auto"
        aria-label="Principal"
        data-collapsed={collapsed || undefined}
      >
        <div className="eds-sidebar-header">
          {icons.marca}
          <span className="eds-sidebar-label">Gestão Exemplo</span>
        </div>
        <div className="eds-sidebar-section">
          <p className="eds-sidebar-section-title">Telas de referência</p>
          {navItems.map((item) => (
            <a
              key={item.id}
              className="eds-sidebar-item"
              href={`#/${item.id}`}
              aria-current={current === item.id ? 'page' : undefined}
              onClick={closeNav}
            >
              {item.icon}
              <span className="eds-sidebar-label">{item.label}</span>
            </a>
          ))}
        </div>
        <div className="eds-sidebar-footer">
          <a className="eds-sidebar-item" href="#/" onClick={closeNav}>
            {icons.voltar}
            <span className="eds-sidebar-label">Voltar ao playground</span>
          </a>
          <button
            type="button"
            className="eds-sidebar-item"
            aria-expanded={!collapsed}
            aria-controls={NAV_ID}
            onClick={toggleCollapsed}
          >
            {icons.recolher}
            <span className="eds-sidebar-label">Menu lateral</span>
          </button>
        </div>
      </nav>

      <header className="eds-app-header eds-navbar" inert={navOpen}>
        <button
          type="button"
          className="eds-button eds-button-ghost eds-button-icon eds-app-nav-toggle"
          popoverTarget={NAV_ID}
          aria-label="Abrir navegação"
          aria-expanded={navOpen}
        >
          {icons.menu}
        </button>
        <div className="eds-navbar-actions">
          <button
            type="button"
            className="eds-button eds-button-ghost eds-button-icon"
            aria-label="Notificações"
          >
            {icons.sino}
          </button>
          <button
            type="button"
            className="eds-button eds-button-ghost eds-button-icon"
            aria-label="Conta de Ana Exemplo"
          >
            {icons.conta}
          </button>
        </div>
      </header>

      <main className="eds-app-main rs-main" id={MAIN_ID} tabIndex={-1} inert={navOpen}>
        <div
          className={`eds-container${width === 'lg' ? ' eds-container-lg' : ''} eds-stack eds-gap-5`}
        >
          <div className="eds-stack eds-gap-2">
            <nav className="eds-breadcrumb" aria-label="Trilha">
              <ol className="eds-breadcrumb-list">
                {breadcrumb.map((crumb) => (
                  <li key={crumb.label} className="eds-breadcrumb-item">
                    {crumb.href ? (
                      <a href={crumb.href}>{crumb.label}</a>
                    ) : (
                      <span aria-current="page">{crumb.label}</span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
            <div className="eds-stack eds-stack-row eds-stack-wrap eds-stack-justify-between eds-gap-3">
              <h1 className="eds-text-h1" ref={titleRef} tabIndex={-1}>
                {title}
              </h1>
              {actions ? (
                <div className="eds-stack eds-stack-row eds-stack-wrap eds-gap-2">{actions}</div>
              ) : null}
            </div>
            {description ? <p className="rs-muted">{description}</p> : null}
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
