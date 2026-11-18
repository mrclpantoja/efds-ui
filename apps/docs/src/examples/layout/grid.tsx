import { Card, CardBody, Grid, GridItem } from '@eds-ui/react';

export default function GridColunas() {
  return (
    <Grid>
      <GridItem span={8}>
        <Card>
          <CardBody>8 colunas</CardBody>
        </Card>
      </GridItem>
      <GridItem span={4}>
        <Card>
          <CardBody>4 colunas</CardBody>
        </Card>
      </GridItem>
      {[1, 2, 3].map((n) => (
        <GridItem key={n} span={4}>
          <Card>
            <CardBody>4 colunas</CardBody>
          </Card>
        </GridItem>
      ))}
    </Grid>
  );
}
