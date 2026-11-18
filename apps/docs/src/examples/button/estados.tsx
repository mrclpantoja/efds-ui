import { Button, Stack } from '@eds-ui/react';

export default function Estados() {
  return (
    <Stack direction="row" wrap gap={3}>
      {/* Em `loading` o botão continua focável e ignora clique, Enter e Espaço. */}
      <Button variant="primary" loading>
        Salvando
      </Button>
      <Button disabled>Indisponível</Button>
      <Button href="#/componentes/button" disabled>
        Link desabilitado
      </Button>
    </Stack>
  );
}
