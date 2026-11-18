import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Container } from './Container';

describe('Container', () => {
  it('padrão: só eds-container; repassa ref, className e props', () => {
    const ref = createRef<HTMLElement>();
    render(
      <Container ref={ref} className="x" data-testid="c">
        a
      </Container>,
    );
    const el = screen.getByTestId('c');
    expect(ref.current).toBe(el);
    expect(el.tagName).toBe('DIV');
    expect(el.className).toBe('eds-container x');
  });

  it('size, flush e as', () => {
    render(
      <Container as="main" size="2xl" flush data-testid="c">
        a
      </Container>,
    );
    const el = screen.getByTestId('c');
    expect(el.tagName).toBe('MAIN');
    expect(el).toHaveClass('eds-container', 'eds-container-2xl', 'eds-container-flush');
  });

  it('fluid', () => {
    render(<Container size="fluid" data-testid="c" />);
    expect(screen.getByTestId('c')).toHaveClass('eds-container-fluid');
  });
});
