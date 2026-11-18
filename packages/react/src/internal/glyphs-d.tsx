import type { SVGProps } from 'react';
import { Glyph } from './Glyph';

type P = SVGProps<SVGSVGElement>;

/* Glifos privados do lote D (shell, sidebar, ordenação). Não exportados pelo pacote. */
export const MenuGlyph = (p: P) => <Glyph d="M4 6h16M4 12h16M4 18h16" {...p} />;
export const SidebarCollapseGlyph = (p: P) => (
  <Glyph
    d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM9 3v18M16 10l-2 2 2 2"
    {...p}
  />
);

/** Dois chevrons do core (`.eds-table-sort-icon`); o CSS esconde o oposto conforme `aria-sort`. */
export const SortGlyph = (p: P) => (
  <svg
    className="eds-table-sort-icon"
    viewBox="0 0 16 16"
    aria-hidden="true"
    focusable="false"
    {...p}
  >
    <path className="eds-table-sort-up" d="M4.5 6.5 8 3l3.5 3.5" />
    <path className="eds-table-sort-down" d="M4.5 9.5 8 13l3.5-3.5" />
  </svg>
);
