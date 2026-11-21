import { DownloadIcon, EditIcon, TrashIcon } from '@efds-ui/icons';
import { Button, Dropdown, DropdownItem, DropdownSeparator } from '@efds-ui/react';

export default function Menu() {
  return (
    <Dropdown trigger={<Button>Ações do pedido</Button>}>
      <DropdownItem>
        <EditIcon />
        Editar pedido
      </DropdownItem>
      <DropdownItem>
        <DownloadIcon />
        Exportar PDF
      </DropdownItem>
      <DropdownItem disabled>Duplicar (indisponível)</DropdownItem>
      <DropdownSeparator />
      <DropdownItem variant="danger">
        <TrashIcon />
        Excluir pedido
      </DropdownItem>
    </Dropdown>
  );
}
