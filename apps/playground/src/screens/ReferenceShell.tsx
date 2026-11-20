import './screens.css';
import { useEffect, useRef, type ReactNode } from 'react';
import {
  AppShell,
  AppShellHeader,
  AppShellNavToggle,
  Avatar,
  Banner,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Container,
  NavbarActions,
  Page,
  PageHeader,
  Sidebar,
  SidebarItem,
  SidebarSection,
} from '@eds-ui/react';
import { ArrowLeftIcon, BellIcon, DashboardIcon, UserPlusIcon, UsersIcon } from '@eds-ui/icons';

export type ScreenId = 'dashboard' | 'listagem' | 'formulario';

const navItems: { id: ScreenId; label: string; icon: ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
  { id: 'listagem', label: 'Clientes', icon: <UsersIcon /> },
  { id: 'formulario', label: 'Novo cliente', icon: <UserPlusIcon /> },
];

/** Marca fictícia da aplicação de exemplo (não é ícone do framework). */
function BrandMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 2 3 7v10l9 5 9-5V7z" />
      <path d="M3 7l9 5 9-5M12 12v10" />
    </svg>
  );
}

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
 * App shell das telas de referência sobre `@eds-ui/react`: um único <main>, sidebar compacta
 * na faixa 768–1023 e off-canvas (Popover API) abaixo de 768. O que sobra aqui é da tela:
 * itens de navegação, preferência de colapso e foco no h1 ao trocar de rota.
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
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    document.title = `${title} · eDS.ui`;
  }, [title]);

  useEffect(() => {
    if (!shellState.navigated) return;
    shellState.navigated = false;
    // SPA: o foco vai ao h1 para o leitor de tela perceber a nova "página".
    const heading = headerRef.current?.querySelector('h1');
    if (heading) {
      heading.tabIndex = -1;
      heading.focus();
    }
  }, []);

  return (
    <AppShell
      mainId="conteudo"
      mainClassName="rs-main"
      sidebar={
        <Sidebar
          brandIcon={<BrandMark />}
          brandLabel="Gestão Exemplo"
          defaultCollapsed={shellState.collapsed}
          onCollapsedChange={(collapsed) => {
            shellState.collapsed = collapsed;
          }}
          footer={
            <SidebarItem href="#/" icon={<ArrowLeftIcon />}>
              Voltar ao playground
            </SidebarItem>
          }
        >
          <SidebarSection title="Telas de referência">
            {navItems.map((item) => (
              <SidebarItem
                key={item.id}
                href={`#/${item.id}`}
                icon={item.icon}
                current={current === item.id}
              >
                {item.label}
              </SidebarItem>
            ))}
          </SidebarSection>
        </Sidebar>
      }
      banner={
        <Banner aria-label="Aviso do ambiente" tone="warning">
          <strong>Ambiente de homologação.</strong> Os dados desta aplicação são fictícios.
        </Banner>
      }
      header={
        <AppShellHeader>
          <AppShellNavToggle />
          <NavbarActions>
            <Button variant="ghost" iconOnly aria-label="Notificações">
              <BellIcon />
            </Button>
            <Button variant="ghost" iconOnly aria-label="Conta de Ana Exemplo">
              <Avatar name="Ana Exemplo" size="sm" decorative />
            </Button>
          </NavbarActions>
        </AppShellHeader>
      }
    >
      <Container size={width === 'lg' ? 'lg' : 'xl'}>
        <Page>
          <PageHeader
            ref={headerRef}
            breadcrumb={
              <Breadcrumb>
                {breadcrumb.map((crumb) => (
                  <BreadcrumbItem
                    key={crumb.label}
                    href={crumb.href}
                    current={crumb.href === undefined}
                  >
                    {crumb.label}
                  </BreadcrumbItem>
                ))}
              </Breadcrumb>
            }
            title={title}
            description={description}
            actions={actions}
          />
          {children}
        </Page>
      </Container>
    </AppShell>
  );
}
