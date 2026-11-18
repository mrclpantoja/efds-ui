import { forwardRef, type AnchorHTMLAttributes, type HTMLAttributes } from 'react';
import { cx } from '../../utils/cx';

export type NavbarProps = HTMLAttributes<HTMLElement>;

/** Barra superior (`<header class="eds-navbar">`). */
export const Navbar = forwardRef<HTMLElement, NavbarProps>(function Navbar(
  { className, ...rest },
  ref,
) {
  return <header {...rest} ref={ref} className={cx('eds-navbar', className)} />;
});
Navbar.displayName = 'Navbar';

export type NavbarBrandProps = AnchorHTMLAttributes<HTMLAnchorElement>;

/** Marca: link com ícone e nome. */
export const NavbarBrand = forwardRef<HTMLAnchorElement, NavbarBrandProps>(function NavbarBrand(
  { className, children, ...rest },
  ref,
) {
  return (
    <a {...rest} ref={ref} className={cx('eds-navbar-brand', className)}>
      {children}
    </a>
  );
});
NavbarBrand.displayName = 'NavbarBrand';

/** A navegação precisa de nome: há mais de um landmark `nav` na página. */
export type NavbarNavProps = HTMLAttributes<HTMLElement> &
  ({ 'aria-label': string } | { 'aria-labelledby': string });

export const NavbarNav = forwardRef<HTMLElement, NavbarNavProps>(function NavbarNav(
  { className, ...rest },
  ref,
) {
  return <nav {...rest} ref={ref} className={cx('eds-navbar-nav', className)} />;
});
NavbarNav.displayName = 'NavbarNav';

export interface NavbarLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  /** Página atual: `aria-current="page"`. */
  current?: boolean;
}

export const NavbarLink = forwardRef<HTMLAnchorElement, NavbarLinkProps>(function NavbarLink(
  { current = false, className, children, ...rest },
  ref,
) {
  return (
    <a
      aria-current={current ? 'page' : undefined}
      {...rest}
      ref={ref}
      className={cx('eds-navbar-link', className)}
    >
      {children}
    </a>
  );
});
NavbarLink.displayName = 'NavbarLink';

export type NavbarActionsProps = HTMLAttributes<HTMLDivElement>;

export const NavbarActions = forwardRef<HTMLDivElement, NavbarActionsProps>(function NavbarActions(
  { className, ...rest },
  ref,
) {
  return <div {...rest} ref={ref} className={cx('eds-navbar-actions', className)} />;
});
NavbarActions.displayName = 'NavbarActions';
