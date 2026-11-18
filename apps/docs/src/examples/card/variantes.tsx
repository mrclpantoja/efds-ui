import {
  Button,
  Card,
  CardActions,
  CardBody,
  CardFooter,
  CardHeader,
  CardTitle,
  Grid,
} from '@eds-ui/react';
import { CloseIcon } from '@eds-ui/icons';

export default function Variantes() {
  return (
    <Grid auto>
      <Card>
        <CardHeader>
          <CardTitle level={4}>Padrão</CardTitle>
        </CardHeader>
        <CardBody>Fundo de superfície, borda de 1px e raio médio. Sem sombra.</CardBody>
      </Card>

      <Card variant="outlined">
        <CardHeader>
          <CardTitle level={4}>Contornado</CardTitle>
        </CardHeader>
        <CardBody>Borda mais forte, para separar áreas densas.</CardBody>
      </Card>

      <Card variant="elevated">
        <CardHeader>
          <CardTitle level={4}>Elevado</CardTitle>
          <CardActions>
            <Button variant="ghost" size="sm" iconOnly aria-label="Dispensar cartão">
              <CloseIcon />
            </Button>
          </CardActions>
        </CardHeader>
        <CardBody>Sombra suave; a borda permanece no modo escuro.</CardBody>
        <CardFooter>
          <Button size="sm">Detalhes</Button>
        </CardFooter>
      </Card>
    </Grid>
  );
}
