import { Button, Stack } from '@eds-ui/react';

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
