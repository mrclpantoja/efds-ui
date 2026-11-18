import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge } from './Badge';

describe('Badge', () => {
  it('neutral por padrão', () => {
    render(<Badge>Rascunho</Badge>);
    const el = screen.getByText('Rascunho');
    expect(el.tagName).toBe('SPAN');
    expect(el).toHaveClass('eds-badge', 'eds-badge-neutral');
    expect(el).not.toHaveClass('eds-badge-dot');
  });

  it.each(['neutral', 'info', 'success', 'warning', 'danger'] as const)('variante %s', (v) => {
    render(<Badge variant={v}>x</Badge>);
    expect(screen.getByText('x')).toHaveClass(`eds-badge-${v}`);
  });

  it('dot, className, ref e props nativas', () => {
    const ref = createRef<HTMLSpanElement>();
    render(
      <Badge ref={ref} dot variant="danger" className="extra" data-testid="b">
        Atrasado
      </Badge>,
    );
    const el = screen.getByTestId('b');
    expect(ref.current).toBe(el);
    expect(el).toHaveClass('eds-badge-dot', 'extra');
  });
});
