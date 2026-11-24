import { BellIcon, DashboardIcon, EditIcon } from '@efds-ui/icons';
import { Sidebar, SidebarItem, SidebarSection, Stack } from '@efds-ui/react';

/* badge = o contador; badgeLabel = complemento só para leitor de tela ("Contas a pagar 3 vencidas"). */
function Menu({ collapsed }: { collapsed?: boolean }) {
  return (
    <Sidebar
      aria-label={collapsed ? 'Menu com contador (compacto)' : 'Menu com contador (expandido)'}
      collapsible={false}
      collapsed={collapsed}
    >
      <SidebarSection>
        <SidebarItem href="#/componentes/sidebar" icon={<DashboardIcon />} current>
          Dashboard
        </SidebarItem>
        <SidebarItem
          href="#/componentes/sidebar"
          icon={<EditIcon />}
          badge={3}
          badgeLabel="vencidas"
        >
          Contas a pagar
        </SidebarItem>
        <SidebarItem
          href="#/componentes/sidebar"
          icon={<BellIcon />}
          badge={12}
          badgeLabel="não lidos"
        >
          Avisos
        </SidebarItem>
      </SidebarSection>
    </Sidebar>
  );
}

export default function Contador() {
  return (
    <Stack direction="row" wrap gap={5}>
      <Menu />
      <Menu collapsed />
    </Stack>
  );
}
