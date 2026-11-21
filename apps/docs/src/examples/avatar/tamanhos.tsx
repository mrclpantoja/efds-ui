import { Avatar, Stack } from '@efds-ui/react';

export default function Tamanhos() {
  return (
    <Stack direction="row" wrap align="center" gap={4}>
      <Avatar name="Ana Exemplo" size="sm" />
      <Avatar name="Ana Exemplo" />
      <Avatar name="Ana Exemplo" size="lg" />
      <Avatar name="Elisa Demo" size="lg" circle />
    </Stack>
  );
}
