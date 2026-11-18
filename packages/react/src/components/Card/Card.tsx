import { createElement, forwardRef, type AnchorHTMLAttributes, type HTMLAttributes } from 'react';
import { cx } from '../../utils/cx';

export type CardVariant = 'default' | 'outlined' | 'elevated';

export interface CardProps extends HTMLAttributes<HTMLElement> {
  /** Padrão: `default` (borda 1px, sem sombra). */
  variant?: CardVariant;
  /** Card inteiro clicável (hover/foco do core). Exige um `<CardLink>` dentro. */
  interactive?: boolean;
  /** Alinha header, corpo e rodapé entre cards vizinhos de um `<Grid>` (subgrid). */
  subgrid?: boolean;
}

/** Superfície de conteúdo (`<article class="eds-card">`). */
export const Card = forwardRef<HTMLElement, CardProps>(function Card(
  { variant = 'default', interactive = false, subgrid = false, className, ...rest },
  ref,
) {
  return (
    <article
      {...rest}
      ref={ref}
      className={cx(
        'eds-card',
        variant !== 'default' && `eds-card-${variant}`,
        interactive && 'eds-card-interactive',
        subgrid && 'eds-card-subgrid',
        className,
      )}
    />
  );
});
Card.displayName = 'Card';

export type CardHeaderProps = HTMLAttributes<HTMLElement>;

export const CardHeader = forwardRef<HTMLElement, CardHeaderProps>(function CardHeader(
  { className, ...rest },
  ref,
) {
  return <header {...rest} ref={ref} className={cx('eds-card-header', className)} />;
});
CardHeader.displayName = 'CardHeader';

export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  /** Nível do título (a hierarquia da página decide). Padrão: 3. */
  level?: 2 | 3 | 4 | 5 | 6;
}

export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(function CardTitle(
  { level = 3, className, ...rest },
  ref,
) {
  return createElement(`h${level}`, {
    ...rest,
    ref,
    className: cx('eds-card-title', className),
  });
});
CardTitle.displayName = 'CardTitle';

export type CardLinkProps = AnchorHTMLAttributes<HTMLAnchorElement>;

/**
 * Link esticado: o `::after` cobre o card. Coloque dentro do `<CardTitle>`, com
 * `<Card interactive>`. Botões e links extras do card continuam clicáveis.
 */
export const CardLink = forwardRef<HTMLAnchorElement, CardLinkProps>(function CardLink(
  { className, children, ...rest },
  ref,
) {
  return (
    <a {...rest} ref={ref} className={cx('eds-card-link', className)}>
      {children}
    </a>
  );
});
CardLink.displayName = 'CardLink';

export type CardActionsProps = HTMLAttributes<HTMLDivElement>;

/** Ações do cabeçalho (ex.: botão de dispensar). */
export const CardActions = forwardRef<HTMLDivElement, CardActionsProps>(function CardActions(
  { className, ...rest },
  ref,
) {
  return <div {...rest} ref={ref} className={cx('eds-card-actions', className)} />;
});
CardActions.displayName = 'CardActions';

export type CardBodyProps = HTMLAttributes<HTMLDivElement>;

export const CardBody = forwardRef<HTMLDivElement, CardBodyProps>(function CardBody(
  { className, ...rest },
  ref,
) {
  return <div {...rest} ref={ref} className={cx('eds-card-body', className)} />;
});
CardBody.displayName = 'CardBody';

export type CardFooterProps = HTMLAttributes<HTMLElement>;

export const CardFooter = forwardRef<HTMLElement, CardFooterProps>(function CardFooter(
  { className, ...rest },
  ref,
) {
  return <footer {...rest} ref={ref} className={cx('eds-card-footer', className)} />;
});
CardFooter.displayName = 'CardFooter';
