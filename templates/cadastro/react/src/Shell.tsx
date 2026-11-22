import { useEffect, useRef, type ReactNode } from 'react';
import {
  AppShell,
  AppShellHeader,
  AppShellNavToggle,
  Avatar,
  Breadcrumb,
  BreadcrumbItem,
  Container,
  NavbarActions,
  Page,
  PageHeader,
  Sidebar,
  SidebarItem,
  SidebarSection,
} from '@efds-ui/react';
import { PlusIcon } from '@efds-ui/icons';

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

function BuildingIcon() {
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
      <path d="M3 21h18M5 21V8l7-4 7 4v13M9 21v-6h6v6" />
    </svg>
  );
}

/** O roteador marca true a cada troca de rota; o shell que montar em seguida move o foco ao h1. */
export const shellState = { navigated: false };

export interface Crumb {
  label: string;
  href?: string;
}

interface ShellProps {
  current: 'lista' | 'novo';
  title: string;
  description?: string;
  breadcrumb: Crumb[];
  actions?: ReactNode;
  /** Largura máxima do conteúdo: xl (listas) ou lg (formulário e detalhe). */
  width?: 'xl' | 'lg';
  children: ReactNode;
}

/** App shell simples: sidebar, cabeçalho e uma página com título, trilha e ações. */
export function Shell({
  current,
  title,
  description,
  breadcrumb,
  actions,
  width = 'lg',
  children,
}: ShellProps) {
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    document.title = `${title} · Cadastro`;
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
      mainClassName="cad-main"
      sidebar={
        <Sidebar brandIcon={<BrandMark />} brandLabel="Compras Exemplo">
          <SidebarSection title="Cadastros">
            <SidebarItem href="#/" icon={<BuildingIcon />} current={current === 'lista'}>
              Fornecedores
            </SidebarItem>
            <SidebarItem href="#/novo" icon={<PlusIcon />} current={current === 'novo'}>
              Novo fornecedor
            </SidebarItem>
          </SidebarSection>
        </Sidebar>
      }
      header={
        <AppShellHeader>
          <AppShellNavToggle />
          <NavbarActions>
            <span className="eds-text-small cad-muted">Ana Exemplo · Compras</span>
            <Avatar name="Ana Exemplo" size="sm" />
          </NavbarActions>
        </AppShellHeader>
      }
    >
      <Container size={width}>
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
