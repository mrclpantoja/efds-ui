import { Button, Stack, useDialog, useToast } from '@efds-ui/react';

export default function Confirmar() {
  const dialog = useDialog();
  const toast = useToast();

  const excluir = async () => {
    const ok = await dialog.confirm(
      'Excluir o pedido PED-0001? Esta ação não pode ser desfeita.',
      'Excluir pedido',
      'danger',
      { okText: 'Excluir' },
    );
    toast.show({
      variant: ok ? 'success' : 'info',
      message: ok ? 'Pedido PED-0001 excluído.' : 'Exclusão cancelada.',
    });
  };

  const enviar = async () => {
    const ok = await dialog.confirm('Enviar a nota fiscal ao cliente?', 'Enviar', 'question');
    toast.show({
      variant: ok ? 'success' : 'info',
      message: ok ? 'Nota fiscal enviada.' : 'Envio cancelado.',
    });
  };

  return (
    <Stack direction="row" wrap gap={3}>
      <Button variant="danger" onClick={() => void excluir()}>
        Excluir pedido
      </Button>
      <Button onClick={() => void enviar()}>Enviar nota fiscal</Button>
    </Stack>
  );
}
