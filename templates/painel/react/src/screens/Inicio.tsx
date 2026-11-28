import {
  Badge,
  Banner,
  Button,
  Card,
  CardActions,
  CardBody,
  CardHeader,
  CardTitle,
  Grid,
  Progress,
  Stack,
  Stat,
  StatGrid,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Timeline,
} from '@efds-ui/react';
import { acessos, atividades, chamados, indicadores, metas, situacoes } from '../data';
import { AtencaoIcon, ConfereIcon, TracoIcon } from '../icones';
import { caminhos, Shell, type ShellBaseProps } from '../Shell';

const numero = new Intl.NumberFormat('pt-BR');

export function Inicio(props: ShellBaseProps) {
  return (
    <Shell
      {...props}
      rota="inicio"
      titulo="Visão geral"
      descricao="Resumo de novembro de 2026. Dados fictícios."
      acoes={<Button href={caminhos.notificacoes}>Ver notificações</Button>}
      banner={
        <Banner
          aria-label="Novidades do painel"
          tone="info"
          dismissible
          rememberId="painel-novidades-2026-11"
          actions={
            <Button href={caminhos.configuracoes} variant="secondary" size="sm">
              Experimentar
            </Button>
          }
        >
          <strong>Novidade:</strong> agora você escolhe tema, modo escuro e densidade em
          Configurações.
        </Banner>
      }
    >
      <Stack as="section" gap={3} aria-labelledby="ini-indicadores-t">
        <h2 id="ini-indicadores-t" className="eds-visually-hidden">
          Indicadores do mês
        </h2>
        <StatGrid>
          {indicadores.map((i) => (
            <Stat
              key={i.label}
              icon={<TracoIcon d={i.icone} />}
              label={i.label}
              value={i.value}
              delta={i.delta}
              trend={i.trend}
              tone={i.tone}
              meta={i.meta}
            />
          ))}
        </StatGrid>
      </Stack>

      <Grid>
        <Card className="eds-col-span-lg-8" role="region" aria-labelledby="ini-chamados-t">
          <CardHeader>
            <CardTitle level={2} id="ini-chamados-t">
              Chamados recentes
            </CardTitle>
          </CardHeader>
          <Table caption="Chamados recentes, do mais novo para o mais antigo">
            <TableHead>
              <TableRow>
                <TableHeaderCell>Protocolo</TableHeaderCell>
                <TableHeaderCell>Assunto</TableHeaderCell>
                <TableHeaderCell>Situação</TableHeaderCell>
                <TableHeaderCell>Unidade</TableHeaderCell>
                <TableHeaderCell>Abertura</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {chamados.map((c) => (
                <TableRow key={c.protocolo}>
                  <TableHeaderCell scope="row">{c.protocolo}</TableHeaderCell>
                  <TableCell>{c.assunto}</TableCell>
                  <TableCell>
                    <Badge tone={situacoes[c.situacao].badge}>{situacoes[c.situacao].label}</Badge>
                  </TableCell>
                  <TableCell>{c.unidade}</TableCell>
                  <TableCell>{c.abertura}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <Card
          className="eds-col-span-lg-4 pn-self-start"
          role="region"
          aria-labelledby="ini-metas-t"
        >
          <CardHeader>
            <CardTitle level={2} id="ini-metas-t">
              Metas do mês
            </CardTitle>
          </CardHeader>
          <CardBody className="eds-stack eds-gap-4">
            {metas.map((m) => (
              <Progress key={m.id} label={m.label} value={m.value} tone={m.tone} />
            ))}
          </CardBody>
        </Card>

        <Card className="eds-col-span-lg-6" role="region" aria-labelledby="ini-acessos-t">
          <CardHeader>
            <CardTitle level={2} id="ini-acessos-t">
              Acessos por unidade
            </CardTitle>
            <CardActions>
              <Button variant="ghost" size="sm" href={caminhos.configuracoes}>
                Ajustar sessão
              </Button>
            </CardActions>
          </CardHeader>
          <Table caption="Usuários e acessos de hoje por unidade">
            <TableHead>
              <TableRow>
                <TableHeaderCell>Unidade</TableHeaderCell>
                <TableHeaderCell numeric>Usuários</TableHeaderCell>
                <TableHeaderCell numeric>Acessos hoje</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {acessos.map((a) => (
                <TableRow key={a.unidade}>
                  <TableHeaderCell scope="row">{a.unidade}</TableHeaderCell>
                  <TableCell numeric>{numero.format(a.usuarios)}</TableCell>
                  <TableCell numeric>{numero.format(a.hoje)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <Card className="eds-col-span-lg-6" role="region" aria-labelledby="ini-atividades-t">
          <CardHeader>
            <CardTitle level={2} id="ini-atividades-t">
              Atividades recentes
            </CardTitle>
          </CardHeader>
          <CardBody>
            <Timeline
              aria-labelledby="ini-atividades-t"
              items={atividades.map((a) => ({
                ...a,
                icon:
                  a.tone === 'success' ? (
                    <ConfereIcon />
                  ) : a.tone === 'warning' ? (
                    <AtencaoIcon />
                  ) : undefined,
              }))}
            />
          </CardBody>
        </Card>
      </Grid>
    </Shell>
  );
}
