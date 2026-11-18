import { Button, Navbar, NavbarActions, NavbarBrand, NavbarLink, NavbarNav } from '@eds-ui/react';
import { DashboardIcon } from '@eds-ui/icons';

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
