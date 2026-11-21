import { Button, ButtonGroup } from '@efds-ui/react';

export default function Periodo() {
  return (
    <ButtonGroup aria-label="Período do relatório">
      <Button>Dia</Button>
      <Button>Semana</Button>
      <Button>Mês</Button>
    </ButtonGroup>
  );
}
