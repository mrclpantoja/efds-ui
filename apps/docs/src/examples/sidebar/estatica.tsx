import { Sidebar, SidebarItem, SidebarSection } from '@eds-ui/react';
import { DashboardIcon, DownloadIcon, EditIcon, UsersIcon } from '@eds-ui/icons';

export default function Estatica() {
  return (
    <Sidebar
      aria-label="Menu do exemplo (React)"
      brandIcon={<DashboardIcon />}
      brandLabel="Gestão Exemplo"
      collapsible={false}
      footer={
        <SidebarItem href="#/componentes/sidebar" icon={<EditIcon />}>
          Configurações
        </SidebarItem>
      }
    >
      <SidebarSection title="Geral">
        <SidebarItem href="#/componentes/sidebar" icon={<DashboardIcon />} current>
          Dashboard
        </SidebarItem>
        <SidebarItem href="#/componentes/sidebar" icon={<UsersIcon />}>
          Usuários
        </SidebarItem>
      </SidebarSection>
      <SidebarSection title="Gestão">
        <SidebarItem href="#/componentes/sidebar" icon={<DownloadIcon />}>
          Relatórios
        </SidebarItem>
      </SidebarSection>
    </Sidebar>
  );
}
