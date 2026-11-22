import { Figure, Image } from '@efds-ui/react';

export default function Figura() {
  return (
    <Figure caption="Vista geral do canteiro na primeira etapa." credit="Foto: Ana Exemplo">
      <Image src="/img/obra-1.svg" alt="Vista geral do canteiro de obras" ratio="16x9" />
    </Figure>
  );
}
