import { Avatar, Stack } from '@eds-ui/react';

export default function Status() {
  return (
    <Stack direction="row" wrap gap={5}>
      <Avatar name="Ana Exemplo" status="online" />
      <Avatar name="Bruno Teste" status="busy" />
      <Avatar name="Carla Modelo" status="away" />
      <Avatar name="Diego Fictício" status="offline" />
    </Stack>
  );
}
