import { useEffect, useState, type ReactNode } from 'react';
import {
  AppShell,
  AppShellHeader,
  AppShellNavToggle,
  Avatar,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  CommandPalette,
  Container,
  Dropdown,
  DropdownItem,
  DropdownSeparator,
  NavbarActions,
  NotificationBell,
  Page,
  PageHeader,
  Sidebar,
  SidebarItem,
  SidebarSection,
  useAppShell,
  useDialog,
  type CommandPaletteItem,
} from '@efds-ui/react';
import { BellIcon, DashboardIcon, SearchIcon, UserIcon } from '@efds-ui/icons';
import { usuario, type Notificacao } from './data';
import { EngrenagemIcon, MarcaIcon, SairIcon } from './icones';

export type Rota = 'inicio' | 'notificacoes' | 'perfil' | 'configuracoes' | 'nao-encontrada';

export const caminhos: Record<Exclude<Rota, 'nao-encontrada'>, string> = {
  inicio: '#/',
  notificacoes: '#/notificacoes',
  perfil: '#/perfil',
  configuracoes: '#/configuracoes',
};

const comandos: CommandPaletteItem[] = [
  {
    value: 'inicio',
    label: 'Início',
    description: 'Visão geral do painel',
    group: 'Páginas',
    href: caminhos.inicio,
    icon: <DashboardIcon />,
    keywords: 'painel resumo indicadores',
  },
  {
    value: 'notificacoes',
    label: 'Notificações',
    description: 'Avisos do sistema',
    group: 'Páginas',
    href: caminhos.notificacoes,
    icon: <BellIcon />,
    keywords: 'avisos mensagens',
  },
  {
    value: 'perfil',
    label: 'Meu perfil',
    description: 'Dados pessoais e foto',
    group: 'Páginas',
    href: caminhos.perfil,
    icon: <UserIcon />,
    keywords: 'conta usuário',
  },
  {
    value: 'configuracoes',
    label: 'Configurações',
    description: 'Aparência, preferências e sessão',
    group: 'Páginas',
    href: caminhos.configuracoes,
    icon: <EngrenagemIcon />,
    keywords: 'ajustes opções',
  },
  {
    value: 'senha',
    label: 'Trocar senha',
    group: 'Ações',
    href: caminhos.perfil,
    keywords: 'segurança acesso',
  },
  {
    value: 'aparencia',
    label: 'Mudar a aparência',
    description: 'Tema, modo escuro, densidade e forma',
    group: 'Ações',
    href: caminhos.configuracoes,
    keywords: 'tema escuro cores densidade',
  },
];

const navegacao = [
  { rota: 'inicio', label: 'Início', icon: <DashboardIcon /> },
  { rota: 'notificacoes', label: 'Notificações', icon: <BellIcon /> },
  { rota: 'perfil', label: 'Meu perfil', icon: <UserIcon /> },
  { rota: 'configuracoes', label: 'Configurações', icon: <EngrenagemIcon /> },
] as const;

/**
 * Estado que sobrevive à troca de tela (cada tela monta o próprio shell): preferência de menu
 * recolhido e o aviso do roteador de que houve navegação.
 */
export const estadoShell = { navegou: false, recolhida: false };

/** Em SPA, depois de navegar: leva o foco ao h1 da nova página (o leitor de tela percebe a troca). */
function FocoAoNavegar() {
  const { mainId } = useAppShell();
  useEffect(() => {
    if (!estadoShell.navegou) return;
    estadoShell.navegou = false;
    const h1 = document.getElementById(mainId)?.querySelector<HTMLElement>('h1');
    if (h1) {
      h1.tabIndex = -1;
      h1.focus();
    }
  }, [mainId]);
  return null;
}

export interface Trilha {
  label: string;
  href?: string;
}

interface ShellProps {
  rota: Rota;
  titulo: string;
  descricao?: string;
  trilha?: Trilha[];
  acoes?: ReactNode;
  banner?: ReactNode;
  largura?: 'xl' | 'lg';
  notificacoes: Notificacao[];
  onLer: (id: string) => void;
  onLerTodas: () => void;
  children: ReactNode;
}

