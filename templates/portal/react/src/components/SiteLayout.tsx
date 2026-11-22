import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Banner,
  Button,
  Container,
  Drawer,
  Grid,
  GridItem,
  Navbar,
  NavbarActions,
  NavbarBrand,
  NavbarLink,
  NavbarNav,
  SegmentedControl,
  Sidebar,
  SidebarItem,
  SidebarSection,
  Stack,
  Switch,
} from '@efds-ui/react';
import { DashboardIcon, MenuIcon, SearchIcon, UserIcon } from '@efds-ui/icons';
import { org } from '../data';
import { href } from '../router';
import { readStored, writeStored } from '../storage';

export type NavId = 'inicio' | 'carta' | 'protocolo' | 'acessibilidade';

const navItems: { id: NavId; label: string; to: string }[] = [
  { id: 'inicio', label: 'Início', to: href.home },
  { id: 'carta', label: 'Carta de serviços', to: href.carta() },
  { id: 'protocolo', label: 'Consultar protocolo', to: href.protocolo() },
  { id: 'acessibilidade', label: 'Acessibilidade e ajuda', to: href.acessibilidade },
];

const KEY_MODE = 'portal:modo';
const KEY_TEXT = 'portal:texto';

type TextSize = 'padrao' | 'grande' | 'maior';
const TEXT_ATTR: Record<TextSize, string | null> = { padrao: null, grande: 'lg', maior: 'xl' };

const isTextSize = (value: string | null): value is TextSize =>
  value === 'padrao' || value === 'grande' || value === 'maior';

/** Modo escuro e tamanho do texto: guardados no navegador e aplicados em `<html>`. */
function usePreferences() {
  const [dark, setDark] = useState(() => {
    const saved = readStored(KEY_MODE);
    if (saved) return saved === 'dark';
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  });
  const [size, setSize] = useState<TextSize>(() => {
    const saved = readStored(KEY_TEXT);
    return isTextSize(saved) ? saved : 'padrao';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-mode', dark ? 'dark' : 'light');
  }, [dark]);

  useEffect(() => {
    const attr = TEXT_ATTR[size];
    if (attr) document.documentElement.setAttribute('data-text-size', attr);
    else document.documentElement.removeAttribute('data-text-size');
  }, [size]);

  return {
    dark,
    size,
    setDark: (value: boolean) => {
      setDark(value);
      writeStored(KEY_MODE, value ? 'dark' : 'light');
    },
    setSize: (value: TextSize) => {
      setSize(value);
      writeStored(KEY_TEXT, value);
    },
  };
}

function AccessibilityBar() {
  const prefs = usePreferences();
  return (
    <div className="portal-a11y">
      <Container className="portal-a11y-inner">
        <a href={href.acessibilidade}>Acessibilidade e ajuda</a>
        <div className="portal-a11y-tools" role="group" aria-label="Opções de leitura">
          <div className="portal-a11y-size">
            <span aria-hidden="true">Tamanho do texto</span>
            <SegmentedControl
              size="sm"
              legend="Tamanho do texto"
              hideLegend
              options={[
                { value: 'padrao', label: 'Padrão' },
                { value: 'grande', label: 'Grande' },
                { value: 'maior', label: 'Maior' },
              ]}
              value={prefs.size}
              onChange={(value) => {
                if (isTextSize(value)) prefs.setSize(value);
              }}
            />
          </div>
          <Switch checked={prefs.dark} onChange={(event) => prefs.setDark(event.target.checked)}>
            Modo escuro
          </Switch>
        </div>
      </Container>
    </div>
  );
}

const BrandIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    focusable="false"
    aria-hidden="true"
  >
    <path d="M3 19l6-9 4 6 3-4 5 7zM16 6.5a1.5 1.5 0 100 .01" />
  </svg>
);

interface SiteLayoutProps {
  /** Item de navegação da página atual (sem valor nas páginas internas). */
  current?: NavId;
  children: ReactNode;
}

