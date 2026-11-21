import { Button, Stack, Tooltip } from '@efds-ui/react';
import { EditIcon } from '@efds-ui/icons';

export default function Basico() {
  return (
    <Stack direction="row" wrap gap={3}>
      <Tooltip content="Editar pedido">
        <Button iconOnly variant="ghost" aria-label="Editar pedido">
          <EditIcon />
        </Button>
      </Tooltip>
      <Tooltip content="O rascunho fica guardado por 30 dias e não notifica ninguém.">
        <Button variant="secondary">Salvar rascunho</Button>
      </Tooltip>
      <Tooltip content="Aparece abaixo do botão" placement="bottom">
        <Button variant="secondary">Dica abaixo</Button>
      </Tooltip>
    </Stack>
  );
}
