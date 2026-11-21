import { Button, ButtonGroup, Stack } from '@efds-ui/react';

export default function Variantes() {
  return (
    <Stack direction="row" wrap gap={4}>
      <ButtonGroup aria-label="Ações do documento">
        <Button variant="primary">Salvar</Button>
        <Button variant="primary">Salvar e fechar</Button>
      </ButtonGroup>
      <ButtonGroup aria-label="Edição">
        <Button variant="tertiary" size="sm">
          Anterior
        </Button>
        <Button variant="tertiary" size="sm">
          Próximo
        </Button>
      </ButtonGroup>
    </Stack>
  );
}
