import { Image } from '@efds-ui/react';

// As versões são do seu servidor: `getSrc` diz a URL de cada largura e formato.
// Neste exemplo todas apontam para o mesmo arquivo fictício.
const getSrc = () => '/img/obra-4.svg';

export default function Picture() {
  return (
    <Image
      src="/img/obra-4.svg"
      alt="Paisagem fictícia em tons de roxo"
      ratio="16x9"
      widths={[480, 960]}
      formats={['image/avif', 'image/webp', 'image/jpeg']}
      getSrc={getSrc}
      sizes="(min-width: 768px) 50vw, 100vw"
    />
  );
}
