import { Image, Stack } from '@efds-ui/react';

export default function Proporcoes() {
  return (
    <Stack direction="row" wrap align="start" gap={3}>
      <Image src="/img/obra-1.svg" alt="Paisagem fictícia em tons de azul" ratio="1x1" />
      <Image src="/img/obra-2.svg" alt="Paisagem fictícia em tons de laranja" ratio="16x9" />
      <Image
        src="/img/retrato.svg"
        alt="Retrato fictício mostrado inteiro"
        ratio="4x3"
        fit="contain"
      />
      <Image src="/img/retrato.svg" alt="Retrato fictício em círculo" ratio="1x1" circle />
    </Stack>
  );
}
