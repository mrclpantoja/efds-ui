import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement>;

/* Glifos privados do lote G (Sortable e Tree), preenchidos (o core usa fill: currentColor). */
const base = {
  viewBox: '0 0 16 16',
  width: '1em',
  height: '1em',
  'aria-hidden': true,
  focusable: 'false',
} as const;

/** Pegador de arrasto: seis pontos. */
export const GripGlyph = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="5.5" cy="3.5" r="1.25" />
    <circle cx="10.5" cy="3.5" r="1.25" />
    <circle cx="5.5" cy="8" r="1.25" />
    <circle cx="10.5" cy="8" r="1.25" />
    <circle cx="5.5" cy="12.5" r="1.25" />
    <circle cx="10.5" cy="12.5" r="1.25" />
  </svg>
);

/** "⋯": três pontos na horizontal. */
export const MoreHorizontalGlyph = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="3" cy="8" r="1.25" />
    <circle cx="8" cy="8" r="1.25" />
    <circle cx="13" cy="8" r="1.25" />
  </svg>
);
