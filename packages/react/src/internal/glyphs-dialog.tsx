import type { SVGProps } from 'react';
import { Glyph } from './Glyph';

type P = SVGProps<SVGSVGElement>;

/* Glifos privados dos diálogos rápidos (DialogProvider). Não exportados pelo pacote. */
export const ExclamationGlyph = (p: P) => <Glyph d="M12 6v7.5M12 17.5v.01" {...p} />;
export const InfoGlyph = (p: P) => <Glyph d="M12 11v6M12 7.5v.01" {...p} />;
export const QuestionGlyph = (p: P) => (
  <Glyph d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1.9-1.1 1.8M12 17.5v.01" {...p} />
);
