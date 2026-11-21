import { Button, Divider, Stack } from '@efds-ui/react';

export default function Vertical() {
  return (
    <Stack direction="row" wrap align="center" gap={3}>
      <Button variant="ghost" size="sm">
        Início
      </Button>
      <Divider orientation="vertical" />
      <Button variant="ghost" size="sm">
        Pedidos
      </Button>
      <Divider orientation="vertical" />
      <Button variant="ghost" size="sm">
        Relatórios
      </Button>
    </Stack>
  );
}