/** Esqueleto do site: acessibilidade, cabeçalho, aviso, conteúdo e rodapé. */
export function SiteLayout({ current, children }: SiteLayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  // Navegar pelo menu móvel troca o hash: fecha o painel.
  useEffect(() => {
    const close = () => setMenuOpen(false);
    window.addEventListener('hashchange', close);
    return () => window.removeEventListener('hashchange', close);
  }, []);

  return (
    <div className="portal">
      <a
        className="eds-skip-link"
        href="#conteudo"
        onClick={(event) => {
          // O hash é do roteador: o salto só move o foco.
          event.preventDefault();
          mainRef.current?.focus();
        }}
      >
        Pular para o conteúdo
      </a>

      <AccessibilityBar />

      <Navbar className="portal-header">
        <NavbarBrand href={href.home}>
          <BrandIcon />
          {org.name}
        </NavbarBrand>
        <NavbarNav className="portal-nav" aria-label="Principal">
          {navItems.map((item) => (
            <NavbarLink key={item.id} href={item.to} current={current === item.id}>
              {item.label}
            </NavbarLink>
          ))}
        </NavbarNav>
        <NavbarActions>
          <Button className="portal-menu-button" onClick={() => setMenuOpen(true)}>
            <MenuIcon />
            Menu
          </Button>
        </NavbarActions>
      </Navbar>

      <Banner
        tone="info"
        dismissible
        rememberId="aviso-feriado-2026-11"
        aria-label="Aviso da prefeitura"
      >
        <strong>Atendimento presencial.</strong> Na sexta-feira, 27/11, o atendimento no balcão não
        funciona (feriado local). Os serviços online seguem disponíveis.
      </Banner>

      <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} placement="start" title="Menu">
        <Sidebar aria-label="Menu do portal" collapsible={false}>
          <SidebarSection>
            <SidebarItem href={href.home} icon={<DashboardIcon />} current={current === 'inicio'}>
              Início
            </SidebarItem>
            <SidebarItem href={href.carta()} icon={<MenuIcon />} current={current === 'carta'}>
              Carta de serviços
            </SidebarItem>
            <SidebarItem
              href={href.protocolo()}
              icon={<SearchIcon />}
              current={current === 'protocolo'}
            >
              Consultar protocolo
            </SidebarItem>
            <SidebarItem
              href={href.acessibilidade}
              icon={<UserIcon />}
              current={current === 'acessibilidade'}
            >
              Acessibilidade e ajuda
            </SidebarItem>
          </SidebarSection>
        </Sidebar>
      </Drawer>

      <main className="portal-main" id="conteudo" tabIndex={-1} ref={mainRef}>
        {children}
      </main>

      <footer className="portal-footer">
        <Container>
          <Grid>
            <GridItem span={12} spanMd={6} spanLg={5}>
              <Stack gap={2}>
                <p className="eds-text-h4">{org.name}</p>
                <p>
                  Portal de serviços ao cidadão. Peça, acompanhe e consulte serviços municipais sem
                  sair de casa.
                </p>
                <p className="eds-text-small portal-muted">
                  Site fictício, criado para demonstrar o efDS.ui. Órgão, serviços, números e
                  valores não são reais.
                </p>
              </Stack>
            </GridItem>
            <GridItem span={12} spanSm={6} spanMd={3} spanLg={4}>
              <Stack gap={2}>
                <h2 className="eds-text-h4">Atendimento</h2>
                <address className="portal-address">
                  {org.address}
                  <br />
                  {org.hours}
                  <br />
                  Telefone: {org.phone}
                  <br />
                  <a href={`mailto:${org.email}`}>{org.email}</a>
                </address>
              </Stack>
            </GridItem>
            <GridItem as="nav" span={12} spanSm={6} spanMd={3} aria-labelledby="rodape-links">
              <Stack gap={2}>
                <h2 className="eds-text-h4" id="rodape-links">
                  Páginas
                </h2>
                <ul className="portal-links">
                  {navItems.map((item) => (
                    <li key={item.id}>
                      <a href={item.to}>{item.label}</a>
                    </li>
                  ))}
                </ul>
              </Stack>
            </GridItem>
          </Grid>
        </Container>
      </footer>
    </div>
  );
}
