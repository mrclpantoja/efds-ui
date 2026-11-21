import { Breadcrumb, BreadcrumbItem } from '@efds-ui/react';

export default function Basico() {
  return (
    <Breadcrumb aria-label="Trilha">
      <BreadcrumbItem href="#/componentes/breadcrumb">Dashboard</BreadcrumbItem>
      <BreadcrumbItem href="#/componentes/breadcrumb">Usuários</BreadcrumbItem>
      <BreadcrumbItem current>Ana Souza</BreadcrumbItem>
    </Breadcrumb>
  );
}
