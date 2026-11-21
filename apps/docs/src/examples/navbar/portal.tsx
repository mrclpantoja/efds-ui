import { Button, Navbar, NavbarActions, NavbarBrand, NavbarLink, NavbarNav } from '@efds-ui/react';
import { DashboardIcon } from '@efds-ui/icons';

export default function Portal() {
  return (
    <Navbar>
      <NavbarBrand href="#/componentes/navbar">
        <DashboardIcon />
        Empresa Exemplo
      </NavbarBrand>
      <NavbarNav aria-label="Seções do portal">
        <NavbarLink href="#/componentes/navbar" current>
          Visão geral
        </NavbarLink>
        <NavbarLink href="#/componentes/navbar">Produtos</NavbarLink>
        <NavbarLink href="#/componentes/navbar">Clientes</NavbarLink>
        <NavbarLink href="#/componentes/navbar">Suporte</NavbarLink>
      </NavbarNav>
      <NavbarActions>
        <Button variant="primary" size="sm">
          Entrar
        </Button>
      </NavbarActions>
    </Navbar>
  );
}
