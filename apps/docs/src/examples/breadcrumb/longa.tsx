import { Breadcrumb, BreadcrumbItem } from '@eds-ui/react';

export default function Longa() {
  return (
    <Breadcrumb aria-label="Trilha longa">
      <BreadcrumbItem href="#/componentes/breadcrumb">Início</BreadcrumbItem>
      <BreadcrumbItem href="#/componentes/breadcrumb">
        Organização e estrutura administrativa
      </BreadcrumbItem>
      <BreadcrumbItem href="#/componentes/breadcrumb">
        Departamentos e coordenadorias regionais
      </BreadcrumbItem>
      <BreadcrumbItem href="#/componentes/breadcrumb">
        Equipe de atendimento ao cidadão
      </BreadcrumbItem>
      <BreadcrumbItem current>
        Configurações de notificações e preferências de comunicação da equipe
      </BreadcrumbItem>
    </Breadcrumb>
  );
}
