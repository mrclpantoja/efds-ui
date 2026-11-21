import { Badge, Breadcrumb, BreadcrumbItem, Button, Page, PageHeader } from '@efds-ui/react';

export default function Basico() {
  return (
    <Page>
      <PageHeader
        breadcrumb={
          <Breadcrumb>
            <BreadcrumbItem href="#/componentes/page-header">Início</BreadcrumbItem>
            <BreadcrumbItem current>Pedidos</BreadcrumbItem>
          </Breadcrumb>
        }
        title="Pedidos"
        description="Acompanhe os pedidos recebidos e o andamento de cada um."
        meta={
          <>
            <Badge variant="success">Operação normal</Badge>
            <span className="eds-text-small">Atualizado às 14:32</span>
          </>
        }
        actions={
          <>
            <Button variant="secondary">Exportar</Button>
            <Button variant="primary">Novo pedido</Button>
          </>
        }
      />
    </Page>
  );
}
