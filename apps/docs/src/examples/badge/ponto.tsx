import { Badge, Stack } from '@efds-ui/react';

export default function Ponto() {
  return (
    <Stack direction="row" wrap gap={3}>
      <Badge dot>Rascunho</Badge>
      <Badge tone="info" dot>
        Em análise
      </Badge>
      <Badge tone="success" dot>
        Pago
      </Badge>
      <Badge tone="warning" dot>
        Pendente
      </Badge>
      <Badge tone="danger" dot>
        Atrasado
      </Badge>
    </Stack>
  );
}
