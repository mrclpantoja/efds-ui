import {
  Alert,
  Badge,
  Button,
  Card,
  CardActions,
  CardBody,
  CardHeader,
  CardTitle,
  Grid,
  Stack,
  Stat,
  StatGrid,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@efds-ui/react';
import { DownloadIcon, PlusIcon, UserPlusIcon, UsersIcon } from '@efds-ui/icons';
import { formatarData, moeda } from './data';
import { ReferenceShell } from './ReferenceShell';

/**
 * KPIs fictícios (`Stat`). Nada depende só da cor: o sentido do valor vai na seta e no texto; se é bom
 * ou ruim, vem da cor do tom (positivo/negativo) e do texto da variação.
 */
const kpis = [
  { label: 'Receita do mês', value: 'R$ 184,3 mil', delta: '+8,2%', up: true, good: true },
  { label: 'Pedidos', value: '1.248', delta: '+3,5%', up: true, good: true },
  { label: 'Ticket médio', value: moeda.format(147.7), delta: '−1,9%', up: false, good: false },
  { label: 'Pedidos em atraso', value: '17', delta: '−12%', up: false, good: true },
] as const;

const pedidoStatus = {
  pago: { label: 'Pago', badge: 'success' },
  analise: { label: 'Em análise', badge: 'info' },
  pendente: { label: 'Pendente', badge: 'warning' },
  atrasado: { label: 'Atrasado', badge: 'danger' },
} as const;

const pedidos = [
  {
    id: 'PED-0142',
    cliente: 'Aurora Comércio Exemplo',
    data: '2026-11-17',
    status: 'pago',
    valor: 1250,
  },
  {
    id: 'PED-0141',
    cliente: 'Horizonte Logística Exemplo',
    data: '2026-11-17',
    status: 'analise',
    valor: 845.5,
  },
  {
    id: 'PED-0140',
    cliente: 'Cedro Indústria Exemplo',
    data: '2026-11-16',
    status: 'pendente',
    valor: 3990,
  },
  {
    id: 'PED-0139',
    cliente: 'Farol Serviços Exemplo',
    data: '2026-11-14',
    status: 'atrasado',
    valor: 512.3,
  },
  {
    id: 'PED-0138',
    cliente: 'Prisma Tecnologia Exemplo',
    data: '2026-11-14',
    status: 'pago',
    valor: 7420,
  },
  {
    id: 'PED-0137',
    cliente: 'Jade Distribuidora Exemplo',
    data: '2026-11-13',
    status: 'pago',
    valor: 230.9,
  },
] as const;

const atividades = [
  { quem: 'Ana Exemplo', oque: 'aprovou o pedido PED-0142', quando: 'há 12 min' },
  { quem: 'Bruno Exemplo', oque: 'cadastrou o cliente Órbita Serviços Exemplo', quando: 'há 1 h' },
  { quem: 'Carla Exemplo', oque: 'emitiu a fatura FAT-0091', quando: 'há 3 h' },
  { quem: 'Diego Exemplo', oque: 'reabriu o pedido PED-0139', quando: 'ontem' },
] as const;

export function Dashboard() {
  return (
    <ReferenceShell
      current="dashboard"
      title="Dashboard"
      description="Resumo de novembro de 2026. Dados fictícios."
      breadcrumb={[{ label: 'Início' }]}
      actions={
        <>
          <Button>
            <DownloadIcon />
            Exportar
          </Button>
          <Button variant="primary" href="#/formulario">
            <PlusIcon />
            Novo cliente
          </Button>
        </>
      }
    >
      {/* KPIs: 2 colunas desde o mobile → 4 quando o grid tem ≥ 768px (largura do grid, não da tela). */}
      <Stack as="section" gap={3} aria-labelledby="dash-kpis-t">
        <h2 id="dash-kpis-t" className="eds-visually-hidden">
          Indicadores do mês
        </h2>
        <StatGrid>
          {kpis.map((kpi) => (
            <Stat
              key={kpi.label}
              label={kpi.label}
              value={kpi.value}
              delta={kpi.delta.replace(/^[+−]/, '')}
              trend={kpi.up ? 'up' : 'down'}
              tone={kpi.good ? 'success' : 'danger'}
              meta="vs. mês anterior"
            />
          ))}
        </StatGrid>
      </Stack>

      <Grid>
        {/* Pedidos recentes: 8 de 12 colunas quando o grid tem ≥ 1024px. */}
        <Card className="eds-col-span-lg-8" role="region" aria-labelledby="dash-pedidos-t">
          <CardHeader>
            <CardTitle level={2} id="dash-pedidos-t">
              Pedidos recentes
            </CardTitle>
            <CardActions>
              <Button variant="ghost" size="sm" href="#/listagem">
                Ver clientes
              </Button>
            </CardActions>
          </CardHeader>
          {/* Tabela em Card: o wrap é filho direto (o core tira a borda dupla e alinha ao padding). */}
          <Table caption="Pedidos recentes, do mais novo para o mais antigo">
            <TableHead>
              <TableRow>
                <TableHeaderCell>Pedido</TableHeaderCell>
                <TableHeaderCell>Situação</TableHeaderCell>
                <TableHeaderCell numeric>Valor</TableHeaderCell>
                <TableHeaderCell>Cliente</TableHeaderCell>
                <TableHeaderCell>Data</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pedidos.map((p) => (
                <TableRow key={p.id}>
                  <TableHeaderCell scope="row">{p.id}</TableHeaderCell>
                  <TableCell>
                    <Badge tone={pedidoStatus[p.status].badge}>
                      {pedidoStatus[p.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell numeric>{moeda.format(p.valor)}</TableCell>
                  <TableCell>{p.cliente}</TableCell>
                  <TableCell>{formatarData(p.data)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        {/*
          Coluna lateral: é um grid aninhado. No lg ocupa 4 de 12 e, estreita, empilha os
          cards; abaixo do lg vai para baixo da tabela com a largura toda e os mesmos cards
          viram 3 colunas — cada grid lê a própria largura, sem nenhuma classe a mais.
        */}
        <Grid className="eds-col-span-lg-4">
          <Card
            className="eds-col-span-md-4 rs-self-start"
            role="region"
            aria-labelledby="dash-acoes-t"
          >
            <CardHeader>
              <CardTitle level={2} id="dash-acoes-t">
                Ações rápidas
              </CardTitle>
            </CardHeader>
            <CardBody className="eds-stack eds-stack-align-start eds-gap-2">
              <Button size="sm" href="#/formulario">
                <UserPlusIcon />
                Cadastrar cliente
              </Button>
              <Button size="sm" href="#/listagem">
                <UsersIcon />
                Consultar clientes
              </Button>
              <Button size="sm">
                <DownloadIcon />
                Relatório do mês
              </Button>
            </CardBody>
          </Card>

          <Card className="eds-col-span-md-4" role="region" aria-labelledby="dash-alertas-t">
            <CardHeader>
              <CardTitle level={2} id="dash-alertas-t">
                Alertas
              </CardTitle>
            </CardHeader>
            <CardBody className="eds-stack eds-gap-3">
              <Alert tone="warning" title="17 pedidos em atraso">
                <p>Cinco deles passaram de 30 dias.</p>
              </Alert>
              <Alert tone="info" title="Fechamento do mês">
                <p>O período contábil fecha em 30/11.</p>
              </Alert>
            </CardBody>
          </Card>

          <Card className="eds-col-span-md-4" role="region" aria-labelledby="dash-ativ-t">
            <CardHeader>
              <CardTitle level={2} id="dash-ativ-t">
                Atividade recente
              </CardTitle>
            </CardHeader>
            <CardBody>
              <Stack as="ol" gap={3}>
                {atividades.map((a) => (
                  <Stack as="li" key={a.oque} gap={1}>
                    <p>
                      <strong>{a.quem}</strong> {a.oque}
                    </p>
                    <p className="eds-text-small rs-muted">{a.quando}</p>
                  </Stack>
                ))}
              </Stack>
            </CardBody>
          </Card>
        </Grid>
      </Grid>
    </ReferenceShell>
  );
}
