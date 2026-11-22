import type { SVGProps } from 'react';
import { Glyph } from './Glyph';

type P = SVGProps<SVGSVGElement>;

/* Glifos privados do conjunto de imagem. Não exportados pelo pacote. */
export const ImageGlyph = (p: P) => (
  <Glyph
    d="M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM3 16l5-5 4 4 3-3 6 6M9 9h.01"
    {...p}
  />
);
export const ZoomInGlyph = (p: P) => <Glyph d="M12 5v14M5 12h14" {...p} />;
export const ZoomOutGlyph = (p: P) => <Glyph d="M5 12h14" {...p} />;
export const RotateGlyph = (p: P) => <Glyph d="M21 12a9 9 0 1 1-2.6-6.4L21 8M21 3v5h-5" {...p} />;
export const ResetGlyph = (p: P) => <Glyph d="M3 12a9 9 0 1 0 2.6-6.4L3 8M3 3v5h5" {...p} />;
