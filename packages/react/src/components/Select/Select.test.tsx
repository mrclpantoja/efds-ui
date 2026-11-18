import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Select } from './Select';

describe('Select', () => {
  it('renderiza <select> nativo com opções, ref e className', async () => {
    const ref = createRef<HTMLSelectElement>();
    render(
      <Select ref={ref} className="extra" aria-label="Depto" defaultValue="">
        <option value="" disabled>
          Selecione
        </option>
        <option>Compras</option>
        <option>Financeiro</option>
      </Select>,
    );
    const select = screen.getByRole('combobox', { name: 'Depto' });
    expect(ref.current).toBe(select);
    expect(select).toHaveClass('eds-select', 'extra');
    await userEvent.selectOptions(select, 'Financeiro');
    expect(select).toHaveValue('Financeiro');
  });

  it.each(['sm', 'lg'] as const)('aplica o tamanho %s', (size) => {
    render(
      <Select aria-label="S" size={size}>
        <option>A</option>
      </Select>,
    );
    expect(screen.getByRole('combobox')).toHaveClass(`eds-select-${size}`);
  });

  it('invalid, valid e required', () => {
    const { rerender } = render(
      <Select aria-label="S" invalid required>
        <option>A</option>
      </Select>,
    );
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('combobox')).toBeRequired();
    rerender(
      <Select aria-label="S" valid>
        <option>A</option>
      </Select>,
    );
    expect(screen.getByRole('combobox')).toHaveAttribute('data-valid', 'true');
  });
});
