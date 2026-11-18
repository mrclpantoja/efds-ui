import { Button, EmptyState } from '@eds-ui/react';
import { SearchIcon } from '@eds-ui/icons';

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
