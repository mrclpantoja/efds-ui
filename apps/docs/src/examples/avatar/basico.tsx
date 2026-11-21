import { Avatar, Stack } from '@efds-ui/react';

export default function Basico() {
  return (
    <Stack direction="row" wrap gap={3}>
      <Avatar name="Ana Exemplo" />
      <Avatar name="Bruno Teste" />
      <Avatar name="Carla Modelo" />
      <Avatar name="Diego Fictício" />
      <Avatar name="Elisa Demo" />
      <Avatar name="Fábio Amostra" />
      <Avatar name="Sem Tom" tone={1} />
    </Stack>
  );
}
