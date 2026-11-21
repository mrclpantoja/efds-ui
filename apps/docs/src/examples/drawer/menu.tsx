import { useState } from 'react';
import { Button, Drawer, Sidebar, SidebarItem, SidebarSection } from '@efds-ui/react';
import { BellIcon, DashboardIcon, DownloadIcon, UserIcon, UsersIcon } from '@efds-ui/icons';

export default function Menu() {
  const [open, setOpen] = useState(false);
  const fechar = () => setOpen(false);
  const href = '#/componentes/drawer';
  return (
    <>
      <Button variant="tertiary" onClick={() => setOpen(true)}>
        Menu
      </Button>
      <Drawer open={open} onClose={fechar} placement="start" title="Menu">
        {/* A navegação do Drawer reaproveita a Sidebar, sem o botão de colapsar. */}
        <Sidebar collapsible={false}>
          <SidebarSection>
            <SidebarItem href={href} icon={<DashboardIcon />} current onClick={fechar}>
              Início
            </SidebarItem>
            <SidebarItem href={href} icon={<UsersIcon />} onClick={fechar}>
              Equipe
            </SidebarItem>
            <SidebarItem href={href} icon={<DownloadIcon />} onClick={fechar}>
              Relatórios
            </SidebarItem>
          </SidebarSection>
          <SidebarSection title="Conta">
            <SidebarItem href={href} icon={<BellIcon />} onClick={fechar}>
              Notificações
            </SidebarItem>
            <SidebarItem href={href} icon={<UserIcon />} onClick={fechar}>
              Meu perfil
            </SidebarItem>
          </SidebarSection>
        </Sidebar>
      </Drawer>
    </>
  );
}
