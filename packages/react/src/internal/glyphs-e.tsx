import type { SVGProps } from 'react';
import { Glyph } from './Glyph';

type P = SVGProps<SVGSVGElement>;

/* Glifos privados do lote E (upload de arquivos). Não exportados pelo pacote. */
export const UploadGlyph = (p: P) => (
  <Glyph d="M12 16V4m0 0L7 9m5-5l5 5M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" {...p} />
);
export const FileGlyph = (p: P) => (
  <Glyph d="M14 3H7a1 1 0 00-1 1v16a1 1 0 001 1h10a1 1 0 001-1V7l-4-4zm0 0v4h4" {...p} />
);
export const AlertGlyph = (p: P) => (
  <Glyph d="M12 3a9 9 0 100 18 9 9 0 000-18zm0 5v5m0 3.5v.01" {...p} />
);
