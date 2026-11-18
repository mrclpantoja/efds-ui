import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Input } from './Input';

describe('Input', () => {
  it('renderiza com a classe do core e sem classe do tamanho padrão', () => {
    render(<Input aria-label="Nome" />);
    const input = screen.getByRole('textbox', { name: 'Nome' });
    expect(input).toHaveClass('eds-input');
    expect(input).not.toHaveClass('eds-input-md');
  });

  it.each(['sm', 'lg'] as const)('aplica o tamanho %s', (size) => {
    render(<Input aria-label="Nome" size={size} />);
    expect(screen.getByRole('textbox')).toHaveClass(`eds-input-${size}`);
  });

  it('invalid e valid viram atributos de estado', () => {
    const { rerender } = render(<Input aria-label="A" invalid />);
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    rerender(<Input aria-label="A" valid />);
    expect(screen.getByRole('textbox')).toHaveAttribute('data-valid', 'true');
    expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-invalid');
  });

  it('mescla className, repassa ref e props nativas', async () => {
    const ref = createRef<HTMLInputElement>();
    render(<Input ref={ref} className="extra" aria-label="Nome" name="nome" required />);
    const input = screen.getByRole('textbox');
    expect(ref.current).toBe(input);
    expect(input).toHaveClass('eds-input', 'extra');
    expect(input).toHaveAttribute('name', 'nome');
    expect(input).toBeRequired();
    await userEvent.type(input, 'Maria');
    expect(input).toHaveValue('Maria');
  });

  it('desabilitado e somente leitura usam atributos nativos', () => {
    render(
      <>
        <Input aria-label="D" disabled />
        <Input aria-label="R" readOnly />
      </>,
    );
    expect(screen.getByLabelText('D')).toBeDisabled();
    expect(screen.getByLabelText('R')).toHaveAttribute('readonly');
  });
});
