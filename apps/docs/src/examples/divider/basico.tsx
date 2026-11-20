import { Divider, Stack } from '@eds-ui/react';

export default function Basico() {
  return (
    <Stack gap={4}>
      <p>Dados do cliente</p>
      <Divider />
      <p>Endereço de entrega</p>
      <Divider strong />
      <p>Pagamento</p>
    </Stack>
  );
}
