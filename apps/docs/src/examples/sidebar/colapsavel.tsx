import { useState } from 'react';
import { AppShell, AppShellHeader, AppShellNavToggle, Sidebar, SidebarItem } from '@efds-ui/react';
import { DashboardIcon, UsersIcon } from '@efds-ui/icons';

/** Sidebar com o estado de colapso controlado (por exemplo, para lembrar a escolha). */
export default function Colapsavel() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <AppShell
      sidebar={
        <Sidebar
          brandIcon={<DashboardIcon />}
          brandLabel="Gestão Exemplo"
          collapsed={collapsed}
          onCollapsedChange={setCollapsed}
          texts={{ collapse: 'Menu lateral' }}
        >
          <SidebarItem href="/dashboard" icon={<DashboardIcon />} current>
            Dashboard
          </SidebarItem>
          <SidebarItem href="/usuarios" icon={<UsersIcon />}>
            Usuários
          </SidebarItem>
        </Sidebar>
      }
      header={
        <AppShellHeader>
          <AppShellNavToggle />
        </AppShellHeader>
      }
    >
      <h1 className="eds-text-h1">Dashboard</h1>
    </AppShell>
  );
}
