import {
  forwardRef,
  useId,
  type ForwardRefExoticComponent,
  type RefAttributes,
  type SVGProps,
} from 'react';

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'children' | 'title'> {
  /**
   * Torna o ícone acessível (`role="img"` + nome). Sem `title`, o ícone é decorativo
   * (`aria-hidden`) e deve acompanhar um texto ou um `aria-label` no controle.
   */
  title?: string;
}

export type IconComponent = ForwardRefExoticComponent<IconProps & RefAttributes<SVGSVGElement>>;

/**
 * Fábrica dos ícones: viewBox 24, traço de 2 em `currentColor`, tamanho `1em`
 * (nos botões do core, o CSS dimensiona o svg). Sem estilo próprio.
 */
export function createIcon(name: string, d: string): IconComponent {
  const Icon = forwardRef<SVGSVGElement, IconProps>(function Icon({ title, ...rest }, ref) {
    const titleId = useId();
    return (
      <svg
        viewBox="0 0 24 24"
        width="1em"
        height="1em"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        focusable="false"
        {...(title
          ? { role: 'img', 'aria-labelledby': titleId }
          : { 'aria-hidden': true as const })}
        {...rest}
        ref={ref}
      >
        {title ? <title id={titleId}>{title}</title> : null}
        <path d={d} />
      </svg>
    );
  });
  Icon.displayName = name;
  return Icon;
}
