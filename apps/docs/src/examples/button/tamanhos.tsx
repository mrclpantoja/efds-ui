import { Button, Stack } from '@efds-ui/react';

export default function Tamanhos() {
  return (
    <Stack direction="row" wrap align="center" gap={3}>
      <Button variant="primary" size="sm">
        Pequeno
      </Button>
      <Button variant="primary">Médio</Button>
      <Button variant="primary" size="lg">
        Grande
      </Button>
    </Stack>
  );
}
