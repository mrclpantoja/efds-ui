import { Button, Stack } from '@eds-ui/react';
import { DownloadIcon, EditIcon, PlusIcon } from '@eds-ui/icons';

export default function Icones() {
  return (
    <Stack direction="row" wrap align="center" gap={3}>
      <Button variant="primary">
        <PlusIcon />
        Novo cliente
      </Button>
      <Button>
        Baixar relatório
        <DownloadIcon />
      </Button>
      {/* Botão só de ícone: `iconOnly` exige `aria-label` no tipo. */}
      <Button variant="ghost" iconOnly aria-label="Editar pedido">
        <EditIcon />
      </Button>
    </Stack>
  );
}
