/** Glifos internos da barra (traço de 24x24, cor herdada). Nenhuma biblioteca de ícones. */
const PATHS = {
  undo: 'M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3',
  redo: 'M15 14l5-5-5-5M20 9H10a6 6 0 000 12h3',
  bold: 'M7 5h6a3.5 3.5 0 010 7H7zM7 12h7a3.5 3.5 0 010 7H7z',
  italic: 'M19 4h-9M14 20H5M15 4L9 20',
  underline: 'M7 4v7a5 5 0 0010 0V4M5 20h14',
  strike:
    'M5 12h14M16 6.5C15 5 13.5 4.5 12 4.5c-2.5 0-4 1.2-4 3 0 1.5 1 2.5 4 3.5M8 17.5c1 1.5 2.5 2 4 2 2.5 0 4-1.2 4-3',
  alignLeft: 'M4 6h16M4 10h10M4 14h16M4 18h10',
  alignCenter: 'M4 6h16M7 10h10M4 14h16M7 18h10',
  alignRight: 'M4 6h16M10 10h10M4 14h16M10 18h10',
  alignJustify: 'M4 6h16M4 10h16M4 14h16M4 18h16',
  bulletList: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
  orderedList: 'M10 6h10M10 12h10M10 18h10M4 5l1-1v4M4 14h2l-2 3h2',
  link: 'M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1',
  clearFormat: 'M4 7V4h12v3M10 4v10M7 14h6M15 15l5 5M20 15l-5 5',
  table: 'M4 5h16v14H4zM4 10h16M10 5v14',
} as const;

export type IconName = keyof typeof PATHS;

export function createIcon(name: IconName): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', PATHS[name]);
  svg.append(path);
  return svg;
}
