import { Button, Stack, useDialog, useToast } from '@efds-ui/react';

export default function Prompt() {
  const dialog = useDialog();
  const toast = useToast();

  const salvarComo = async () => {
    const nome = await dialog.prompt('Nome do arquivo', 'relatorio', 'Salvar como', {
      required: true,
      okText: 'Salvar',
      validate: (valor) => (valor.includes('/') ? 'Não use a barra no nome.' : ''),
    });
    if (nome !== null) toast.show({ tone: 'success', message: `Salvo como ${nome}.` });
  };

  const motivo = async () => {
    const texto = await dialog.prompt('Motivo do cancelamento', '', 'Cancelar pedido', {
      inputType: 'textarea',
      required: true,
      placeholder: 'Descreva o motivo',
    });
    if (texto !== null) toast.show({ message: 'Motivo registrado.' });
  };

  return (
    <Stack direction="row" wrap gap={3}>
      <Button onClick={() => void salvarComo()}>Salvar como…</Button>
      <Button onClick={() => void motivo()}>Motivo (textarea)</Button>
    </Stack>
  );
}
