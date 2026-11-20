import { Button, Divider, Stack } from '@eds-ui/react';

export default function Rotulo() {
  return (
    <Stack gap={4}>
      <Button variant="primary">Entrar com e-mail</Button>
      <Divider label="ou" />
      <Button variant="secondary">Entrar com certificado</Button>
    </Stack>
  );
}
