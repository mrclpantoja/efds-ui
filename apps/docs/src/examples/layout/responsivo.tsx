import { Card, CardBody, Grid, GridItem, Stack } from '@efds-ui/react';

const indicadores = ['Receita', 'Pedidos', 'Clientes', 'Ticket médio'];

/** O mesmo markup: o grid decide as colunas pela largura do contêiner onde está. */
function Indicadores() {
  return (
    <Grid>
      {indicadores.map((nome) => (
        <GridItem key={nome} spanSm={6} spanMd={3}>
          <Card>
            <CardBody>{nome}</CardBody>
          </Card>
        </GridItem>
      ))}
    </Grid>
  );
}

export default function Responsivo() {
  return (
    <Stack gap={5}>
      <Stack gap={2}>
        <p className="eds-text-label">Área larga</p>
        <div className="docs-frame-wide">
          <Indicadores />
        </div>
      </Stack>
      <Stack gap={2}>
        <p className="eds-text-label">Painel estreito</p>
        <div className="docs-frame-narrow">
          <Indicadores />
        </div>
      </Stack>
    </Stack>
  );
}
