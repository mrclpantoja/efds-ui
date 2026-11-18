import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Navbar, NavbarActions, NavbarBrand, NavbarLink, NavbarNav } from './Navbar';

describe('Navbar', () => {
  it('monta header, marca, navegação, links e ações com as classes do core', () => {
    const ref = createRef<HTMLElement>();
    render(
      <Navbar ref={ref} className="extra">
        <NavbarBrand href="/">Empresa Exemplo</NavbarBrand>
        <NavbarNav aria-label="Seções">
          <NavbarLink href="/a" current>
            Visão geral
          </NavbarLink>
          <NavbarLink href="/b">Produtos</NavbarLink>
        </NavbarNav>
        <NavbarActions>
          <button type="button">Entrar</button>
        </NavbarActions>
      </Navbar>,
    );
    const header = screen.getByRole('banner');
    expect(header).toHaveClass('eds-navbar', 'extra');
    expect(ref.current).toBe(header);
    expect(screen.getByRole('link', { name: 'Empresa Exemplo' })).toHaveClass('eds-navbar-brand');
    expect(screen.getByRole('navigation', { name: 'Seções' })).toHaveClass('eds-navbar-nav');
    const current = screen.getByRole('link', { name: 'Visão geral' });
    expect(current).toHaveClass('eds-navbar-link');
    expect(current).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Produtos' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('button', { name: 'Entrar' }).parentElement).toHaveClass(
      'eds-navbar-actions',
    );
  });
});
