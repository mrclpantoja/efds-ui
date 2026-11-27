import { Badge, Stack } from '@efds-ui/react';

export default function Variantes() {
  return (
    <Stack direction="row" wrap gap={3}>
      <Badge>Rascunho</Badge>
      <Badge tone="info">Em análise</Badge>
      <Badge tone="success">Pago</Badge>
      <Badge tone="warning">Pendente</Badge>
      <Badge tone="danger">Atrasado</Badge>
    </Stack>
  );
}
