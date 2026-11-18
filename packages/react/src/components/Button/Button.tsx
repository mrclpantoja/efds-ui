import {
  createElement,
  forwardRef,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type Ref,
  type RefAttributes,
} from 'react';
import { cx } from '../../utils/cx';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonOwnProps {
  /** Hierarquia da ação. Padrão: `secondary`. */
  variant?: ButtonVariant;
  /** Padrão: `md`. */
  size?: ButtonSize;
  /**
   * Operação em andamento: `aria-busy`, spinner do core e clique/Enter/Espaço ignorados.
   * O botão continua focável (não recebe `disabled`).
   */
  loading?: boolean;
}

/** Botão só de ícone: o nome acessível é obrigatório. */
type IconOnlyProps =
  { iconOnly: true; 'aria-label': string } | { iconOnly?: false; 'aria-label'?: string };

export type ButtonAsButtonProps = ButtonOwnProps &
  IconOnlyProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> & { href?: undefined };

export type ButtonAsLinkProps = ButtonOwnProps &
  IconOnlyProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'aria-label' | 'href'> & {
    /** Com `href`, renderiza `<a>` com a aparência de botão. */
    href: string;
    /** Link desabilitado: `aria-disabled`, `tabIndex=-1` e navegação cancelada. */
    disabled?: boolean;
  };

export type ButtonProps = ButtonAsButtonProps | ButtonAsLinkProps;

interface ButtonComponent {
  (props: ButtonAsButtonProps & RefAttributes<HTMLButtonElement>): ReactElement | null;
  (props: ButtonAsLinkProps & RefAttributes<HTMLAnchorElement>): ReactElement | null;
  displayName?: string;
}

type ImplProps = ButtonOwnProps &
  HTMLAttributes<HTMLElement> & {
    iconOnly?: boolean;
    disabled?: boolean;
    href?: string;
    type?: 'button' | 'submit' | 'reset';
  };

export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ImplProps>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    loading = false,
    iconOnly = false,
    disabled = false,
    href,
    type,
    className,
    onClick,
    onKeyDown,
    ...rest
  },
  ref,
) {
  const isLink = href !== undefined;
  // Link não tem `disabled` nativo; botão desabilitado já é inerte pelo navegador.
  const blocked = loading || (isLink && disabled);

  const handleClick = (event: MouseEvent<HTMLElement>) => {
    if (blocked) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (blocked && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      return;
    }
    onKeyDown?.(event);
  };

  return createElement(isLink ? 'a' : 'button', {
    ...rest,
    ref: ref as Ref<HTMLElement>,
    className: cx(
      'eds-button',
      `eds-button-${variant}`,
      size !== 'md' && `eds-button-${size}`,
      iconOnly && 'eds-button-icon',
      className,
    ),
    ...(isLink
      ? { href, 'aria-disabled': disabled || undefined, tabIndex: disabled ? -1 : rest.tabIndex }
      : { type: type ?? 'button', disabled }),
    'aria-busy': loading || undefined,
    onClick: handleClick,
    onKeyDown: handleKeyDown,
  });
}) as ButtonComponent;
Button.displayName = 'Button';