/** O que o App repassa a toda tela: o estado das notificações (sino e caixa de entrada). */
export type ShellBaseProps = Pick<ShellProps, 'notificacoes' | 'onLer' | 'onLerTodas'>;

export function Shell({
  rota,
  titulo,
  descricao,
  trilha,
  acoes,
  banner,
  largura = 'xl',
  notificacoes,
  onLer,
  onLerTodas,
  children,
}: ShellProps) {
  const [buscaAberta, setBuscaAberta] = useState(false);
  const dialog = useDialog();

  useEffect(() => {
    document.title = `${titulo} · Painel administrativo`;
  }, [titulo]);

  const sair = async () => {
    // Num sistema real, aqui vai a saída (ex.: location.assign('/sair')).
    if (await dialog.confirm('Deseja sair do painel?', 'Sair')) location.hash = caminhos.inicio;
  };

  return (
    <AppShell
      mainId="conteudo"
      mainClassName="pn-main"
      banner={banner}
      sidebar={
        <Sidebar
          brandIcon={<MarcaIcon />}
          brandLabel="Painel Exemplo"
          aria-label="Principal"
          defaultCollapsed={estadoShell.recolhida}
          onCollapsedChange={(recolhida) => {
            estadoShell.recolhida = recolhida;
          }}
        >
          <SidebarSection title="Administração">
            {navegacao.map((item) => (
              <SidebarItem
                key={item.rota}
                href={caminhos[item.rota]}
                icon={item.icon}
                current={rota === item.rota}
              >
                {item.label}
              </SidebarItem>
            ))}
          </SidebarSection>
        </Sidebar>
      }
      header={
        <AppShellHeader>
          <AppShellNavToggle />
          <Button onClick={() => setBuscaAberta(true)}>
            <SearchIcon />
            <span className="pn-search-label">Buscar</span>
            <kbd className="eds-command-shortcut pn-wide-only">Ctrl K</kbd>
          </Button>
          <NavbarActions>
            <NotificationBell
              items={notificacoes.map((n) => ({ ...n, href: caminhos.notificacoes }))}
              onRead={onLer}
              onReadAll={onLerTodas}
            />
            <Dropdown
              trigger={
                <Button variant="ghost" aria-label={`${usuario.nome}, menu da conta`}>
                  <Avatar name={usuario.nome} size="sm" decorative />
                  <span className="pn-wide-only">{usuario.nome}</span>
                </Button>
              }
            >
              <DropdownItem href={caminhos.perfil}>
                <UserIcon />
                Meu perfil
              </DropdownItem>
              <DropdownItem href={caminhos.configuracoes}>
                <EngrenagemIcon />
                Configurações
              </DropdownItem>
              <DropdownSeparator />
              <DropdownItem onClick={() => void sair()}>
                <SairIcon />
                Sair
              </DropdownItem>
            </Dropdown>
          </NavbarActions>
        </AppShellHeader>
      }
    >
      <FocoAoNavegar />
      <CommandPalette
        items={comandos}
        open={buscaAberta}
        onOpenChange={setBuscaAberta}
        texts={{ title: 'Busca no painel', search: 'Buscar páginas e ações' }}
        footer={
          <>
            <span>
              <kbd>↑</kbd> <kbd>↓</kbd> navegar
            </span>
            <span>
              <kbd>Enter</kbd> abrir
            </span>
            <span>
              <kbd>Esc</kbd> fechar
            </span>
          </>
        }
      />
      <Container size={largura}>
        <Page>
          <PageHeader
            breadcrumb={
              trilha ? (
                <Breadcrumb>
                  {trilha.map((t) => (
                    <BreadcrumbItem key={t.label} href={t.href} current={t.href === undefined}>
                      {t.label}
                    </BreadcrumbItem>
                  ))}
                </Breadcrumb>
              ) : undefined
            }
            title={titulo}
            description={descricao}
            actions={acoes}
          />
          {children}
        </Page>
      </Container>
    </AppShell>
  );
}
