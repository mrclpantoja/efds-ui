import type { SVGProps } from 'react';
import { Glyph } from './Glyph';

type P = SVGProps<SVGSVGElement>;

/* Glifo privado do lote I (horário). Não exportado pelo pacote. */
export const ClockGlyph = (p: P) => (
  <Glyph d="M12 7v5l3 2M12 3a9 9 0 100 18 9 9 0 000-18z" {...p} />
);
