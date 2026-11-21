import { Badge, Stack } from '@efds-ui/react';

export default function Variantes() {
  return (
    <Stack direction="row" wrap gap={3}>
      <Badge>Rascunho</Badge>
      <Badge variant="info">Em análise</Badge>
      <Badge variant="success">Pago</Badge>
      <Badge variant="warning">Pendente</Badge>
      <Badge variant="danger">Atrasado</Badge>
    </Stack>
  );
}
