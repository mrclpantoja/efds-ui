import { Card, CardBody, CardFooter, CardHeader, CardTitle, Grid } from '@efds-ui/react';

const projetos = [
  {
    id: 'aurora',
    titulo: 'Projeto Aurora',
    texto: 'Migração do módulo de faturamento para o novo fluxo de aprovação.',
    meta: '12 tarefas · prazo em 30/11',
  },
  {
    id: 'atlas',
    titulo: 'Projeto Atlas',
    texto:
      'Catálogo de fornecedores com revisão trimestral de contratos, histórico de preços e alertas de vencimento para a equipe de compras da unidade central.',
    meta: '8 tarefas · prazo em 15/12',
  },
  {
    id: 'bussola',
    titulo: 'Projeto Bússola',
    texto: 'Painel de indicadores.',
    meta: '3 tarefas · prazo em 05/01',
  },
];

export default function Subgrid() {
  return (
    <Grid auto>
      {projetos.map((projeto) => (
        <Card key={projeto.id} variant="elevated" subgrid>
          <CardHeader>
            <CardTitle level={4}>{projeto.titulo}</CardTitle>
          </CardHeader>
          <CardBody>
            <p>{projeto.texto}</p>
          </CardBody>
          <CardFooter>
            <span className="eds-text-small">{projeto.meta}</span>
          </CardFooter>
        </Card>
      ))}
    </Grid>
  );
}
