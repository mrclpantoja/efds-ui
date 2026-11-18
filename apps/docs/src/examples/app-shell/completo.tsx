import {
  AppShell,
  AppShellHeader,
  AppShellNavToggle,
  Button,
  Input,
  NavbarActions,
  Sidebar,
  SidebarItem,
  SidebarSection,
} from '@eds-ui/react';
import { BellIcon, DashboardIcon, UsersIcon } from '@eds-ui/icons';

export default function Aplicacao() {
  return (
    <AppShell
      sidebar={
        <Sidebar brandIcon={<DashboardIcon />} brandLabel="Gestão Exemplo">
          <SidebarSection title="Geral">
            <SidebarItem href="/dashboard" icon={<DashboardIcon />} current>
              Dashboard
            </SidebarItem>
            <SidebarItem href="/usuarios" icon={<UsersIcon />}>
              Usuários
            </SidebarItem>
          </SidebarSection>
        </Sidebar>
      }
      header={
        <AppShellHeader>
          <AppShellNavToggle />
          <NavbarActions>
            <Input type="search" placeholder="Buscar…" aria-label="Buscar no sistema" />
            <Button variant="ghost" iconOnly aria-label="Notificações">
              <BellIcon />
            </Button>
          </NavbarActions>
        </AppShellHeader>
      }
    >
      {/* O AppShell já renderiza o único <main>; aqui entra só o conteúdo da página. */}
      <h1 className="eds-text-h1">Dashboard</h1>
    </AppShell>
  );
}
