import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Textarea } from './Textarea';

describe('Textarea', () => {
  it('renderiza com a classe do core, ref e props nativas', () => {
    const ref = createRef<HTMLTextAreaElement>();
    render(<Textarea ref={ref} className="extra" aria-label="Obs" rows={4} required />);
    const el = screen.getByRole('textbox', { name: 'Obs' });
    expect(ref.current).toBe(el);
    expect(el).toHaveClass('eds-textarea', 'extra');
    expect(el).toHaveAttribute('rows', '4');
    expect(el).toBeRequired();
  });

  it('invalid e valid viram atributos de estado', () => {
    const { rerender } = render(<Textarea aria-label="T" invalid />);
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    rerender(<Textarea aria-label="T" valid />);
    expect(screen.getByRole('textbox')).toHaveAttribute('data-valid');
  });
});
