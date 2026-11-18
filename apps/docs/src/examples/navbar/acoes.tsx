import { Button, Input, Navbar, NavbarActions, NavbarBrand } from '@eds-ui/react';
import { BellIcon, DashboardIcon } from '@eds-ui/icons';

export default function Acoes() {
  return (
    <Navbar>
      <NavbarBrand href="#/componentes/navbar">
        <DashboardIcon />
        Gestão Exemplo
      </NavbarBrand>
      <NavbarActions>
        <Input type="search" placeholder="Buscar…" aria-label="Buscar no sistema" />
        <Button variant="ghost" iconOnly aria-label="Notificações">
          <BellIcon />
        </Button>
      </NavbarActions>
    </Navbar>
  );
}
