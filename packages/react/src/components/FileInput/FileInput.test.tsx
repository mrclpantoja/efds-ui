import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Field } from '../Field';
import { FileInput } from './FileInput';

describe('FileInput', () => {
  it('renderiza input file com a classe do core, ref e className', () => {
    const ref = createRef<HTMLInputElement>();
    render(<FileInput ref={ref} aria-label="Anexo" className="extra" accept=".pdf" />);
    const input = screen.getByLabelText('Anexo');
    expect(ref.current).toBe(input);
    expect(input).toHaveAttribute('type', 'file');
    expect(input).toHaveClass('eds-file', 'extra');
    expect(input).not.toHaveClass('eds-file-md');
    expect(input).toHaveAttribute('accept', '.pdf');
  });

  it.each(['sm', 'lg'] as const)('size=%s aplica o modificador', (size) => {
    render(<FileInput aria-label="Anexo" size={size} />);
    expect(screen.getByLabelText('Anexo')).toHaveClass(`eds-file-${size}`);
  });

  it('invalid e disabled viram atributos', () => {
    render(<FileInput aria-label="Anexo" invalid disabled />);
    const input = screen.getByLabelText('Anexo');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toBeDisabled();
  });

  it('integra com Field: rótulo, ajuda, erro e required', () => {
    render(
      <Field label="Comprovante" helper="PDF até 5 MB" error="Obrigatório" required>
        <FileInput />
      </Field>,
    );
    const input = screen.getByLabelText('Comprovante');
    expect(input).toHaveClass('eds-file');
    expect(input).toBeRequired();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('PDF até 5 MB Obrigatório');
  });

  it('dispara onChange ao escolher arquivo', async () => {
    const onChange = vi.fn();
    render(<FileInput aria-label="Anexo" onChange={onChange} />);
    await userEvent
      .setup()
      .upload(
        screen.getByLabelText('Anexo'),
        new File(['x'], 'a.pdf', { type: 'application/pdf' }),
      );
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
