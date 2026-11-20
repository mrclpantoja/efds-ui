import { useState } from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Field,
  FilterBar,
  Input,
  Page,
  PageBody,
  PageFooter,
  PageHeader,
  PageToolbar,
  Pagination,
  Select,
  Stat,
  StatGrid,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@eds-ui/react';

const pedidos = [
  { codigo: 'PED-0001', cliente: 'Atelier Exemplo', total: 'R$ 1.280,50' },
  { codigo: 'PED-0002', cliente: 'Comércio Modelo', total: 'R$ 459,00' },
  { codigo: 'PED-0003', cliente: 'Oficina Fictícia', total: 'R$ 2.015,90' },
];

export default function Pagina() {
  const [pagina, setPagina] = useState(1);
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
        actions={
          <>
            <Button variant="secondary">Exportar</Button>
            <Button variant="primary">Novo pedido</Button>
          </>
        }
      />
      <StatGrid>
        <Stat label="Pedidos no mês" value="1.284" delta="12,4%" trend="up" tone="positive" />
        <Stat label="Em atraso" value="37" delta="0%" trend="flat" tone="neutral" />
      </StatGrid>
      <PageToolbar>
        <FilterBar aria-label="Filtrar pedidos">
          <Field label="Buscar" className="eds-filter-bar-search">
            <Input type="search" placeholder="Código ou cliente" autoComplete="off" />
          </Field>
          <Field label="Situação">
            <Select defaultValue="">
              <option value="">Todas</option>
              <option value="ativo">Ativo</option>
              <option value="pendente">Pendente</option>
            </Select>
          </Field>
        </FilterBar>
      </PageToolbar>
      <PageBody>
        <Table caption="Pedidos recentes">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Código</TableHeaderCell>
              <TableHeaderCell>Cliente</TableHeaderCell>
              <TableHeaderCell numeric>Total</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pedidos.map((p) => (
              <TableRow key={p.codigo}>
                <TableCell>{p.codigo}</TableCell>
                <TableCell>{p.cliente}</TableCell>
                <TableCell numeric>{p.total}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </PageBody>
      <PageFooter>
        <p className="eds-text-small">1–3 de 248</p>
        <Pagination page={pagina} pageCount={83} onPageChange={setPagina} showInfo={false} />
      </PageFooter>
    </Page>
  );
}
