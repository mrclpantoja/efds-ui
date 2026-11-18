import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Radio } from './Radio';

describe('Radio', () => {
  it('renderiza radio nativo dentro de label.eds-check', () => {
    const ref = createRef<HTMLInputElement>();
    render(
      <Radio ref={ref} value="a" name="g" className="extra" defaultChecked>
        Padrão
      </Radio>,
    );
    const radio = screen.getByRole('radio', { name: 'Padrão' });
    expect(ref.current).toBe(radio);
    expect(radio).toHaveClass('eds-radio', 'extra');
    expect(radio).toHaveAttribute('value', 'a');
    expect(radio).toBeChecked();
    expect(radio.closest('label')).toHaveClass('eds-check');
  });

  it('disabled e invalid', () => {
    render(
      <>
        <Radio value="a" disabled>
          A
        </Radio>
        <Radio value="b" invalid>
          B
        </Radio>
      </>,
    );
    expect(screen.getByRole('radio', { name: 'A' })).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'B' })).toHaveAttribute('aria-invalid', 'true');
  });
});
