/** Elementos permitidos em `as` nos componentes de layout (landmarks e contêineres de lista). */
export type LayoutElement =
  | 'div'
  | 'section'
  | 'article'
  | 'aside'
  | 'header'
  | 'footer'
  | 'main'
  | 'nav'
  | 'ul'
  | 'ol'
  | 'li'
  | 'span';

/** Espaçamento = escala de espaço do core (`.eds-gap-N`, acompanha a densidade). */
export type Gap = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/** Colunas de um grid de 12. */
export type Span = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
