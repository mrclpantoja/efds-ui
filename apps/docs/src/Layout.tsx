import { useEffect, useRef, type ReactNode } from 'react';
import {
  AppShell,
  AppShellHeader,
  AppShellNavToggle,
  Breadcrumb,
  BreadcrumbItem,
  Container,
  NavbarActions,
  Sidebar,
  SidebarItem,
  SidebarSection,
  Stack,
  ToastProvider,
  useAppShell,
} from '@eds-ui/react';
import { AppearanceMenu } from './AppearanceMenu';
import { NotFound } from './pages/NotFound';
import { ComingSoon } from './pages/ComingSoon';
import { findRoute, routes, sections, type DocRoute } from './routes';
import { navigation, toHref, useRoutePath } from './router';

const SITE_NAME = 'eDS.ui';

/** Marca do site (não é ícone do framework). */
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

interface PageFrameProps {
  path: string;
  title: string;
  route: DocRoute | undefined;
  children: ReactNode;
}

/**
 * Cabeça da página (breadcrumb + h1) e efeitos de rota: título da aba, off-canvas fechado e
 * foco no h1 a cada navegação (SPA: o leitor de tela precisa saber que a "página" mudou).
 * Fica dentro do `<AppShell>` para usar `useAppShell`.
 */
function PageFrame({ path, title, route, children }: PageFrameProps) {
  const { closeNav, mainId } = useAppShell();
  const h1Ref = useRef<HTMLHeadingElement>(null);
  const section = sections.find((s) => s.id === route?.section);

  useEffect(() => {
    document.title = `${title} · ${SITE_NAME}`;
    closeNav();
    if (!navigation.navigated) return; // carga inicial: o foco fica onde o navegador o põe
    navigation.navigated = false;
    document.getElementById(mainId)?.scrollTo(0, 0);
    h1Ref.current?.focus();
  }, [path, title, closeNav, mainId]);

  return (
    <Container size="lg">
      <Stack gap={6} as="article">
        <Stack gap={3}>
          {section ? (
            <Breadcrumb>
              <BreadcrumbItem>{section.title}</BreadcrumbItem>
              <BreadcrumbItem current>{title}</BreadcrumbItem>
            </Breadcrumb>
          ) : null}
          <h1 className="eds-text-h1" ref={h1Ref} tabIndex={-1}>
            {title}
          </h1>
        </Stack>
        {children}
      </Stack>
    </Container>
  );
}

export function Layout() {
  const path = useRoutePath();
  const route = findRoute(path);
  const Page = route?.page;

  let body: ReactNode;
  if (!route) body = <NotFound />;
  else if (Page) body = <Page />;
  else body = <ComingSoon />;

  // Um único ToastProvider para o site inteiro: os exemplos de Toast usam este.
  return (
    <ToastProvider>
      <AppShell
        mainId="conteudo"
        sidebar={
          <Sidebar
            className="eds-sidebar-full"
            aria-label="Documentação"
            brandIcon={<BrandMark />}
            brandLabel={SITE_NAME}
            collapsible={false}
          >
            {sections.map((section) => (
              <SidebarSection key={section.id} title={section.title}>
                {routes
                  .filter((r) => r.section === section.id)
                  .map((r) => (
                    <SidebarItem key={r.path} href={toHref(r.path)} current={r.path === path}>
                      {r.title}
                    </SidebarItem>
                  ))}
              </SidebarSection>
            ))}
          </Sidebar>
        }
        header={
          <AppShellHeader aria-label="Site">
            <AppShellNavToggle />
            <span className="eds-navbar-brand docs-header-brand">
              <BrandMark />
              {SITE_NAME}
            </span>
            <NavbarActions>
              <AppearanceMenu />
            </NavbarActions>
          </AppShellHeader>
        }
      >
        <PageFrame path={path} title={route?.title ?? 'Página não encontrada'} route={route}>
          {body}
        </PageFrame>
      </AppShell>
    </ToastProvider>
  );
}
