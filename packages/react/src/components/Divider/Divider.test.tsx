import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Divider } from '.';

describe('Divider', () => {
  it('horizontal é um <hr>', () => {
    render(<Divider />);
    const hr = screen.getByRole('separator');
    expect(hr.tagName).toBe('HR');
    expect(hr).toHaveClass('eds-divider');
  });

  it('vertical: span com role e orientação', () => {
    render(<Divider orientation="vertical" strong />);
    const el = screen.getByRole('separator');
    expect(el.tagName).toBe('SPAN');
    expect(el).toHaveClass('eds-divider', 'eds-divider-vertical', 'eds-divider-strong');
    expect(el).toHaveAttribute('aria-orientation', 'vertical');
  });

  it('com rótulo: o texto é lido no fluxo, sem role', () => {
    const { container } = render(<Divider label="ou" />);
    expect(screen.queryByRole('separator')).toBeNull();
    expect(container.querySelector('.eds-divider > .eds-divider-label')).toHaveTextContent('ou');
  });

  it('decorativo some da árvore', () => {
    const { container } = render(<Divider decorative />);
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });
});
