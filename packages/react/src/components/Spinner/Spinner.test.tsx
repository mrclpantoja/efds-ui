import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Spinner } from './Spinner';

describe('Spinner', () => {
  it('role=status com texto acessível padrão', () => {
    render(<Spinner />);
    const el = screen.getByRole('status');
    expect(el).toHaveClass('eds-spinner');
    expect(el).not.toHaveClass('eds-spinner-md');
    expect(screen.getByText('Carregando')).toHaveClass('eds-visually-hidden');
  });

  it('label substituível e tamanhos', () => {
    const { rerender } = render(<Spinner label="Loading" size="sm" />);
    expect(screen.getByRole('status')).toHaveClass('eds-spinner-sm');
    expect(screen.getByRole('status')).toHaveTextContent('Loading');
    rerender(<Spinner size="lg" />);
    expect(screen.getByRole('status')).toHaveClass('eds-spinner-lg');
  });

  it('decorative: aria-hidden, sem role e sem texto', () => {
    const { container } = render(<Spinner decorative />);
    const el = container.firstElementChild as HTMLElement;
    expect(el).toHaveAttribute('aria-hidden', 'true');
    expect(el).not.toHaveAttribute('role');
    expect(el).toBeEmptyDOMElement();
  });

  it('className e ref', () => {
    const ref = createRef<HTMLSpanElement>();
    render(<Spinner ref={ref} className="extra" />);
    expect(ref.current).toBe(screen.getByRole('status'));
    expect(ref.current).toHaveClass('eds-spinner', 'extra');
  });
});
