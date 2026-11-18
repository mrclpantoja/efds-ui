import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as icons from './index';

const all = Object.entries(icons).filter(([name]) => name.endsWith('Icon'));

describe('@eds-ui/icons', () => {
  it('exporta o conjunto mínimo', () => {
    expect(all.length).toBe(24);
  });

  it('por padrão é decorativo, 1em e currentColor', () => {
    const { container } = render(<icons.SearchIcon data-testid="i" />);
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).not.toHaveAttribute('role');
    expect(svg).toHaveAttribute('width', '1em');
    expect(svg).toHaveAttribute('stroke', 'currentColor');
    expect(svg).not.toHaveAttribute('style');
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('com title vira imagem acessível', () => {
    render(<icons.BellIcon title="Notificações" />);
    const img = screen.getByRole('img', { name: 'Notificações' });
    expect(img).not.toHaveAttribute('aria-hidden');
  });

  it('repassa ref e props nativas', () => {
    const ref = createRef<SVGSVGElement>();
    render(<icons.CloseIcon ref={ref} className="x" data-testid="i" />);
    expect(ref.current).toBe(screen.getByTestId('i'));
    expect(ref.current).toHaveClass('x');
  });

  it.each(all)('%s renderiza um path e tem displayName', (name, Icon) => {
    const { container } = render(<Icon />);
    expect(container.querySelectorAll('path')).toHaveLength(1);
    expect((Icon as { displayName?: string }).displayName).toBe(name);
  });
});
