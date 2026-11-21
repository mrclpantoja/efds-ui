import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardLink,
  CardTitle,
  Grid,
} from '@efds-ui/react';

export default function Interativo() {
  return (
    <Grid auto>
      <Card interactive>
        <CardHeader>
          <CardTitle level={4}>
            <CardLink href="#/componentes/card">Relatório mensal</CardLink>
          </CardTitle>
        </CardHeader>
        <CardBody>Clique em qualquer área, exceto no botão abaixo.</CardBody>
        <CardFooter>
          <Button size="sm">Baixar PDF</Button>
        </CardFooter>
      </Card>
    </Grid>
  );
}
