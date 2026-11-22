const SVG_NS = 'http://www.w3.org/2000/svg';

/** Ícone decorativo (24x24, traço) com os traçados `paths`. */
export function svgIcon(paths: readonly string[], className?: string): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '1em');
  svg.setAttribute('height', '1em');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  if (className) svg.setAttribute('class', className);
  for (const d of paths) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    svg.append(path);
  }
  return svg;
}

export const ICON_IMAGE = [
  'M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  'M3 16l5-5 4 4 3-3 6 6',
  'M9 9h.01',
];
export const ICON_PREV = ['M15 6l-6 6 6 6'];
export const ICON_NEXT = ['M9 6l6 6-6 6'];
export const ICON_ZOOM_IN = ['M12 5v14', 'M5 12h14'];
export const ICON_ZOOM_OUT = ['M5 12h14'];
export const ICON_ROTATE = ['M21 12a9 9 0 1 1-2.6-6.4L21 8', 'M21 3v5h-5'];
export const ICON_RESET = ['M3 12a9 9 0 1 0 2.6-6.4L3 8', 'M3 3v5h5'];
export const ICON_UP = ['M6 15l6-6 6 6'];
export const ICON_DOWN = ['M6 9l6 6 6-6'];
