import { Badge, Stack } from '@efds-ui/react';

export default function Ponto() {
  return (
    <Stack direction="row" wrap gap={3}>
      <Badge dot>Rascunho</Badge>
      <Badge variant="info" dot>
        Em análise
      </Badge>
      <Badge variant="success" dot>
        Pago
      </Badge>
      <Badge variant="warning" dot>
        Pendente
      </Badge>
      <Badge variant="danger" dot>
        Atrasado
      </Badge>
    </Stack>
  );
}
