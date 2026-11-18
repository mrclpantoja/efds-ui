import { forwardRef, type SVGProps } from 'react';

/** SVG decorativo interno (não exportado). Cor = currentColor; tamanho = 1em (o core dimensiona em botões). */
export const Glyph = forwardRef<SVGSVGElement, { d: string } & SVGProps<SVGSVGElement>>(
  function Glyph({ d, ...rest }, ref) {
    return (
      <svg
        ref={ref}
        viewBox="0 0 24 24"
        width="1em"
        height="1em"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
        {...rest}
      >
        <path d={d} />
      </svg>
    );
  },
);
