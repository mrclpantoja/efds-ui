import { forwardRef, type AnchorHTMLAttributes, type HTMLAttributes } from 'react';
import { cx } from '../../utils/cx';

export interface BreadcrumbProps extends HTMLAttributes<HTMLElement> {
  /** Nome do landmark. Padrão: "Trilha". */
  'aria-label'?: string;
}

/** Trilha de localização: `nav > ol`. Filhos: `<BreadcrumbItem>`. */
export const Breadcrumb = forwardRef<HTMLElement, BreadcrumbProps>(function Breadcrumb(
  { className, children, 'aria-label': ariaLabel = 'Trilha', ...rest },
  ref,
) {
  return (
    <nav {...rest} ref={ref} aria-label={ariaLabel} className={cx('eds-breadcrumb', className)}>
      <ol className="eds-breadcrumb-list">{children}</ol>
    </nav>
  );
});
Breadcrumb.displayName = 'Breadcrumb';

export interface BreadcrumbItemProps extends HTMLAttributes<HTMLLIElement> {
  /** Destino. Sem `href` (ou com `current`), o texto não é um link. */
  href?: string;
  /** Item atual: `<span aria-current="page">`, sem link. */
  current?: boolean;
  /** Atributos extras do `<a>` (ex.: `onClick` de roteador). */
  linkProps?: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>;
}

export const BreadcrumbItem = forwardRef<HTMLLIElement, BreadcrumbItemProps>(
  function BreadcrumbItem({ href, current = false, linkProps, className, children, ...rest }, ref) {
    let content = children;
    if (current) content = <span aria-current="page">{children}</span>;
    else if (href !== undefined)
      content = (
        <a {...linkProps} href={href}>
          {children}
        </a>
      );
    return (
      <li {...rest} ref={ref} className={cx('eds-breadcrumb-item', className)}>
        {content}
      </li>
    );
  },
);
BreadcrumbItem.displayName = 'BreadcrumbItem';
