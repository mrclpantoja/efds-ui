import { Button, Stack } from '@eds-ui/react';
import { EditIcon, PlusIcon, TrashIcon } from '@eds-ui/icons';

export default function Uso() {
  return (
    <Stack direction="row" wrap gap={3}>
      {/* Com texto, o ícone é decorativo (aria-hidden automático). */}
      <Button variant="primary">
        <PlusIcon />
        Novo pedido
      </Button>
      {/* Só ícone: iconOnly exige o aria-label, que dá o nome ao botão. */}
      <Button variant="ghost" iconOnly aria-label="Editar pedido PED-0001">
        <EditIcon />
      </Button>
      <Button variant="ghost" iconOnly aria-label="Excluir pedido PED-0001">
        <TrashIcon />
      </Button>
    </Stack>
  );
}
