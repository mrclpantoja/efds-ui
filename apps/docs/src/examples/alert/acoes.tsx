import { Alert, Button } from '@efds-ui/react';

export default function Acoes() {
  return (
    <Alert
      variant="warning"
      title="Faturas em atraso"
      actions={
        <>
          <Button size="sm">Ver faturas</Button>
          <Button size="sm" variant="ghost">
            Lembrar depois
          </Button>
        </>
      }
    >
      <p>Existem 3 faturas vencidas há mais de 30 dias. Revise antes de fechar o período.</p>
    </Alert>
  );
}
