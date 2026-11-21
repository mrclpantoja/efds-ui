import { DownloadIcon, EditIcon, TrashIcon } from '@efds-ui/icons';
import { Button, ButtonGroup } from '@efds-ui/react';

export default function Icones() {
  return (
    <ButtonGroup aria-label="Ações do registro">
      <Button iconOnly aria-label="Editar">
        <EditIcon />
      </Button>
      <Button iconOnly aria-label="Baixar">
        <DownloadIcon />
      </Button>
      <Button variant="danger" iconOnly aria-label="Excluir">
        <TrashIcon />
      </Button>
    </ButtonGroup>
  );
}
