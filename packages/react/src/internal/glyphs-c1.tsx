import type { SVGProps } from 'react';
import { Glyph } from './Glyph';

type P = SVGProps<SVGSVGElement>;

/* Glifos privados da onda C, parte "campos" (senha, número, lookup). Não exportados pelo pacote. */
export const EyeGlyph = (p: P) => (
  <Glyph
    d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM15 12a3 3 0 11-6 0 3 3 0 016 0z"
    {...p}
  />
);
export const EyeOffGlyph = (p: P) => (
  <Glyph
    d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM15 12a3 3 0 11-6 0 3 3 0 016 0zM3 3l18 18"
    {...p}
  />
);
export const MinusGlyph = (p: P) => <Glyph d="M5 12h14" {...p} />;
export const PlusGlyph = (p: P) => <Glyph d="M12 5v14M5 12h14" {...p} />;
export const SearchGlyph = (p: P) => (
  <Glyph d="M11 4a7 7 0 100 14 7 7 0 000-14zm9 16l-4-4" {...p} />
);
