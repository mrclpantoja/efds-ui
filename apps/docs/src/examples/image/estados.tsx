import { Image, Stack } from '@efds-ui/react';

export default function Estados() {
  return (
    <Stack direction="row" wrap align="start" gap={3}>
      <Image src="/img/obra-3.svg" alt="Paisagem fictícia em tons de verde" ratio="16x9" />
      <Image src="/img/arquivo-que-nao-existe.svg" alt="Imagem que não existe" ratio="16x9" />
    </Stack>
  );
}
