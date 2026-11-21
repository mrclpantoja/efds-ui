import { Button, Stack } from '@efds-ui/react';

export default function Variantes() {
  return (
    <Stack direction="row" wrap gap={3}>
      <Button variant="primary">Salvar</Button>
      <Button variant="secondary">Cancelar</Button>
      <Button variant="tertiary">Mais opções</Button>
      <Button variant="ghost">Ver detalhes</Button>
      <Button variant="danger">Excluir</Button>
    </Stack>
  );
}
