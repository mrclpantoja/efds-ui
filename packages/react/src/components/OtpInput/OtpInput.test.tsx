import { createRef, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { OtpInput } from './OtpInput';

const cells = () => screen.getAllByRole('textbox') as HTMLInputElement[];
const hidden = () => document.querySelector<HTMLInputElement>('input[type="hidden"]')!;

describe('OtpInput', () => {
  it('renderiza fieldset, legend, células com nome e autocomplete só na primeira', () => {
    const ref = createRef<HTMLFieldSetElement>();
    render(<OtpInput ref={ref} legend="Código de verificação" name="codigo" className="extra" />);
    expect(ref.current).toHaveClass('eds-otp', 'extra');
    expect(screen.getByRole('group', { name: 'Código de verificação' })).toBe(ref.current);
    expect(cells()).toHaveLength(6);
    expect(cells()[0]).toHaveAccessibleName('Dígito 1 de 6');
    expect(cells()[0]).toHaveAttribute('autocomplete', 'one-time-code');
    expect(cells()[1]).toHaveAttribute('autocomplete', 'off');
    expect(cells()[1]).toHaveAttribute('maxlength', '1');
    expect(cells()[0]).not.toHaveAttribute('maxlength');
    expect(hidden()).toHaveAttribute('name', 'codigo');
  });

  it('digitar avança e preenche o hidden', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<OtpInput legend="Código" name="codigo" onValueChange={onValueChange} />);
    await user.click(cells()[0]!);
    await user.keyboard('123');
    expect(hidden().value).toBe('123');
    expect(cells()[3]).toHaveFocus();
    expect(onValueChange).toHaveBeenLastCalledWith('123');
  });

  it('só dígitos; Backspace volta e apaga; setas movem', async () => {
    const user = userEvent.setup();
    render(<OtpInput legend="Código" name="c" />);
    await user.click(cells()[0]!);
    await user.keyboard('a12');
    expect(hidden().value).toBe('12');
    await user.keyboard('{Backspace}');
    expect(cells()[1]).toHaveFocus();
    expect(hidden().value).toBe('1');
    await user.keyboard('{ArrowLeft}');
    expect(cells()[0]).toHaveFocus();
    await user.keyboard('{End}');
    expect(cells()[5]).toHaveFocus();
  });

  it('colar o código inteiro distribui e chama onComplete', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<OtpInput legend="Código" name="c" onComplete={onComplete} />);
    await user.click(cells()[2]!);
    await user.paste('482 913');
    expect(cells().map((c) => c.value)).toEqual(['4', '8', '2', '9', '1', '3']);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith('482913');
    expect(cells()[5]).toHaveFocus();
  });

  it('o preenchimento do SMS na primeira célula distribui', async () => {
    const user = userEvent.setup();
    render(<OtpInput legend="Código" name="c" length={4} />);
    await user.click(cells()[0]!);
    await user.paste('1234');
    expect(hidden().value).toBe('1234');
  });

  it('controlado: acompanha o value; invalid marca todas as células', () => {
    function Wrapper() {
      const [v, setV] = useState('12');
      return (
        <>
          <OtpInput
            legend="Código"
            length={4}
            value={v}
            onValueChange={setV}
            invalid
            describedBy="msg"
          />
          <button type="button" onClick={() => setV('')}>
            limpar
          </button>
          <p id="msg">Código inválido.</p>
        </>
      );
    }
    render(<Wrapper />);
    expect(cells().map((c) => c.value)).toEqual(['1', '2', '', '']);
    for (const c of cells()) {
      expect(c).toHaveAttribute('aria-invalid', 'true');
      expect(c).toHaveAccessibleDescription('Código inválido.');
    }
  });

  it('alfanumérico aceita letras em maiúscula e troca o nome das células', async () => {
    const user = userEvent.setup();
    render(<OtpInput legend="Código" name="c" length={4} kind="alphanumeric" />);
    expect(cells()[0]).toHaveAccessibleName('Caractere 1 de 4');
    await user.click(cells()[0]!);
    await user.keyboard('a7');
    expect(hidden().value).toBe('A7');
  });

  it('textos trocáveis', () => {
    render(<OtpInput legend="Code" length={3} texts={{ cell: (n, t) => `Digit ${n} of ${t}` }} />);
    expect(cells()[0]).toHaveAccessibleName('Digit 1 of 3');
  });
});
