import type { SVGProps } from 'react';
import { Glyph } from './Glyph';

type P = SVGProps<SVGSVGElement>;

/* Glifos privados dos componentes (fechar, chevrons, ordenação, check). Os ícones públicos
   ficam em @eds-ui/icons; este pacote não depende dele. */
export const CloseGlyph = (p: P) => <Glyph d="M18 6L6 18M6 6l12 12" {...p} />;
export const CheckGlyph = (p: P) => <Glyph d="M5 12.5l4.5 4.5L19 7.5" {...p} />;
export const ChevronDownGlyph = (p: P) => <Glyph d="M6 9l6 6 6-6" {...p} />;
export const ChevronUpGlyph = (p: P) => <Glyph d="M6 15l6-6 6 6" {...p} />;
export const ChevronLeftGlyph = (p: P) => <Glyph d="M15 6l-6 6 6 6" {...p} />;
export const ChevronRightGlyph = (p: P) => <Glyph d="M9 6l6 6-6 6" {...p} />;
export const ArrowUpGlyph = (p: P) => <Glyph d="M12 19V5m0 0l-6 6m6-6l6 6" {...p} />;
export const ArrowDownGlyph = (p: P) => <Glyph d="M12 5v14m0 0l-6-6m6 6l6-6" {...p} />;
