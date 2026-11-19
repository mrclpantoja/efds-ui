import type { SVGProps } from 'react';
import { Glyph } from './Glyph';

type P = SVGProps<SVGSVGElement>;

/* Glifos privados do lote F (datas). Não exportados pelo pacote. */
export const CalendarGlyph = (p: P) => (
  <Glyph
    d="M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z"
    {...p}
  />
);
