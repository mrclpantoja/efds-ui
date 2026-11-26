import { useEffect, useRef, type ReactNode } from 'react';
import {
  AppShell,
  AppShellHeader,
  AppShellNavToggle,
  Badge,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Container,
  NavbarActions,
  Sidebar,
  SidebarItem,
  SidebarSection,
  Stack,
  DialogProvider,
  ToastProvider,
  useAppShell,
} from '@efds-ui/react';
import { AppearanceMenu } from './AppearanceMenu';
import { REPOSITORY_URL } from './site';
import { NotFound } from './pages/NotFound';
import { ComingSoon } from './pages/ComingSoon';
import { findRoute, routes, sections, type DocRoute } from './routes';
import { navigation, toHref, useRoutePath } from './router';
import { canonicalUrl, pageDescription, pageTitle, SITE_NAME } from './seo';

/** Atualiza (ou cria) uma <meta>/<link> do head; a pré-renderização já grava os valores. */
function setHead(selector: string, create: () => HTMLElement, attr: string, value: string) {
  let el = document.head.querySelector<HTMLElement>(selector);
  if (!el) {
    el = create();
    document.head.append(el);
  }
  el.setAttribute(attr, value);
}

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

/** Selo de estabilidade do componente: o texto diz a situação, a cor só reforça. */
function StabilityBadge({ stability }: { stability: NonNullable<DocRoute['stability']> }) {
  const stable = stability === 'stable';
  return (
    <Stack direction="row" gap={2} wrap>
      <Badge variant={stable ? 'success' : 'warning'}>{stable ? 'Estável' : 'Experimental'}</Badge>
      <span className="eds-text-small docs-muted">
        {stable
          ? 'A API segue o versionamento semântico. '
          : 'A API ainda pode mudar numa versão menor. '}
        <a href={toHref('/comecar/politicas')}>Veja as políticas</a>
      </span>
    </Stack>
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
    document.title = pageTitle(route);
    const description = pageDescription(route);
    const meta = (name: string) => () => Object.assign(document.createElement('meta'), { name });
    setHead('meta[name="description"]', meta('description'), 'content', description);
    if (route) {
      const link = () => Object.assign(document.createElement('link'), { rel: 'canonical' });
      setHead('link[rel="canonical"]', link, 'href', canonicalUrl(route.path));
    }
    closeNav();
    if (!navigation.navigated) return; // carga inicial: o foco fica onde o navegador o põe
    navigation.navigated = false;
    document.getElementById(mainId)?.scrollTo(0, 0);
    h1Ref.current?.focus();
  }, [path, title, route, closeNav, mainId]);

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
          {route?.stability ? <StabilityBadge stability={route.stability} /> : null}
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

  // Um único ToastProvider e um único DialogProvider para o site inteiro: os exemplos de Toast e
  // de Diálogos usam estes.
  return (
    <ToastProvider>
      <DialogProvider>
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
                <Button href={REPOSITORY_URL} variant="ghost" rel="noopener">
                  GitHub
                  <span className="eds-visually-hidden"> (repositório do código)</span>
                </Button>
                <AppearanceMenu />
              </NavbarActions>
            </AppShellHeader>
          }
        >
          <PageFrame path={path} title={route?.title ?? 'Página não encontrada'} route={route}>
            {body}
          </PageFrame>
        </AppShell>
      </DialogProvider>
    </ToastProvider>
  );
}
