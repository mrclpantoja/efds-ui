import { Button, EmptyState } from '@efds-ui/react';
import { SearchIcon } from '@efds-ui/icons';

export default function Basico() {
  return (
    <EmptyState
      icon={<SearchIcon />}
      title="Nenhum cliente cadastrado"
      description="Cadastre o primeiro cliente para começar a emitir pedidos."
      actions={<Button variant="primary">Novo cliente</Button>}
    />
  );
}
