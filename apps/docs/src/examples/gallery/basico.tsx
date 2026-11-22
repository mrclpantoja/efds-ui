import { Gallery, type GalleryItem } from '@efds-ui/react';

const items: GalleryItem[] = [
  {
    src: '/img/obra-1.svg',
    thumb: '/img/obra-1.svg',
    alt: 'Paisagem azul, fundação concluída',
    caption: 'Fundação concluída',
    width: 400,
    height: 400,
  },
  {
    src: '/img/obra-2.svg',
    thumb: '/img/obra-2.svg',
    alt: 'Paisagem laranja, estrutura em andamento',
    caption: 'Estrutura em andamento',
    width: 400,
    height: 400,
  },
  {
    src: '/img/obra-3.svg',
    thumb: '/img/obra-3.svg',
    alt: 'Paisagem verde, área externa',
    width: 400,
    height: 400,
  },
  {
    src: '/img/obra-4.svg',
    thumb: '/img/obra-4.svg',
    alt: 'Paisagem roxa, acabamento final',
    caption: 'Acabamento final',
    width: 400,
    height: 400,
  },
];

export default function Basico() {
  return <Gallery label="Fotos da obra (imagens fictícias)" items={items} />;
}
