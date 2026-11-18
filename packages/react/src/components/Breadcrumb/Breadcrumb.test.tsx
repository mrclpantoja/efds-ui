import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Breadcrumb, BreadcrumbItem } from './Breadcrumb';

describe('Breadcrumb', () => {
  it('é nav > ol com itens; o atual não é link e leva aria-current', () => {
    const ref = createRef<HTMLElement>();
    render(
      <Breadcrumb ref={ref} className="extra">
        <BreadcrumbItem href="/">Início</BreadcrumbItem>
        <BreadcrumbItem href="/usuarios">Usuários</BreadcrumbItem>
        <BreadcrumbItem current>Ana Souza</BreadcrumbItem>
      </Breadcrumb>,
    );
    const nav = screen.getByRole('navigation', { name: 'Trilha' });
    expect(nav).toHaveClass('eds-breadcrumb', 'extra');
    expect(ref.current).toBe(nav);
    expect(screen.getByRole('list')).toHaveClass('eds-breadcrumb-list');
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getAllByRole('listitem')[0]).toHaveClass('eds-breadcrumb-item');
    expect(screen.getAllByRole('link')).toHaveLength(2);
    const current = screen.getByText('Ana Souza');
    expect(current).toHaveAttribute('aria-current', 'page');
    expect(current.closest('a')).toBeNull();
  });

  it('aria-label substituível e linkProps repassados ao link', () => {
    render(
      <Breadcrumb aria-label="Breadcrumb">
        <BreadcrumbItem href="/" linkProps={{ 'aria-label': 'Home' }}>
          Início
        </BreadcrumbItem>
      </Breadcrumb>,
    );
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
  });
});
