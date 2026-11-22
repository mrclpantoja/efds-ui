import { Gallery } from '@efds-ui/react';

export default function Proporcao() {
  return (
    <Gallery
      label="Vistas do projeto (imagens fictícias)"
      ratio="4x3"
      items={[
        {
          src: '/img/obra-3.svg',
          thumb: '/img/obra-3.svg',
          alt: 'Paisagem verde, fachada',
          caption: 'Fachada',
          width: 400,
          height: 300,
        },
        {
          src: '/img/obra-4.svg',
          thumb: '/img/obra-4.svg',
          alt: 'Paisagem roxa, pátio interno',
          caption: 'Pátio interno',
          width: 400,
          height: 300,
        },
        {
          src: '/img/obra-1.svg',
          thumb: '/img/obra-1.svg',
          alt: 'Paisagem azul, entrada',
          caption: 'Entrada',
          width: 400,
          height: 300,
        },
      ]}
    />
  );
}
