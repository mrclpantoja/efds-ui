import { Card, CardBody, Grid } from '@eds-ui/react';

export default function Automatico() {
  return (
    <Grid auto>
      {['A', 'B', 'C', 'D', 'E'].map((letra) => (
        <Card key={letra}>
          <CardBody>Cartão {letra}</CardBody>
        </Card>
      ))}
    </Grid>
  );
}
